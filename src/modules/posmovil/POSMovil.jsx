import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { auth } from '../../firebase.js';
import { useShift } from '../../contexts/ShiftContext.jsx';
import { useTenant } from '../../contexts/TenantContext.jsx';
import { useFirestore } from '../../hooks/useFirestore';
import { usePOSSale } from '../../hooks/usePOSSale';
import FacturacionMovil from './FacturacionMovil';

// --- ICONOS ---
const Icono = ({ path, className = "w-5 h-5", d2 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
    </svg>
);
const SearchIcon = (p) => <Icono {...p} path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />;
const TrashIcon = (p) => <Icono {...p} path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456-1.278A11.862 11.862 0 0020.62 6m-14.456.374a11.862 11.862 0 00-.87 5.143" />;
const PlusIcon = (p) => <Icono {...p} path="M12 4.5v15m7.5-7.5h-15" />;
const MinusIcon = (p) => <Icono {...p} path="M4.5 12.75h15" />;
const CheckIcon = (p) => <Icono {...p} path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
const CartIcon = (p) => <Icono {...p} path="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84" />;
const UserIcon = (p) => <Icono {...p} path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A1.5 1.5 0 0118 21.75H6.001c-.621 0-1.125-.504-1.125-1.125a1.5 1.5 0 01.624-1.507z" />;
const CloseIcon = (p) => <Icono {...p} path="M6 18L18 6M6 6l12 12" />;
const LogoutIcon = (p) => <Icono {...p} path="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />;
const PrinterIcon = (p) => <Icono {...p} path="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />;
const DocIcon = (p) => <Icono {...p} path="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />;

const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

// --- MODAL DE CANTIDAD (igual idea que el catálogo web: se ingresa la cantidad y se confirma, en vez de tocar +1 varias veces) ---
const QtyModal = ({ product, initialQty, onConfirm, onClose }) => {
    const [value, setValue] = useState(String(initialQty || 1));
    const inputRef = useRef(null);

    useEffect(() => { const t = setTimeout(() => inputRef.current?.select(), 100); return () => clearTimeout(t); }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        const qty = parseInt(value);
        if (isNaN(qty)) { onClose(); return; }
        if (qty > (product.stock || 0)) { toast.warn(`Solo hay ${product.stock} unidades disponibles.`); return; }
        onConfirm(qty);
    };

    return (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-white/70 backdrop-blur-md p-6 animate-fade-in">
            <div className="bg-white w-full max-w-xs rounded-[2rem] shadow-2xl p-7 border border-slate-100">
                <h3 className="text-center text-base font-black text-slate-900 mb-1 line-clamp-1">{product.nombre}</h3>
                <p className="text-center text-slate-400 text-[10px] mb-6 font-black uppercase tracking-widest">Ingresá la cantidad</p>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        type="number"
                        inputMode="numeric"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full text-center text-5xl font-black text-amber-500 border-b-2 border-slate-100 focus:border-amber-400 outline-none py-2 mb-6 bg-transparent"
                        placeholder="0"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={onClose} className="py-3.5 rounded-2xl font-black text-slate-500 bg-slate-100">Cancelar</button>
                        <button type="submit" className="py-3.5 rounded-2xl font-black text-white bg-slate-900 shadow-xl">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- PROMOCIONES VIGENTES ---
const PromoListSheet = ({ promotions, onClose }) => (
    <div className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
        <div className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl p-6 max-h-[75vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-2"><span className="text-xl">🔥</span><h3 className="text-base font-black">Promociones Vigentes</h3></div>
                <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><CloseIcon className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto space-y-3 flex-1">
                {promotions.length === 0 ? (
                    <p className="text-center text-slate-300 text-xs font-black uppercase py-10">Sin promociones activas</p>
                ) : promotions.map(promo => (
                    <div key={promo.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex justify-between items-start mb-1.5 gap-2">
                            <h4 className="font-black text-sm text-slate-800">{promo.nombrePromocion}</h4>
                            <span className={`text-[9px] font-black px-2 py-1 rounded-full text-white uppercase flex-shrink-0 ${promo.tipo === 'REGALO_POR_COMPRA' ? 'bg-purple-500' : promo.tipo === 'DESCUENTO_POR_CANTIDAD' ? 'bg-green-500' : 'bg-blue-500'}`}>
                                {promo.tipo === 'LLEVA_X_PAGA_Y' ? 'Pack' : promo.tipo === 'REGALO_POR_COMPRA' ? 'Regalo' : 'Descuento'}
                            </span>
                        </div>
                        {promo.descripcion && <p className="text-xs text-slate-500 mb-2">{promo.descripcion}</p>}
                        {promo.productoNombre && <div className="text-[10px] font-bold text-slate-500 bg-white p-2 rounded-lg border border-slate-100 inline-block">👉 {promo.productoNombre}</div>}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// --- SELECTOR DE CLIENTE (pantalla completa) ---
const ClientSheet = ({ clients, zonas, selectedClientId, onSelect, onClose }) => {
    const [search, setSearch] = useState('');
    const [isNewClientOpen, setIsNewClientOpen] = useState(false);
    const filtered = clients.filter(c =>
        (c.nombre || c.nombreCompleto || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.cuit || '').includes(search) || (c.dni || '').includes(search)
    ).slice(0, 50);

    return (
        <div className="fixed inset-0 z-[160] bg-white flex flex-col animate-fade-in">
            <div className="p-4 border-b bg-slate-50 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Seleccionar Cliente</h3>
                    <button onClick={onClose} className="p-2 bg-slate-200 rounded-full"><CloseIcon className="w-4 h-4" /></button>
                </div>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
                    <input autoFocus type="text" placeholder="Buscar por nombre, CUIT o DNI..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-400" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
                <button onClick={() => setIsNewClientOpen(true)}
                    className="w-full p-4 rounded-2xl flex items-center gap-3 mb-2 border-2 border-dashed border-amber-300 bg-amber-50">
                    <div className="w-11 h-11 bg-amber-400 rounded-xl flex items-center justify-center text-slate-900"><PlusIcon className="w-5 h-5" /></div>
                    <p className="font-black text-sm text-amber-700">Nuevo Cliente</p>
                </button>
                <button onClick={() => { onSelect(''); onClose(); }}
                    className={`w-full p-4 rounded-2xl flex items-center gap-3 mb-2 border-2 ${!selectedClientId ? 'bg-amber-50 border-amber-300' : 'border-transparent bg-slate-50'}`}>
                    <div className="w-11 h-11 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500"><UserIcon className="w-5 h-5" /></div>
                    <div className="text-left"><p className="font-black text-sm">Consumidor Final</p><p className="text-[10px] text-slate-400 font-bold uppercase">Sin registro fiscal</p></div>
                </button>
                {filtered.map(c => (
                    <button key={c.id} onClick={() => { onSelect(c.id); onClose(); }}
                        className={`w-full p-4 rounded-2xl flex items-center gap-3 mb-2 border-2 ${selectedClientId === c.id ? 'bg-amber-50 border-amber-300' : 'border-transparent bg-slate-50'}`}>
                        <div className="w-11 h-11 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-black">{(c.nombre || c.nombreCompleto || '?')[0]}</div>
                        <div className="text-left min-w-0 flex-1"><p className="font-black text-sm truncate">{c.nombre || c.nombreCompleto}</p></div>
                    </button>
                ))}
                {filtered.length === 0 && <p className="text-center text-slate-300 text-xs font-black uppercase py-10">Sin resultados</p>}
            </div>
            {isNewClientOpen && (
                <NewClientSheet
                    zonas={zonas}
                    onClose={() => setIsNewClientOpen(false)}
                    onCreated={(id) => { onSelect(id); setIsNewClientOpen(false); onClose(); }}
                />
            )}
        </div>
    );
};

// --- ALTA RÁPIDA DE CLIENTE (pantalla completa, campos esenciales para facturar) ---
// Mismo modelo de datos y validaciones que src/components/Clientes.jsx
// (handleCondicionFiscal / handleAddCliente), recortado a lo imprescindible
// para cargar un cliente parado en el mostrador.
const CONDICION_PILLS = {
    CF: { isArca: false, requiereFacturaAfip: false, condicionIva: 'CF', tipoDocumento: 'SC', numeroDocumento: '' },
    MT: { isArca: true, requiereFacturaAfip: true, condicionIva: 'MT', tipoDocumento: 'DNI', numeroDocumento: '' },
    RI: { isArca: true, requiereFacturaAfip: true, condicionIva: 'RI', tipoDocumento: 'CUIT', numeroDocumento: '' },
};

const NewClientSheet = ({ zonas, onCreated, onClose }) => {
    const { addTenantDoc } = useFirestore();
    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');
    const [dni, setDni] = useState('');
    const [zonaId, setZonaId] = useState('');
    const [fiscal, setFiscal] = useState(CONDICION_PILLS.CF);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!nombre.trim() || !zonaId) { toast.error('Nombre y Zona son obligatorios.'); return; }
        if (fiscal.condicionIva === 'RI' && (!fiscal.numeroDocumento || fiscal.numeroDocumento.length !== 11)) {
            toast.error('Para Resp. Inscripto el CUIT es obligatorio (11 dígitos sin guiones).');
            return;
        }
        setSaving(true);
        try {
            const docRef = await addTenantDoc('clientes', {
                nombre: nombre.trim(),
                telefono: telefono.trim(),
                dni: fiscal.isArca ? '' : dni.trim(),
                zonaId,
                ...fiscal,
                activo: true,
                fechaCreacion: new Date(),
            });
            toast.success('Cliente creado');
            onCreated(docRef.id);
        } catch (e) {
            console.error('Error creando cliente:', e);
            toast.error('No se pudo crear el cliente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[165] bg-white flex flex-col animate-fade-in">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Nuevo Cliente</h3>
                <button onClick={onClose} className="p-2 bg-slate-200 rounded-full"><CloseIcon className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre *</label>
                    <input autoFocus type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido / Razón social"
                        className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-400" />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Condición IVA</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['CF', 'MT', 'RI'].map(c => (
                            <button key={c} type="button" onClick={() => setFiscal(CONDICION_PILLS[c])}
                                className={`py-2.5 rounded-xl text-xs font-black uppercase transition-all ${fiscal.condicionIva === c ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {c === 'CF' ? 'Cons. Final' : c}
                            </button>
                        ))}
                    </div>
                </div>

                {fiscal.isArca ? (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            {fiscal.condicionIva === 'RI' ? 'CUIT * (11 dígitos)' : 'DNI'}
                        </label>
                        <input type="text" inputMode="numeric" maxLength={11} value={fiscal.numeroDocumento}
                            onChange={(e) => setFiscal(prev => ({ ...prev, numeroDocumento: e.target.value.replace(/\D/g, '') }))}
                            className={`w-full px-4 py-3.5 border-2 rounded-2xl font-bold text-sm outline-none ${fiscal.condicionIva === 'RI' && fiscal.numeroDocumento && fiscal.numeroDocumento.length !== 11 ? 'border-rose-300 bg-rose-50' : 'border-slate-100 bg-slate-50 focus:border-amber-400'}`} />
                        {fiscal.condicionIva === 'RI' && fiscal.numeroDocumento && fiscal.numeroDocumento.length !== 11 && (
                            <p className="text-[10px] text-rose-500 font-bold px-1">El CUIT debe tener exactamente 11 dígitos.</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">DNI (opcional)</label>
                        <input type="text" inputMode="numeric" value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-400" />
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Teléfono (opcional)</label>
                    <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                        className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-400" />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Zona *</label>
                    <select value={zonaId} onChange={(e) => setZonaId(e.target.value)}
                        className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-400">
                        <option value="">-- Seleccionar --</option>
                        {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                    </select>
                </div>
            </div>
            <div className="p-5 border-t bg-white flex-shrink-0">
                <button onClick={handleSave} disabled={saving}
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50">
                    {saving ? 'GUARDANDO...' : 'CREAR CLIENTE'}
                </button>
            </div>
        </div>
    );
};

// --- MODAL DE COBRO (pantalla completa) ---
const PaymentSheet = ({ total, subtotal, descuento, selectedClient, companyConfig, onClose, onConfirm }) => {
    const [pagoEfectivo, setPagoEfectivo] = useState(total.toString());
    const [pagoTransferencia, setPagoTransferencia] = useState('');
    const [pagoTarjeta, setPagoTarjeta] = useState('');
    const [nroCupon, setNroCupon] = useState('');
    const [isAfipEnabled, setIsAfipEnabled] = useState(selectedClient?.isArca || false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const afipLetra = (() => {
        if (!companyConfig?.taxCondition) return null;
        if (companyConfig.taxCondition === 'MT') return 'C';
        if (companyConfig.taxCondition === 'RI') return (selectedClient?.condicionIva || 'CF') === 'RI' ? 'A' : 'B';
        return 'B';
    })();

    const totalPagado = (parseFloat(pagoEfectivo) || 0) + (parseFloat(pagoTransferencia) || 0) + (parseFloat(pagoTarjeta) || 0);
    const vuelto = Math.max(0, totalPagado - total);

    const handleConfirm = async () => {
        if (totalPagado < total - 0.01) { setError('El pago es insuficiente.'); return; }
        if ((parseFloat(pagoTarjeta) || 0) > 0 && !nroCupon.trim()) { setError('Ingrese el Nro. de Cupón para tarjeta.'); return; }
        if (isAfipEnabled) {
            if (!companyConfig?.cuit || !companyConfig?.taxCondition || !companyConfig?.ptoVta) {
                setError('Configuración AFIP incompleta (Falta CUIT, IVA o Pto. Venta).');
                return;
            }
            const documento = selectedClient?.numeroDocumento || selectedClient?.cuit || selectedClient?.dni || '';
            if (afipLetra === 'A' && documento.length !== 11) {
                setError('Factura A requiere un CUIT válido de 11 dígitos.');
                return;
            }
        }
        setSubmitting(true);
        const ok = await onConfirm({
            pagoEfectivo: parseFloat(pagoEfectivo) || 0,
            pagoTransferencia: parseFloat(pagoTransferencia) || 0,
            pagoTarjeta: parseFloat(pagoTarjeta) || 0,
            nroCupon: nroCupon.trim(),
            vuelto,
            isAfipEnabled
        });
        setSubmitting(false);
        if (ok) onClose();
    };

    return (
        <div className="fixed inset-0 z-[170] bg-white flex flex-col animate-fade-in">
            <div className="bg-slate-900 p-6 text-white flex-shrink-0 relative">
                <button onClick={onClose} className="absolute right-5 top-5 p-2 rounded-full hover:bg-white/10 text-slate-400"><CloseIcon className="w-5 h-5" /></button>
                <p className="text-amber-400 font-black tracking-[0.3em] text-[10px] uppercase mb-1">Checkout POS Móvil</p>
                <h3 className="text-2xl font-black">Finalizar Venta</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100">
                    {descuento > 0 && (
                        <div className="flex justify-between items-center text-[11px] font-bold text-amber-700/70 mb-2">
                            <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                        </div>
                    )}
                    {descuento > 0 && (
                        <div className="flex justify-between items-center text-[11px] font-black text-emerald-600 mb-2">
                            <span>Ahorrás con promos</span><span>-{formatCurrency(descuento)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <div><p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Total a Cobrar</p><p className="text-3xl font-black">{formatCurrency(total)}</p></div>
                        {vuelto > 0 && <div className="text-right"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Vuelto</p><p className="text-2xl font-black text-emerald-600">{formatCurrency(vuelto)}</p></div>}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Efectivo</label>
                    <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-lg">$</span>
                        <input type="number" inputMode="decimal" value={pagoEfectivo} onChange={(e) => setPagoEfectivo(e.target.value)} autoFocus
                            className="w-full pl-9 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black focus:border-amber-400 outline-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Transferencia</label>
                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                            <input type="number" inputMode="decimal" value={pagoTransferencia} onChange={(e) => setPagoTransferencia(e.target.value)}
                                className="w-full pl-7 pr-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black outline-none focus:border-blue-400" /></div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tarjeta</label>
                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                            <input type="number" inputMode="decimal" value={pagoTarjeta} onChange={(e) => setPagoTarjeta(e.target.value)}
                                className="w-full pl-7 pr-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black outline-none focus:border-purple-400" /></div>
                    </div>
                </div>
                {(parseFloat(pagoTarjeta) || 0) > 0 && (
                    <input type="text" value={nroCupon} onChange={(e) => setNroCupon(e.target.value)} placeholder="Nro. de Cupón / Operación"
                        className="w-full px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl text-sm font-bold text-purple-700 outline-none" />
                )}

                <div className={`p-4 rounded-2xl border flex items-center justify-between ${isAfipEnabled ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isAfipEnabled ? 'text-indigo-600' : 'text-slate-400'}`}>Emisión Fiscal</p>
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold">FACTURACIÓN ARCA / AFIP</p>
                            {isAfipEnabled && afipLetra && <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-black">FACTURA {afipLetra}</span>}
                        </div>
                    </div>
                    <button onClick={() => setIsAfipEnabled(!isAfipEnabled)} className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${isAfipEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transition-transform ${isAfipEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>

                {error && <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 py-3 rounded-xl border border-rose-100">{error}</p>}
            </div>
            <div className="p-5 border-t bg-white flex-shrink-0">
                <button onClick={handleConfirm} disabled={submitting}
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    <CheckIcon className="w-5 h-5 text-amber-400" /> {submitting ? 'PROCESANDO...' : 'CONFIRMAR PAGO'}
                </button>
            </div>
        </div>
    );
};

// --- HOJA DE CARRITO (pantalla completa) ---
const CartSheet = ({ sale, onClose, onOpenClient, onOpenPayment }) => {
    const { cartTotals, calculatedGifts } = sale;
    const isEmpty = cartTotals.cartItemsResolved.length === 0 && calculatedGifts.length === 0;

    return (
        <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-fade-in">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
                <h2 className="text-base font-black tracking-tight">CARRITO ({sale.cart.length})</h2>
                <div className="flex items-center gap-2">
                    {sale.cart.length > 0 && (
                        <button onClick={() => sale.cart.forEach(i => sale.updateQuantity(i.id, -999))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><TrashIcon className="w-4 h-4" /></button>
                    )}
                    <button onClick={onClose} className="p-2 bg-slate-200 rounded-full"><CloseIcon className="w-4 h-4" /></button>
                </div>
            </div>

            <button onClick={onOpenClient} className="mx-5 mt-4 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500"><UserIcon className="w-4 h-4" /></div>
                    <div className="text-left">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                        <h4 className="text-xs font-black text-slate-700">{sale.selectedClient?.nombre || sale.selectedClient?.nombreCompleto || 'Consumidor Final'}</h4>
                    </div>
                </div>
                <Icono path="M8.25 4.5l7.5 7.5-7.5 7.5" className="w-3 h-3 text-slate-300" />
            </button>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {isEmpty ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <CartIcon className="w-14 h-14 mb-3" />
                        <p className="font-black uppercase tracking-widest text-xs">El carrito está vacío</p>
                    </div>
                ) : (
                    <>
                        {cartTotals.cartItemsResolved.map(item => {
                            const discount = cartTotals.itemDiscounts[item.id];
                            return (
                                <div key={item.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h5 className="text-xs font-black text-slate-800 truncate">{item.nombre}</h5>
                                            <p className="text-[11px] font-black text-amber-600">{formatCurrency(item.currentPrice)}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-white border border-slate-100 p-1 rounded-xl">
                                            <button onClick={() => sale.updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center active:scale-90"><MinusIcon className="w-3.5 h-3.5" /></button>
                                            <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                                            <button onClick={() => sale.updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center active:scale-90"><PlusIcon className="w-3.5 h-3.5" /></button>
                                        </div>
                                        <p className="text-xs font-black w-16 text-right">{formatCurrency(item.currentPrice * item.quantity)}</p>
                                    </div>
                                    {discount > 0 && <div className="mt-2 text-[9px] font-black text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 inline-block">🔥 Promo: -{formatCurrency(discount)}</div>}
                                </div>
                            );
                        })}
                        {calculatedGifts.map(g => (
                            <div key={`gift-${g.id}`} className="p-3 bg-purple-50 border border-purple-100 rounded-2xl flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <h5 className="text-xs font-black text-purple-700 truncate">🎁 {g.nombre}</h5>
                                    <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Regalo x {g.quantity}</p>
                                </div>
                                <p className="text-xs font-black text-purple-500">GRATIS</p>
                            </div>
                        ))}
                    </>
                )}
            </div>

            <div className="p-5 bg-slate-900 text-white flex-shrink-0">
                <button onClick={() => sale.setAutoPrint(!sale.autoPrint)} className={`w-full flex items-center justify-center gap-2 px-3 py-2 mb-3 rounded-lg border font-black text-[10px] uppercase tracking-widest ${sale.autoPrint ? 'bg-amber-400 border-amber-400 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    <PrinterIcon className="w-3.5 h-3.5" /> Ticket 58mm {sale.autoPrint ? 'ON' : 'OFF'}
                </button>
                {cartTotals.totalDescuentos > 0 && (
                    <>
                        <div className="flex items-center justify-between mb-1 text-[11px]">
                            <span className="text-slate-400 font-bold">Subtotal</span>
                            <span className="text-slate-400 font-bold">{formatCurrency(cartTotals.subTotalBruto)}</span>
                        </div>
                        <div className="flex items-center justify-between mb-3 text-[11px]">
                            <span className="text-emerald-400 font-black">Ahorrás con promos</span>
                            <span className="text-emerald-400 font-black">-{formatCurrency(cartTotals.totalDescuentos)}</span>
                        </div>
                    </>
                )}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-amber-400 font-black tracking-widest text-[9px] uppercase">TOTAL VENTA</span>
                    <h4 className="text-2xl font-black">{formatCurrency(sale.total)}</h4>
                </div>
                <div className="flex gap-2">
                    {sale.selectedClientId && (
                        <button
                            disabled={sale.cart.length === 0 || !!sale.isSaving}
                            onClick={() => sale.handleConfirmPayment({ pagoEfectivo: 0, pagoTransferencia: 0, pagoTarjeta: 0, nroCupon: '', vuelto: 0, isAfipEnabled: false, esCuentaCorriente: true }).then(ok => ok && onClose())}
                            className="py-4 px-3 bg-slate-700 text-white font-black text-[10px] rounded-xl disabled:opacity-40"
                        >CTA. CTE.</button>
                    )}
                    <button disabled={sale.cart.length === 0 || !!sale.isSaving} onClick={onOpenPayment}
                        className="flex-1 py-4 bg-amber-400 text-slate-900 font-black text-base rounded-xl shadow-xl active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40">
                        <CheckIcon className="w-5 h-5" /> COBRAR
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- PANTALLA PRINCIPAL ---
const POSMovil = () => {
    const navigate = useNavigate();
    const { activeShift, openShift } = useShift();
    const { companyConfig, logo } = useTenant();
    const sale = usePOSSale();

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isClientOpen, setIsClientOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [isPromoListOpen, setIsPromoListOpen] = useState(false);
    const [isFacturacionOpen, setIsFacturacionOpen] = useState(false);
    const [qtyModalProduct, setQtyModalProduct] = useState(null);
    const [initialCash, setInitialCash] = useState(0);
    const [showOpenShift, setShowOpenShift] = useState(false);

    const handleLogout = async () => { try { await auth.signOut(); } catch (e) { console.error(e); } };

    if (!activeShift) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
                    <Icono path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" className="w-9 h-9" />
                </div>
                <h2 className="text-2xl font-black mb-2">Caja Cerrada</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8">Abre turno para operar</p>

                {!showOpenShift ? (
                    <button onClick={() => setShowOpenShift(true)} className="w-full max-w-xs py-4 bg-emerald-500 text-white font-black rounded-2xl shadow-lg">ABRIR TURNO</button>
                ) : (
                    <div className="w-full max-w-xs space-y-3">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                            <input type="number" inputMode="decimal" autoFocus value={initialCash} onChange={(e) => setInitialCash(e.target.value)} placeholder="Fondo inicial"
                                className="w-full pl-8 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-lg font-black outline-none focus:border-amber-400" />
                        </div>
                        <button onClick={() => { openShift(initialCash); setInitialCash(0); }} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl">INICIAR TURNO</button>
                    </div>
                )}
                <button onClick={() => setIsFacturacionOpen(true)} className="mt-8 flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-widest"><DocIcon className="w-4 h-4" /> Ver Facturación</button>
                <button onClick={() => navigate('/')} className="mt-3 text-xs font-bold text-slate-400 underline">Ir al panel de escritorio</button>
                {isFacturacionOpen && (
                    <FacturacionMovil
                        clients={sale.clients}
                        zonas={sale.zonas}
                        companyConfig={sale.companyConfig}
                        logo={logo}
                        onClose={() => setIsFacturacionOpen(false)}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-50 font-sans overflow-hidden">
            {/* TOP BAR */}
            <div className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    {logo ? <img src={logo} alt="logo" className="w-8 h-8 rounded-lg object-contain bg-white flex-shrink-0" /> : <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900 font-black flex-shrink-0">N</div>}
                    <div className="min-w-0">
                        <p className="text-xs font-black truncate">{companyConfig?.nombreFantasia || companyConfig?.name || 'POS Móvil'}</p>
                        <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Turno Activo</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {sale.promotions.length > 0 && (
                        <button onClick={() => setIsPromoListOpen(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-400/10 border border-amber-400/30 rounded-lg text-amber-400 text-[10px] font-black">
                            🔥 <span className="hidden xs:inline">Promos</span>
                        </button>
                    )}
                    <button onClick={() => setIsFacturacionOpen(true)} className="p-2 text-slate-400 hover:text-amber-400"><DocIcon className="w-5 h-5" /></button>
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400"><LogoutIcon className="w-5 h-5" /></button>
                </div>
            </div>

            {/* BUSCADOR + CATEGORÍAS */}
            <div className="p-3 space-y-3 flex-shrink-0 bg-white border-b border-slate-100">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
                    <input type="text" placeholder="Buscar por nombre o EAN..." value={sale.searchTerm} onChange={(e) => sale.setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-400" />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => sale.setSelectedCategoryId('all')} className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap border ${sale.selectedCategoryId === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>Todos</button>
                    {sale.categories.map(cat => (
                        <button key={cat.id} onClick={() => sale.setSelectedCategoryId(cat.id)} className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap border ${sale.selectedCategoryId === cat.id ? 'bg-amber-400 text-slate-900 border-amber-400' : 'bg-white text-slate-400 border-slate-100'}`}>{cat.nombre}</button>
                    ))}
                </div>
            </div>

            {/* GRILLA DE PRODUCTOS (estilo catálogo web: badges de promo + selector de cantidad) */}
            <div className="flex-1 overflow-y-auto p-3 pb-24">
                <div className="grid grid-cols-2 gap-3">
                    {sale.filteredProducts.slice(0, 60).map(p => {
                        const { finalPrice, originalPrice, isPromo } = sale.getProductBasePrice(p);
                        const promoBadge = sale.getProductPromoBadge(p);
                        const qty = sale.cart.find(i => i.id === p.id)?.quantity || 0;
                        const hasStock = (p.stock || 0) > 0;

                        return (
                            <div key={p.id} className={`bg-white rounded-[1.5rem] p-2.5 border transition-all relative ${hasStock ? (qty > 0 ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-slate-100') : 'border-slate-100 opacity-60 grayscale'}`}>
                                <div className="aspect-square bg-slate-50 rounded-xl relative overflow-hidden mb-2" onClick={() => hasStock && setQtyModalProduct(p)}>
                                    {(p.imgThumb || p.img) ? (
                                        <img src={p.imgThumb || p.img} alt={p.nombre} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200"><PlusIcon className="w-6 h-6" /></div>
                                    )}

                                    {!hasStock && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                                            <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-1 rounded-full -rotate-12 border-2 border-white">AGOTADO</span>
                                        </div>
                                    )}

                                    {hasStock && promoBadge && (
                                        <div className={`absolute top-1.5 left-1.5 ${promoBadge.color} text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-sm`}>
                                            {promoBadge.icon} {promoBadge.text}
                                        </div>
                                    )}
                                    {hasStock && !promoBadge && isPromo && (
                                        <div className="absolute top-1.5 left-1.5 bg-amber-400 text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-sm">OFERTA</div>
                                    )}

                                    {qty > 0 && <div className="absolute bottom-1.5 right-1.5 bg-slate-900 text-amber-400 text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-white">{qty}</div>}
                                </div>

                                <h4 className="text-[11px] font-black text-slate-800 leading-tight line-clamp-2 mb-1 h-[2.2rem]">{p.nombre}</h4>
                                <div className="flex items-baseline gap-1.5 mb-2">
                                    <span className="text-sm font-black text-slate-900">{formatCurrency(finalPrice)}</span>
                                    {isPromo && <span className="text-[10px] text-slate-300 line-through">{formatCurrency(originalPrice)}</span>}
                                </div>
                                <button
                                    onClick={() => hasStock && setQtyModalProduct(p)}
                                    disabled={!hasStock}
                                    className={`w-full py-2 rounded-lg font-black text-[10px] uppercase tracking-wide transition-all active:scale-95 ${!hasStock ? 'bg-slate-100 text-slate-300' : qty > 0 ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-900 text-white'}`}
                                >
                                    {hasStock ? (qty > 0 ? 'Editar Cantidad' : 'Agregar') : 'Sin Stock'}
                                </button>
                            </div>
                        );
                    })}
                </div>
                {sale.filteredProducts.length === 0 && (
                    <div className="text-center py-16 text-slate-300"><p className="text-xs font-black uppercase tracking-widest">Sin productos</p></div>
                )}
            </div>

            {/* BARRA INFERIOR FIJA */}
            <button onClick={() => setIsCartOpen(true)} className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-900 text-white px-5 py-4 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <CartIcon className="w-6 h-6" />
                        {sale.cart.length > 0 && <span className="absolute -top-2 -right-2 bg-amber-400 text-slate-900 text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">{sale.cart.length}</span>}
                    </div>
                    <span className="font-black text-sm">Ver Carrito</span>
                </div>
                <span className="text-lg font-black">{formatCurrency(sale.total)}</span>
            </button>

            {qtyModalProduct && (
                <QtyModal
                    product={qtyModalProduct}
                    initialQty={sale.cart.find(i => i.id === qtyModalProduct.id)?.quantity || 1}
                    onClose={() => setQtyModalProduct(null)}
                    onConfirm={(qty) => { sale.setItemQuantity(qtyModalProduct, qty); setQtyModalProduct(null); }}
                />
            )}
            {isPromoListOpen && <PromoListSheet promotions={sale.promotions} onClose={() => setIsPromoListOpen(false)} />}
            {isFacturacionOpen && (
                <FacturacionMovil
                    clients={sale.clients}
                    zonas={sale.zonas}
                    companyConfig={sale.companyConfig}
                    logo={logo}
                    onClose={() => setIsFacturacionOpen(false)}
                />
            )}
            {isCartOpen && (
                <CartSheet
                    sale={sale}
                    onClose={() => setIsCartOpen(false)}
                    onOpenClient={() => setIsClientOpen(true)}
                    onOpenPayment={() => setIsPaymentOpen(true)}
                />
            )}
            {isClientOpen && (
                <ClientSheet
                    clients={sale.clients}
                    zonas={sale.zonas}
                    selectedClientId={sale.selectedClientId}
                    onSelect={sale.setSelectedClientId}
                    onClose={() => setIsClientOpen(false)}
                />
            )}
            {isPaymentOpen && (
                <PaymentSheet
                    total={sale.total}
                    subtotal={sale.subtotal}
                    descuento={sale.cartTotals.totalDescuentos}
                    selectedClient={sale.selectedClient}
                    companyConfig={sale.companyConfig}
                    onClose={() => setIsPaymentOpen(false)}
                    onConfirm={async (data) => {
                        const ok = await sale.handleConfirmPayment({ ...data, esCuentaCorriente: false });
                        if (ok) { setIsPaymentOpen(false); setIsCartOpen(false); }
                        return ok;
                    }}
                />
            )}
            {sale.isSaving && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl">
                    <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="text-xl font-black text-white text-center px-8">{typeof sale.isSaving === 'string' ? sale.isSaving : 'Procesando Venta...'}</p>
                </div>
            )}

            <style>{`.no-scrollbar::-webkit-scrollbar{display:none;}.animate-fade-in{animation:fadeIn .2s ease-out;}@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}.line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}`}</style>
        </div>
    );
};

export default POSMovil;
