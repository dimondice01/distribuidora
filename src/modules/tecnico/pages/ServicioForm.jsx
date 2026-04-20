import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFirestore } from '../../../hooks/useFirestore';
import { useTenant } from '../../../contexts/TenantContext';
import { doc, getDoc, collection, Timestamp, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { toast } from 'react-toastify';

export default function ServicioForm({ clientId, onBack }) {
    const { tenantId, getTenantCollection, getTenantDoc } = useFirestore();
    const { user } = useTenant();
    
    // ---------------------------------------------------------
    // ESTADOS
    // ---------------------------------------------------------
    const [view, setView] = useState('loading'); // 'loading' | 'service' | 'payment' | 'success'
    const [client, setClient] = useState(null);
    const [assets, setAssets] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [selectedAssetIds, setSelectedAssetIds] = useState(new Set());
    const [assetDetails, setAssetDetails] = useState({});
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [opType, setOpType] = useState('Lugar');
    const [nroRecibo, setNroRecibo] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const inputRefs = useRef({}); 

    // ---------------------------------------------------------
    // CARGA DE DATOS
    // ---------------------------------------------------------
    useEffect(() => {
        // CARGA DE CLIENTE JERÁRQUICO
        getDoc(getTenantDoc('clientes', clientId)).then(d => d.exists() && setClient({ id: d.id, ...d.data() }));

        const loadData = async () => {
            try {
                const qA = query(getTenantCollection('assets'), where('clientId', '==', clientId));
                const qA2 = query(getTenantCollection('assets'), where('clienteId', '==', clientId));
                const qC = query(getTenantCollection('productos'), where('tipo', '==', 'servicio'));
                const [sA1, sA2, sC] = await Promise.all([getDocs(qA), getDocs(qA2), getDocs(qC)]);
                
                const assetMap = new Map();
                [...sA1.docs, ...sA2.docs].forEach(d => assetMap.set(d.id, { id: d.id, ...d.data() }));
                
                setAssets(Array.from(assetMap.values()));
                setCatalog(sC.docs.map(d => ({ id: d.id, ...d.data() })));
                setView('service');
            } catch (e) {
                console.error("Error loading service data:", e);
                toast.error("Error al cargar datos");
            }
        };
        loadData();
    }, [tenantId, clientId, getTenantCollection]);

    // ---------------------------------------------------------
    // LÓGICA DE NEGOCIO
    // ---------------------------------------------------------
    const groupedAssets = useMemo(() => {
        const groups = {};
        assets.forEach(asset => {
            const key = `${asset.tipo || 'Matafuego'} ${asset.agente || ''} ${asset.capacidad || ''}`.trim();
            if (!groups[key]) groups[key] = [];
            groups[key].push(asset);
        });
        return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    }, [assets]);

    const totals = useMemo(() => {
        let count = selectedAssetIds.size;
        let amount = Array.from(selectedAssetIds).reduce((acc, id) => acc + parseFloat(assetDetails[id]?.price || 0), 0);
        return { count, amount };
    }, [selectedAssetIds, assetDetails]);

    const isValid = useMemo(() => {
        if (selectedAssetIds.size === 0) return false;
        const items = Array.from(selectedAssetIds);
        return items.every(id => assetDetails[id]?.sticker?.trim() && assetDetails[id]?.serviceId);
    }, [selectedAssetIds, assetDetails]);

    const toggleAsset = (id) => {
        const newSet = new Set(selectedAssetIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
            if (!assetDetails[id]) {
                setAssetDetails(prev => ({ ...prev, [id]: { sticker: '', serviceId: '', price: 0 } }));
            }
        }
        setSelectedAssetIds(newSet);
    };

    const toggleGroup = (key) => {
        const newSet = new Set(expandedGroups);
        newSet.has(key) ? newSet.delete(key) : newSet.add(key);
        setExpandedGroups(newSet);
    };

    const selectGroup = (assetsInGroup, forceSelect) => {
        const newSet = new Set(selectedAssetIds);
        assetsInGroup.forEach(a => {
            if (forceSelect) {
                newSet.add(a.id);
                if (!assetDetails[a.id]) {
                    setAssetDetails(prev => ({ ...prev, [a.id]: { sticker: '', serviceId: '', price: 0 } }));
                }
            } else {
                newSet.delete(a.id);
            }
        });
        setSelectedAssetIds(newSet);
    };

    const focusNext = (currentAssetId) => {
        const allIdsInGroups = groupedAssets.flatMap(([_, items]) => items.map(a => a.id));
        const currentIndex = allIdsInGroups.indexOf(currentAssetId);
        const nextId = allIdsInGroups[currentIndex + 1];
        if (nextId) {
            if (!selectedAssetIds.has(nextId)) toggleAsset(nextId);
            setTimeout(() => {
                if (inputRefs.current[nextId]) {
                    inputRefs.current[nextId].focus();
                    inputRefs.current[nextId].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    };

    const handleSave = async () => {
        if (!isValid) return;
        setSaving(true);
        try {
            const batch = writeBatch(db);
            const now = Timestamp.now();
            const proximaVisita = Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
            
            // 1. Crear el Servicio en la subcolección de la compañía
            const serviceRef = doc(getTenantCollection('servicios'));
            const serviceId = serviceRef.id;
            batch.set(serviceRef, {
                companyId: tenantId, clienteId: clientId, tecnicoId: user.uid,
                fecha: now, tipoOperacion: opType, nroRecibo,
                total: totals.amount, cantidad: totals.count,
                metodoPago: paymentMethod, notas: notes,
                items: Array.from(selectedAssetIds).map(id => ({ id, ...assetDetails[id] }))
            });

            // 2. Crear la Transacción Financiera para el ERP (Jerárquica)
            if (totals.amount > 0) {
                const transRef = doc(getTenantCollection('transacciones'));
                batch.set(transRef, {
                    companyId: tenantId,
                    type: 'INGRESO',
                    category: 'SERVICIO_TECNICO',
                    amount: totals.amount,
                    method: paymentMethod,
                    description: `Cobro Servicio #${nroRecibo || serviceId.slice(-5)} - ${client?.nombre}`,
                    date: now,
                    status: 'COMPLETADO',
                    metadata: { serviceId, clientId, técnico: user.displayName || user.email }
                });
            }

            // 3. Actualizar Assets (Jerárquico)
            selectedAssetIds.forEach(id => {
                batch.update(getTenantDoc('assets', id), {
                    lastService: now, nextService: proximaVisita,
                    status: opType === 'Lugar' ? 'ACTIVO' : 'EN_TALLER',
                    currentLocation: opType === 'Lugar' ? 'CLIENTE' : 'TALLER',
                    ultimoSticker: assetDetails[id].sticker
                });
            });

            await batch.commit();
            setView('success');
            toast.success("✅ Sincronizado con ERP");
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    };

    const shareWhatsApp = () => {
        const text = `*REPORTE DE SERVICIO - ${client?.nombre}*\n\n` +
                     `✅ *Servicio Finalizado:* ${new Date().toLocaleDateString()}\n` +
                     `🧯 *Equipos:* ${totals.count}\n` +
                     `💰 *Monto:* $${totals.amount.toLocaleString('es-AR')}\n` +
                     `💳 *Pago:* ${paymentMethod}\n\n` +
                     `Gracias por confiar en nosotros.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (view === 'loading') return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (view === 'success') return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 animate-fade-in text-center">
             <style>{`
                @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); opacity: 1; } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
                .animate-bounce-in { animation: bounceIn 0.6s cubic-bezier(0.17, 0.67, 0.83, 0.67) both; }
            `}</style>
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/20 animate-bounce-in">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2 animate-fade-in">¡Misión Cumplida!</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-10 animate-fade-in">Sincronización total con la central exitosa</p>
            
            <div className="w-full space-y-4 max-w-sm animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <button onClick={shareWhatsApp} className="w-full bg-[#25D366] text-white p-6 rounded-[2.5rem] font-black text-sm uppercase flex items-center justify-center gap-4 shadow-xl shadow-green-500/20 active:scale-95 transition-all">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    ENVIAR REPORTE WHATSAPP
                </button>
                <button onClick={onBack} className="w-full bg-slate-950 text-white p-6 rounded-[2.5rem] font-black text-sm uppercase shadow-xl shadow-slate-950/20 active:scale-95 transition-all">
                    DASHBOARD PRINCIPAL
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Inter'] text-[#0F172A] flex flex-col pb-64">
            <style>{`
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .animate-fade-in { animation: fadeIn 0.3s ease-out both; }
                .glass-header { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(226, 232, 240, 0.8); }
                .glass-footer { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(24px); border-top: 1px solid rgba(226, 232, 240, 0.8); }
                input:focus { box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1); }
            `}</style>

            {/* HEADER DINÁMICO (Carga vs Pago) */}
            <div className="sticky top-0 z-40 glass-header px-5 py-4 transition-all">
                <div className="flex items-center gap-4 mb-5">
                    <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm active:scale-90 transition-transform text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <div className="flex-1">
                        <h1 className="font-black text-[1.3rem] tracking-tight text-slate-900 line-clamp-1 uppercase">{client?.nombre || 'Analizando...'}</h1>
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden text-right">
                                <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700 ease-out" 
                                     style={{ width: `${(selectedAssetIds.size / (assets.length || 1)) * 100}%` }}></div>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedAssetIds.size} / {assets.length} EQUIPOS</span>
                        </div>
                    </div>
                </div>

                {view === 'payment' ? (
                     <div className="bg-slate-950 p-6 rounded-[2.5rem] text-white animate-fade-in border border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="absolute right-0 top-0 p-6 opacity-10">
                            <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                        </div>
                        <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-widest mb-4">Gestión de Cobranza</h3>
                         <div className="relative">
                            <label className="absolute -top-2 left-4 px-1.5 bg-slate-950 text-[8px] font-black text-slate-400 uppercase tracking-widest">Medio de Pago</label>
                            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-1">
                                <select className="w-full bg-transparent font-black text-sm outline-none text-white py-3" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                    <option value="Efectivo" className="text-black">💵 EFECTIVO</option>
                                    <option value="Transferencia" className="text-black">📱 TRANSFERENCIA</option>
                                    <option value="Cuenta Corriente" className="text-black">📝 CUENTA CORRIENTE</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 animate-fade-in">
                        <div className="relative">
                            <label className="absolute -top-2 left-3 px-1.5 bg-white text-[9px] font-black text-slate-400 uppercase tracking-widest z-10">Servicio</label>
                            <div className="bg-white border-2 border-slate-100 rounded-2xl p-3 shadow-inner">
                                <select className="w-full bg-transparent font-black text-xs outline-none text-slate-800" value={opType} onChange={e => setOpType(e.target.value)}>
                                    <option value="Lugar">📌 EN EL LUGAR</option>
                                    <option value="Retiro">🚛 RETIRO A TALLER</option>
                                </select>
                            </div>
                        </div>
                        <div className="relative">
                            <label className="absolute -top-2 left-3 px-1.5 bg-white text-[9px] font-black text-slate-400 uppercase tracking-widest z-10">Talonario</label>
                            <div className="bg-white border-2 border-slate-100 rounded-2xl p-3 shadow-inner">
                                <input className="w-full bg-transparent font-black text-xs outline-none text-slate-800" placeholder="Nº RECIBO" value={nroRecibo} onChange={e => setNroRecibo(e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-1 p-5 space-y-8 max-w-2xl mx-auto w-full">
                {view === 'payment' ? (
                     <div className="animate-slide-up space-y-6">
                        <div className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] shadow-xl text-center relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-500/5 rounded-full blur-3xl"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Subtotal Estimado</p>
                            <p className="text-7xl font-black text-slate-900 tracking-tighter mb-2 leading-none">${totals.amount.toLocaleString('es-AR')}</p>
                            <div className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest mt-4">
                                {totals.count} Equipos Procesados
                            </div>
                        </div>
                        
                        <div className="bg-white border-2 border-slate-100 p-6 rounded-[2.5rem]">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Notas Finales de Visita</label>
                            <textarea 
                                className="w-full bg-slate-50 rounded-2xl p-6 text-sm font-bold outline-none border-2 border-transparent focus:border-slate-200 transition-all min-h-[160px] text-slate-800"
                                placeholder="Escribe aquí cualquier observación relevante..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                   </div>
                ) : (
                    groupedAssets.map(([groupKey, groupAssets], idx) => (
                        <div key={groupKey} className="animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                            {/* Group Header */}
                            <div onClick={() => toggleGroup(groupKey)} className="flex items-center gap-4 bg-white p-4 rounded-[1.8rem] border border-slate-200 shadow-sm mb-3">
                                <div onClick={(e) => { e.stopPropagation(); selectGroup(groupAssets, !groupAssets.every(a => selectedAssetIds.has(a.id))); }} 
                                     className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${groupAssets.every(a => selectedAssetIds.has(a.id)) ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-200 bg-slate-50'}`}>
                                    {groupAssets.every(a => selectedAssetIds.has(a.id)) && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-[0.9rem] text-slate-800 uppercase">{groupKey}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{groupAssets.length} Unidades</p>
                                </div>
                                <div className={`p-2 rounded-full transition-transform ${expandedGroups.has(groupKey) ? 'rotate-180 text-orange-500' : 'text-slate-300'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                            
                            {expandedGroups.has(groupKey) && (
                                <div className="space-y-3 animate-fade-in pl-6 border-l-2 border-slate-100 ml-4 py-2">
                                    {groupAssets.map(asset => {
                                        const isSelected = selectedAssetIds.has(asset.id);
                                        const detail = assetDetails[asset.id] || {};
                                        const isDone = !!detail.sticker?.trim() && !!detail.serviceId;

                                        return (
                                            <div key={asset.id} className={`p-5 rounded-[2rem] border-2 transition-all relative overflow-hidden ${isSelected ? (isDone ? 'bg-emerald-50/20 border-emerald-500/20 shadow-none' : 'bg-white border-orange-500/50 shadow-xl') : 'bg-white border-slate-100 opacity-60'}`}>
                                                <div className={`absolute top-0 left-0 w-2 h-full ${isSelected ? (isDone ? 'bg-emerald-500' : 'bg-orange-500') : 'bg-slate-100'}`}></div>
                                                <div className="flex items-center gap-4 pl-2" onClick={() => toggleAsset(asset.id)}>
                                                    <div className="flex-1">
                                                        <h4 className={`font-black text-lg ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>#{asset.id.slice(-5).toUpperCase()}</h4>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SERIE: {asset.numeroSerie || 'N/A'}</p>
                                                    </div>
                                                    {isDone && <div className="bg-emerald-500 text-white p-1 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg></div>}
                                                </div>
                                                
                                                {isSelected && (
                                                    <div className="mt-5 space-y-4 pt-5 border-t border-slate-100 animate-fade-in">
                                                        <input 
                                                            ref={el => inputRefs.current[asset.id] = el}
                                                            className="w-full px-6 py-4 rounded-2xl font-black text-lg bg-orange-50 border-2 border-transparent focus:bg-white focus:border-orange-500 outline-none uppercase"
                                                            placeholder="Nº STICKER / PRECINTO"
                                                            value={detail.sticker}
                                                            onChange={e => setAssetDetails(prev => ({ ...prev, [asset.id]: { ...prev[asset.id], sticker: e.target.value } }))}
                                                            onKeyDown={e => e.key === 'Enter' && focusNext(asset.id)}
                                                        />
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                                <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Mantenimiento</label>
                                                                <select className="bg-transparent w-full text-xs font-black outline-none" value={detail.serviceId} 
                                                                        onChange={e => {
                                                                            const s = catalog.find(x => x.id === e.target.value);
                                                                            setAssetDetails(prev => ({ ...prev, [asset.id]: { ...prev[asset.id], serviceId: e.target.value, price: s?.precio || 0  } }));
                                                                        }}>
                                                                    <option value="">ELEGIR...</option>
                                                                    {catalog.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                                <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Precio Compra ($)</label>
                                                                <input type="number" className="bg-transparent w-full text-xs font-black outline-none" value={detail.price} onChange={e => setAssetDetails(prev => ({ ...prev, [asset.id]: { ...prev[asset.id], price: e.target.value } }))} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* BARRA DE ACCIÓN FLOTANTE CIERRE */}
            <div className="fixed bottom-0 left-0 right-0 z-50 glass-footer p-7">
                <div className="max-w-2xl mx-auto flex gap-4">
                    {view === 'service' ? (
                        <button 
                            onClick={() => setView('payment')}
                            disabled={!isValid}
                            className={`flex-1 py-6 rounded-[2.5rem] font-black text-xl transition-all shadow-2xl ${isValid ? 'bg-orange-600 text-white shadow-orange-600/30 active:scale-95' : 'bg-slate-100 text-slate-300'}`}
                        >
                            PROCEDER AL COBRO (${totals.amount.toLocaleString()})
                        </button>
                    ) : (
                        <>
                            <button onClick={() => setView('service')} className="bg-white border-2 border-slate-200 p-6 rounded-[2.5rem] text-slate-400 active:scale-95 transition-all">
                                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className={`flex-1 py-6 rounded-[2.5rem] font-black text-xl bg-slate-950 text-white shadow-2xl shadow-slate-900/40 active:scale-95 transition-all flex items-center justify-center gap-4 ${saving ? 'opacity-70 animate-pulse' : ''}`}
                            >
                                {saving ? 'SINCRONIZANDO...' : 'FINALIZAR Y COBRAR'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
