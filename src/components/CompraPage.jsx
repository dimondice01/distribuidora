import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { useFirestore } from '../hooks/useFirestore';
import { useShift } from '../contexts/ShiftContext';
import { toast } from 'react-toastify';
import Button from './Button';

const CompraPage = ({ proveedor, onCancel, onSuccess }) => {
    const { tenantId, getTenantCollection, getTenantDoc, updateTenantDoc } = useFirestore();
    const { activeShift } = useShift();
    
    const [items, setItems] = useState([]);
    const [pagoInicial, setPagoInicial] = useState(0);
    const [metodoPago, setMetodoPago] = useState('Efectivo');
    const [nroFactura, setNroFactura] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [fiscalMode, setFiscalMode] = useState(proveedor?.prefFiscalMode || 'Bruto');
    const [otrosImpuestos, setOtrosImpuestos] = useState(0);
    
    const [catalog, setCatalog] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingCatalog, setLoadingCatalog] = useState(true);

    const inputRefs = useRef({});

    useEffect(() => {
        if (!tenantId || !proveedor?.id) {
            setLoadingCatalog(false);
            return;
        }
        
        setLoadingCatalog(true);
        const q = query(
            getTenantCollection('productos'), 
            where('proveedorId', '==', proveedor.id)
        );
        
        const unsub = onSnapshot(q, (snap) => {
            setCatalog(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingCatalog(false);
        }, (error) => {
            console.error("Error en Catálogo:", error);
            setLoadingCatalog(false);
        });
        return unsub;
    }, [tenantId, proveedor?.id]);

    const filteredCatalog = useMemo(() => {
        const itemIds = new Set(items.map(i => i.id));
        const filtered = catalog.filter(p => 
            p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !itemIds.has(p.id)
        );
        // Limitamos a 20 para no saturar la vista y permitir foco en el carrito
        return filtered.slice(0, 20);
    }, [catalog, searchTerm, items]);

    const toggleFiscalMode = async () => {
        const newMode = fiscalMode === 'Bruto' ? 'Neto' : 'Bruto';
        setFiscalMode(newMode);
        try {
            await updateTenantDoc('proveedores', proveedor.id, { prefFiscalMode: newMode });
        } catch (e) { console.error(e); }
    };

    // Recalcular precio de venta si cambia otros impuestos o fiscal mode
    useEffect(() => {
        if (items.length > 0) {
            setItems(prevItems => prevItems.map(item => {
                const inputCosto = parseFloat(item.costo) || 0;
                const finalCosto = fiscalMode === 'Neto' ? inputCosto * (1 + item.ivaAlicuota / 100) : inputCosto;
                const costoConImpuestos = finalCosto * (1 + (parseFloat(otrosImpuestos) || 0) / 100);
                const margen = parseFloat(item.margen) || 0;
                const nuevoPrecio = costoConImpuestos > 0 ? (costoConImpuestos * (1 + margen / 100)).toFixed(2) : item.precioVenta;
                return { ...item, precioVenta: nuevoPrecio };
            }));
        }
    }, [otrosImpuestos, fiscalMode]);

    const addItem = (product) => {
        if (items.find(i => i.id === product.id)) {
            toast.warning("El producto ya está en el carrito");
            return;
        }
        
        const currentCosto = product.costo || 0;
        const currentPrecio = product.precio || 0;
        const ivaAlicuota = parseFloat(product.ivaAlicuota) || 21;

        const totalTaxRatio = (1 + (parseFloat(otrosImpuestos) || 0) / 100);
        let costoInput = currentCosto / totalTaxRatio;
        if (fiscalMode === 'Neto') {
            costoInput = costoInput / (1 + ivaAlicuota / 100);
        }

        const currentMargin = currentCosto > 0 ? ((currentPrecio / currentCosto) - 1) * 100 : 0;

        const newItem = {
            id: product.id,
            nombre: product.nombre,
            cantidad: '', 
            costo: costoInput.toFixed(2),
            margen: currentMargin.toFixed(2),
            precioVenta: currentPrecio,
            ivaAlicuota: ivaAlicuota,
            stockAnterior: product.stock || 0
        };

        setItems(prev => [...prev, newItem]);
        setTimeout(() => {
            if (inputRefs.current[product.id]) {
                inputRefs.current[product.id].focus();
            }
        }, 80);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        const item = { ...newItems[index] };
        const numVal = parseFloat(value) || 0;
        item[field] = value;

        const calculateFinalCosto = (inputVal) => {
            const baseCosto = fiscalMode === 'Neto' ? inputVal * (1 + item.ivaAlicuota / 100) : inputVal;
            return baseCosto * (1 + (parseFloat(otrosImpuestos) || 0) / 100);
        };

        if (field === 'costo' || field === 'margen') {
            const inputCosto = field === 'costo' ? numVal : parseFloat(item.costo) || 0;
            const m = field === 'margen' ? numVal : parseFloat(item.margen) || 0;
            const finalCosto = calculateFinalCosto(inputCosto);
            if (finalCosto > 0) item.precioVenta = (finalCosto * (1 + m / 100)).toFixed(2);
        } else if (field === 'precioVenta') {
            const inputCosto = parseFloat(item.costo) || 0;
            const finalCosto = calculateFinalCosto(inputCosto);
            if (finalCosto > 0) item.margen = (((numVal / finalCosto) - 1) * 100).toFixed(2);
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

    const totalFactura = useMemo(() => {
        return items.reduce((sum, item) => {
            const inputCosto = parseFloat(item.costo) || 0;
            const finalCosto = fiscalMode === 'Neto' ? inputCosto * (1 + item.ivaAlicuota / 100) : inputCosto;
            const costoWithTaxes = finalCosto * (1 + (parseFloat(otrosImpuestos) || 0) / 100);
            return sum + (costoWithTaxes * (parseFloat(item.cantidad) || 0));
        }, 0);
    }, [items, fiscalMode, otrosImpuestos]);

    const handleConfirm = async () => {
        if (items.length === 0) return toast.error("Carrito vacío");
        if (items.some(i => !i.cantidad || i.cantidad <= 0)) return toast.error("Revisa las cantidades");
        
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const itemsProcessed = [];

            for (const item of items) {
                const productRef = getTenantDoc('productos', item.id);
                const inputCosto = parseFloat(item.costo) || 0;
                const finalCosto = fiscalMode === 'Neto' ? inputCosto * (1 + item.ivaAlicuota / 100) : inputCosto;
                const finalCostoConImpuestos = finalCosto * (1 + (parseFloat(otrosImpuestos) || 0) / 100);
                batch.update(productRef, {
                    stock: increment(parseFloat(item.cantidad) || 0),
                    costo: finalCostoConImpuestos,
                    precio: parseFloat(item.precioVenta) || 0,
                    lastUpdate: serverTimestamp()
                });
                itemsProcessed.push({ id: item.id, nombre: item.nombre, cantidad: parseFloat(item.cantidad) || 0, costoUnitario: finalCostoConImpuestos });
            }

            const compraRef = doc(getTenantCollection('compras'));
            batch.set(compraRef, {
                companyId: tenantId,
                proveedorId: proveedor.id,
                proveedorNombre: proveedor.nombre,
                nroFactura: nroFactura,
                otrosImpuestosPorcentaje: parseFloat(otrosImpuestos) || 0,
                total: totalFactura,
                pagoInicial: parseFloat(pagoInicial) || 0,
                saldo: totalFactura - (parseFloat(pagoInicial) || 0),
                items: itemsProcessed,
                fecha: serverTimestamp(),
                fiscalMode: fiscalMode,
                estado: (totalFactura - (parseFloat(pagoInicial) || 0)) <= 0 ? 'PAGADA' : 'PENDIENTE'
            });

            if (parseFloat(pagoInicial) > 0 && metodoPago === 'Efectivo') {
                const gastoRef = doc(getTenantCollection('gastos'));
                batch.set(gastoRef, {
                    companyId: tenantId,
                    monto: parseFloat(pagoInicial),
                    detalle: `Pago Proveedor: ${proveedor.nombre}`,
                    metodoPago: 'Efectivo',
                    fechaGasto: serverTimestamp(),
                    tipo: 'pago_proveedor',
                    shiftId: activeShift?.id || null
                });
            }

            await batch.commit();
            toast.success("Factura Guardada!");
            onSuccess();
        } catch (err) { console.error(err); toast.error("Error al guardar"); } finally { setIsSaving(false); }
    };

    return (
        <div className="w-full flex flex-col h-[calc(100vh-140px)] animate-fade-in bg-white select-none">
            {/* CABECERA INDUSTRIAL (LUZ TOTAL) */}
            <header className="bg-slate-50 px-10 py-6 border-b border-slate-200 flex justify-between items-center z-20">
                <div className="flex items-center gap-8">
                    <button onClick={onCancel} className="bg-white border-2 border-slate-100 p-3 rounded-2xl hover:bg-slate-50 transition-all active:scale-95 text-slate-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Estación de Compras</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{proveedor?.nombre}</span>
                            {nroFactura && <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Fact. #{nroFactura}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                     <div className="flex bg-slate-200/50 p-1 rounded-2xl border border-slate-200">
                        <button onClick={toggleFiscalMode} className={`px-8 py-2 rounded-xl text-xs font-black transition-all ${fiscalMode === 'Neto' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>NETO (+IVA)</button>
                        <button onClick={toggleFiscalMode} className={`px-8 py-2 rounded-xl text-xs font-black transition-all ${fiscalMode === 'Bruto' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}>BRUTO (FINAL)</button>
                    </div>
                    <div className="bg-white border-2 border-slate-100 px-4 py-3 rounded-2xl flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Otros Imp. (%):</span>
                        <input type="number" step="0.1" className="font-black text-slate-800 outline-none w-16 border-b-2 border-slate-100 focus:border-indigo-400 text-sm text-center" value={otrosImpuestos} onChange={(e) => setOtrosImpuestos(e.target.value)} placeholder="0" />
                    </div>
                    <div className="bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Factura:</span>
                        <input type="text" className="font-black text-slate-800 outline-none w-32 border-b-2 border-slate-100 focus:border-amber-400 text-sm" value={nroFactura} onChange={(e) => setNroFactura(e.target.value)} placeholder="0001-..." />
                    </div>
                </div>
            </header>

            {/* CUERPO FLEX INDUSTRIAL (70/30) */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* IZQUIERDA: EL CARRITO (70%) - PRIORIDAD MÁXIMA */}
                <div className="w-[70%] flex flex-col bg-white border-r-4 border-slate-50 relative min-w-[700px]">
                    <div className="bg-amber-50 px-10 py-3 border-b border-amber-100 flex justify-between items-center">
                        <h4 className="text-amber-600 font-black text-[11px] uppercase tracking-widest">Carrito de Compra / Detalle de Factura</h4>
                        <span className="bg-amber-100 text-amber-700 font-black px-4 py-1 rounded-full text-[10px]">{items.length} ARTICULOS</span>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                                <tr className="border-b-2 border-slate-50">
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Artículo</th>
                                    <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Cant.</th>
                                    <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-36">Costo ({fiscalMode})</th>
                                    <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Margen %</th>
                                    <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-36">P. Venta</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Subtotal</th>
                                    <th className="w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-20 py-40 text-center">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                            </div>
                                            <h5 className="text-slate-400 font-black text-lg">TU CARRITO ESTÁ VACÍO</h5>
                                            <p className="text-slate-300 font-bold italic text-sm mt-2">Usa la lista de la derecha para añadir productos y armar tu factura.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-all group animate-fade-in-up">
                                            <td className="px-10 py-5">
                                                <p className="font-black text-slate-800 text-lg leading-tight">{item.nombre}</p>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IVA {item.ivaAlicuota}% • Stock: {item.stockAnterior}</span>
                                            </td>
                                            <td className="px-2 py-5">
                                                <input 
                                                    ref={el => inputRefs.current[item.id] = el}
                                                    type="number" 
                                                    className="w-full px-4 py-3 bg-slate-100 border-2 border-transparent focus:border-amber-400 focus:bg-white rounded-2xl font-black text-slate-800 outline-none text-center text-xl transition-all" 
                                                    value={item.cantidad} 
                                                    onChange={(e) => updateItem(idx, 'cantidad', e.target.value)} 
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-2 py-5">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                                                    <input type="number" className="w-full pl-7 pr-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-400 focus:bg-white rounded-xl font-black text-slate-800 outline-none text-sm transition-all" value={item.costo} onChange={(e) => updateItem(idx, 'costo', e.target.value)} />
                                                </div>
                                            </td>
                                            <td className="px-2 py-5">
                                                <input type="number" className="w-full px-3 py-3 bg-slate-50 border-2 border-transparent focus:border-slate-400 focus:bg-white rounded-xl font-black text-slate-500 outline-none text-center text-sm transition-all" value={item.margen} onChange={(e) => updateItem(idx, 'margen', e.target.value)} />
                                            </td>
                                            <td className="px-2 py-5">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-amber-300">$</span>
                                                    <input type="number" className="w-full pl-7 pr-4 py-3 bg-amber-50/50 border-2 border-amber-100 focus:border-amber-400 focus:bg-white rounded-xl font-black text-slate-900 outline-none text-sm transition-all shadow-sm" value={item.precioVenta} onChange={(e) => updateItem(idx, 'precioVenta', e.target.value)} />
                                                </div>
                                            </td>
                                            <td className="px-10 py-5 text-right font-black text-slate-900 text-xl">
                                                ${((parseFloat(item.costo) || 0) * (parseFloat(item.cantidad) || 0) * (fiscalMode === 'Neto' ? (1 + item.ivaAlicuota / 100) : 1) * (1 + (parseFloat(otrosImpuestos) || 0) / 100)).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-5 text-right">
                                                <button onClick={() => removeItem(idx)} className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* TOTALES FLOTANTES */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t-4 border-slate-50 px-10 py-8 flex justify-between items-center shadow-[0_-10px_30px_rgba(0,0,0,0.02)] z-20">
                        <div className="flex gap-10">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto Pagado</span>
                                <input type="number" className="bg-transparent border-b-2 border-slate-100 font-black text-3xl w-40 text-slate-800 outline-none focus:border-amber-400 transition-all" value={pagoInicial} onChange={(e) => setPagoInicial(e.target.value)} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Método</span>
                                <select className="bg-slate-50 border-2 border-slate-100 px-4 py-2 rounded-xl font-black text-xs text-slate-700 outline-none focus:border-indigo-400 transition-all" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                                    <option value="Efectivo">💵 EFECTIVO</option>
                                    <option value="Transferencia">🏦 BANCO</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-10">
                             <div className="text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Compra</span>
                                <p className="text-6xl font-black text-slate-900 tracking-tighter leading-none">${totalFactura.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                             </div>
                             <Button onClick={handleConfirm} disabled={isSaving || items.length === 0} className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-16 py-6 rounded-3xl font-black text-lg shadow-2xl shadow-amber-200 active:scale-95 transition-all">
                                {isSaving ? 'GUARDANDO...' : 'CONFIRMAR'}
                             </Button>
                        </div>
                    </div>
                </div>

                {/* DERECHA: CATÁLOGO (30%) - PANEL LATERAL FIJO */}
                <aside className="w-[30%] bg-slate-50 flex flex-col min-w-[350px]">
                    <div className="p-8 border-b border-slate-200 bg-white">
                        <div className="flex flex-col gap-1 mb-6">
                             <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-3">
                                <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-amber-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                </div>
                                Añadir Ítems
                             </h4>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-11">
                                Mostrando los {filteredCatalog.length} más relevantes
                             </p>
                        </div>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Buscar en el catálogo..." 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl pl-12 pr-4 py-4 text-base font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-5">
                        {loadingCatalog ? (
                            <div className="text-center py-20 text-slate-300 font-black uppercase text-[10px] animate-pulse">Sincronizando Catálogo...</div>
                        ) : filteredCatalog.length === 0 ? (
                            <p className="text-center text-slate-400 font-bold italic py-20">No hay más productos.</p>
                        ) : (
                            filteredCatalog.map(p => (
                                <button key={p.id} onClick={() => addItem(p)} className="w-full text-left bg-white p-6 rounded-3xl border-2 border-transparent hover:border-amber-400 shadow-sm hover:shadow-2xl transition-all active:scale-[0.98] group flex justify-between items-center">
                                    <div className="flex-1 pr-6">
                                        <p className="font-black text-slate-800 text-lg group-hover:text-amber-600 transition-colors">{p.nombre}</p>
                                        <div className="flex gap-4 mt-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">STK: {p.stock}</span>
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-50 px-2 rounded-md">${p.costo || 0}</span>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 bg-slate-50 text-slate-200 rounded-2xl flex items-center justify-center group-hover:bg-amber-400 group-hover:text-white transition-all">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default CompraPage;
