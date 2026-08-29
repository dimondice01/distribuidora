import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { printTicket58mm } from '../../utils/printTicket58mm';

// --- ICONOS (mismo patrón que POSMovil.jsx) ---
const Icono = ({ path, className = "w-5 h-5", d2 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
    </svg>
);
const SearchIcon = (p) => <Icono {...p} path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />;
const CloseIcon = (p) => <Icono {...p} path="M6 18L18 6M6 6l12 12" />;
const PrinterIcon = (p) => <Icono {...p} path="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />;
const DocIcon = (p) => <Icono {...p} path="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />;
const CheckIcon = (p) => <Icono {...p} path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;

const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

const toDate = (fecha) => fecha?.toDate ? fecha.toDate() : (fecha instanceof Date ? fecha : new Date());

const ESTADO_STYLES = {
    'Pagada': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Entregada': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Adeuda': 'bg-rose-50 text-rose-600 border-rose-200',
    'Pendiente de Entrega': 'bg-amber-50 text-amber-600 border-amber-200',
    'Repartiendo': 'bg-blue-50 text-blue-600 border-blue-200',
};

// --- DETALLE DE COMPROBANTE (solo lectura + imprimir/reimprimir) ---
const VentaDetailSheet = ({ venta, clientDetails, zonaNombre, companyConfig, logo, onClose }) => {
    const fecha = toDate(venta.fecha);
    const tieneCAE = !!venta.afipCAE;
    const letra = tieneCAE ? (venta.afipLetra || 'C') : null;
    const numeroComprobante = venta.afipNumeroComprobante
        ? `${String(companyConfig?.ptoVta || 1).padStart(5, '0')}-${String(venta.afipNumeroComprobante).padStart(8, '0')}`
        : null;

    const handlePrint = () => {
        const saleToPrint = {
            ...venta,
            companyInfo: {
                logo: logo || companyConfig?.logo,
                name: companyConfig?.name,
                nombreFantasia: companyConfig?.nombreFantasia || companyConfig?.name,
                razonSocial: companyConfig?.razonSocial,
                domicilioFiscal: companyConfig?.domicilioFiscal,
                taxCondition: companyConfig?.taxCondition,
                cuit: companyConfig?.cuit,
                iibb: companyConfig?.iibb,
                inicioActividades: companyConfig?.inicioActividades,
                ptoVta: companyConfig?.ptoVta,
            }
        };
        printTicket58mm(saleToPrint, clientDetails, zonaNombre);
    };

    return (
        <div className="fixed inset-0 z-[195] bg-white flex flex-col animate-fade-in">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="text-base font-black tracking-tight">{tieneCAE ? `Factura ${letra}` : 'Remito'}</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {numeroComprobante || `Comp. #${(venta.id || '').slice(-6).toUpperCase()}`}
                    </p>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-200 rounded-full"><CloseIcon className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                    <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">Fecha</span><span className="font-black text-slate-700">{fecha.toLocaleDateString('es-AR')} {fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">Cliente</span><span className="font-black text-slate-700 text-right">{venta.clienteNombre || 'Consumidor Final'}</span></div>
                    {venta.clienteCuit && <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">CUIT/DNI</span><span className="font-black text-slate-700">{venta.clienteCuit}</span></div>}
                    <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold">Vendedor</span><span className="font-black text-slate-700 text-right">{venta.vendedorNombre || 'N/A'}</span></div>
                    <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-slate-400 font-bold">Estado</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${ESTADO_STYLES[venta.estado] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{venta.estado || 'N/A'}</span>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Items</p>
                    <div className="space-y-2">
                        {(venta.items || []).map((item, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black text-slate-800 truncate">{item.nombre}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{item.quantity} x {item.esRegalo ? 'GRATIS' : formatCurrency(item.precio)}</p>
                                </div>
                                <p className="text-xs font-black text-slate-700">{item.esRegalo ? 'GRATIS' : formatCurrency(item.precio * item.quantity)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-1.5">
                    {(venta.descuentoPromociones || 0) > 0 && (
                        <>
                            <div className="flex justify-between text-[11px]"><span className="text-slate-400 font-bold">Subtotal</span><span className="text-slate-300 font-bold">{formatCurrency(venta.totalVenta + venta.descuentoPromociones)}</span></div>
                            <div className="flex justify-between text-[11px]"><span className="text-emerald-400 font-black">Descuento promos</span><span className="text-emerald-400 font-black">-{formatCurrency(venta.descuentoPromociones)}</span></div>
                        </>
                    )}
                    <div className="flex justify-between items-center pt-1"><span className="text-amber-400 font-black text-[10px] uppercase tracking-widest">Total</span><span className="text-xl font-black">{formatCurrency(venta.totalVenta)}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {venta.pagoEfectivo > 0 && <div className="bg-slate-50 border border-slate-100 rounded-xl p-3"><p className="text-[9px] text-slate-400 font-black uppercase">Efectivo</p><p className="text-sm font-black text-slate-700">{formatCurrency(venta.pagoEfectivo)}</p></div>}
                    {venta.pagoTransferencia > 0 && <div className="bg-slate-50 border border-slate-100 rounded-xl p-3"><p className="text-[9px] text-slate-400 font-black uppercase">Transferencia</p><p className="text-sm font-black text-slate-700">{formatCurrency(venta.pagoTransferencia)}</p></div>}
                    {venta.pagoTarjeta > 0 && <div className="bg-slate-50 border border-slate-100 rounded-xl p-3"><p className="text-[9px] text-slate-400 font-black uppercase">Tarjeta</p><p className="text-sm font-black text-slate-700">{formatCurrency(venta.pagoTarjeta)}</p></div>}
                    {venta.saldoPendiente > 0 && <div className="bg-rose-50 border border-rose-100 rounded-xl p-3"><p className="text-[9px] text-rose-400 font-black uppercase">Saldo Pendiente</p><p className="text-sm font-black text-rose-600">{formatCurrency(venta.saldoPendiente)}</p></div>}
                </div>

                {tieneCAE && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-2">
                        <CheckIcon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">CAE Autorizado</p>
                            <p className="text-xs font-bold text-indigo-700 truncate">{venta.afipCAE}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-5 border-t bg-white flex-shrink-0">
                <button onClick={handlePrint}
                    className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                    <PrinterIcon className="w-5 h-5 text-amber-400" /> {tieneCAE || venta.origen === 'pos_movil' ? 'REIMPRIMIR TICKET' : 'IMPRIMIR TICKET'}
                </button>
            </div>
        </div>
    );
};

// --- LISTADO DE FACTURAS (pantalla completa, solo lectura) ---
const FacturacionMovil = ({ clients, zonas, companyConfig, logo, onClose }) => {
    const { tenantId, onTenantSnapshotFiltered } = useFirestore();
    const [ventas, setVentas] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedVenta, setSelectedVenta] = useState(null);

    useEffect(() => {
        if (!tenantId) return;
        const unsub = onTenantSnapshotFiltered('ventas', (snap) => {
            setVentas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, { orders: [{ field: 'fecha', direction: 'desc' }], limitCount: 150 });
        return () => unsub();
    }, [tenantId, onTenantSnapshotFiltered]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return ventas;
        return ventas.filter(v =>
            (v.clienteNombre || '').toLowerCase().includes(term) ||
            (v.id || '').toLowerCase().includes(term) ||
            (v.afipNumeroComprobante ? String(v.afipNumeroComprobante) : '').includes(term)
        );
    }, [ventas, search]);

    const resolveClientAndZona = (venta) => {
        const clientDetails = clients.find(c => c.id === venta.clienteId) || {};
        const zonaId = venta.clienteZonaId || clientDetails.zonaId;
        const zonaNombre = zonas.find(z => z.id === zonaId)?.nombre || '';
        return { clientDetails, zonaNombre };
    };

    return (
        <div className="fixed inset-0 z-[190] bg-white flex flex-col animate-fade-in">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2"><DocIcon className="w-5 h-5 text-slate-500" /><h2 className="text-base font-black tracking-tight">Facturación</h2></div>
                <button onClick={onClose} className="p-2 bg-slate-200 rounded-full"><CloseIcon className="w-4 h-4" /></button>
            </div>

            <div className="p-3 flex-shrink-0 bg-white border-b border-slate-100">
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
                    <input type="text" placeholder="Buscar por cliente o comprobante..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-amber-400" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-16">
                        <DocIcon className="w-14 h-14 mb-3" />
                        <p className="font-black uppercase tracking-widest text-xs">Sin comprobantes</p>
                    </div>
                ) : filtered.map(venta => {
                    const fecha = toDate(venta.fecha);
                    const tieneCAE = !!venta.afipCAE;
                    return (
                        <button key={venta.id} onClick={() => setSelectedVenta(venta)}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 text-left active:scale-[0.98] transition-all">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${tieneCAE ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                <DocIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <h4 className="text-xs font-black text-slate-800 truncate">{venta.clienteNombre || 'Consumidor Final'}</h4>
                                    {tieneCAE && <span className="text-[8px] font-black px-1.5 py-0.5 bg-indigo-600 text-white rounded flex-shrink-0">FACT. {venta.afipLetra}</span>}
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold">{fecha.toLocaleDateString('es-AR')} {fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-sm font-black text-slate-800">{formatCurrency(venta.totalVenta)}</p>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${ESTADO_STYLES[venta.estado] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{venta.estado || 'N/A'}</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {selectedVenta && (() => {
                const { clientDetails, zonaNombre } = resolveClientAndZona(selectedVenta);
                return (
                    <VentaDetailSheet
                        venta={selectedVenta}
                        clientDetails={clientDetails}
                        zonaNombre={zonaNombre}
                        companyConfig={companyConfig}
                        logo={logo}
                        onClose={() => setSelectedVenta(null)}
                    />
                );
            })()}

            <style>{`.animate-fade-in{animation:fadeIn .2s ease-out;}@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}`}</style>
        </div>
    );
};

export default FacturacionMovil;
