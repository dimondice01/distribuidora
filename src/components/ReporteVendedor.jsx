import React, { useState, useEffect, useMemo } from 'react';
import { Timestamp, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js'; 
import { toast } from 'react-toastify';
import Button from './Button'; 
import { useFirestore } from '../hooks/useFirestore';
// --- Iconos SVG (Estilo Lineal Premium) ---
const CommissionIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1h10v10"/><path d="M10.9 11.1 1 21"/><path d="M13 18a5 5 0 0 0-5-5c-1.3 0-2.6.5-3.5 1.5l.5.5M17 14a5 5 0 0 0-5-5c-1.3 0-2.6.5-3.5 1.5l.5.5"/></svg>;
const CalendarIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const UserCheckIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>;
const HandCoinsIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="M14 9.4V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5.4"/><path d="M16 16.5c1.2.6 2.5 1 4 1a5 5 0 0 0 5-5c0-1.5-1.3-2.8-3-3"/><path d="M21.2 13.2a1 1 0 0 0-1-1.7l-1.2.6a1 1 0 0 0-.5 1.7l1.2.6a1 1 0 0 0 1.7-.5Z"/></svg>;
const BillIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 5H8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><path d="M12 9v3"/><path d="M12 17h.01"/></svg>;
const ArrowLeft = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const DownloadIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const XIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

const recalcularComisionVenta = (items = [], productMap, categoriaComisionMap) => {
    if (!items || !Array.isArray(items)) return 0;

    return items.reduce((total, item) => {
        const productId = item.productId || item.id; 
        if (!productId) return total;

        const product = productMap.get(productId);
        if (!product) return total; 

        const catComision = categoriaComisionMap.get(product.categoriaId) || 0;
        const effectiveCommissionPct = product.comisionEspecifica ?? catComision;
        
        const itemTotal = (item.precio || 0) * (item.quantity || 0);
        const comisionItem = itemTotal * (effectiveCommissionPct / 100);
        
        return total + comisionItem;
    }, 0);
};

// --- Componente Modal de Pago ---
const PaymentMethodModal = ({ isOpen, onClose, onConfirm, amount, type }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{type === 'liquidacion' ? 'Liquidar Comisión' : 'Recibir Dinero'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon/></button>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                    Selecciona el método de pago para registrar {type === 'liquidacion' ? 'el egreso' : 'el ingreso'} de <span className="font-bold text-gray-900">{formatCurrency(amount)}</span>.
                </p>
                <div className="space-y-3">
                    <button onClick={() => onConfirm('Efectivo')} className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl border border-emerald-200 transition-all flex justify-between items-center">
                        <span>Efectivo</span>
                        <span className="text-xl">💵</span>
                    </button>
                    <button onClick={() => onConfirm('Transferencia')} className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl border border-blue-200 transition-all flex justify-between items-center">
                        <span>Transferencia</span>
                        <span className="text-xl">🏦</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

function ReporteVendedor() {
    const { tenantId, onTenantSnapshot, addTenantDoc, getTenantCollection, getTenantDoc, db } = useFirestore();
    const [ventas, setVentas] = useState([]);
    const [cobranzas, setCobranzas] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [error, setError] = useState('');
    const [filterVendedorId, setFilterVendedorId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedVendedorId, setSelectedVendedorId] = useState(null);

    const [productMap, setProductMap] = useState(new Map());
    const [categoriaComisionMap, setCategoriaComisionMap] = useState(new Map());

    // --- Estados para Modales ---
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(null); 
    const [activeVendedorReport, setActiveVendedorReport] = useState(null);
    const [dataLoaded, setDataLoaded] = useState(false);

    useEffect(() => {
        if (!tenantId) return;

        const uVentas = onTenantSnapshot('ventas', (s) => {
            setVentas(s.docs.map(doc => ({ id: doc.id, ...doc.data(), fecha: doc.data().fecha?.toDate() || new Date() })));
        }, [{ field: 'fecha', direction: 'desc' }]);

        const uCobranzas = onTenantSnapshot('cobranzas', (s) => {
            setCobranzas(s.docs.map(doc => ({ id: doc.id, ...doc.data(), fecha: doc.data().fecha?.toDate() || new Date(), tipox: 'cobranza' })));
        }, [{ field: 'fecha', direction: 'desc' }]);

        const uVendedores = onTenantSnapshot('vendedores', (s) => {
            setVendedores(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const uClientes = onTenantSnapshot('clientes', (s) => {
            setClientes(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const fetchPC = async () => {
            try {
                const qCat = getTenantCollection('categorias');
                const catSnap = await getDocs(qCat);
                const cMap = new Map();
                catSnap.forEach(d => cMap.set(d.id, d.data().comisionGeneral || 0));
                setCategoriaComisionMap(cMap);

                const qProd = getTenantCollection('productos');
                const prodSnap = await getDocs(qProd);
                const pMap = new Map();
                prodSnap.forEach(d => pMap.set(d.id, { id: d.id, ...d.data() }));
                setProductMap(pMap);
                
                setDataLoaded(true);
            } catch (err) {
                console.error("Error cargando parámetros de reporte:", err);
                setError("Error al cargar datos operativos.");
                setDataLoaded(true); // Permitir ver la página aunque fallen los mapas
            }
        };
        fetchPC();

        return () => { uVentas(); uCobranzas(); uVendedores(); uClientes(); };
    }, [tenantId]);

    const reportData = useMemo(() => {
        if (productMap.size === 0 || categoriaComisionMap.size === 0) return [];

        // Combinar ventas y cobranzas para el procesamiento
        const allMovements = [
            ...ventas.filter(v => v.estado !== 'Anulada').map(v => ({ ...v, tipox: 'venta' })),
            ...cobranzas.map(c => ({ ...c, tipox: 'cobranza', totalVenta: 0 }))
        ];

        let filteredMovements = allMovements;
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) { start.setHours(0, 0, 0, 0); filteredMovements = filteredMovements.filter(v => v.fecha >= start); }
        if (end) { end.setHours(23, 59, 59, 999); filteredMovements = filteredMovements.filter(v => v.fecha <= end); }
        if (filterVendedorId) filteredMovements = filteredMovements.filter(v => v.vendedorId === filterVendedorId);

        const results = filteredMovements.reduce((acc, mov) => {
            const vendedorId = mov.vendedorId;
            if (!vendedorId) return acc;

            if (!acc[vendedorId]) {
                const vendedor = vendedores.find(v => v.id === vendedorId);
                acc[vendedorId] = { 
                    id: vendedorId, 
                    nombre: vendedor?.nombreCompleto || vendedor?.nombre || 'Vendedor Desconocido', 
                    totalVenta: 0, 
                    totalCobranza: 0, 
                    totalEfectivoMano: 0, 
                    comisionALiquidar: 0, 
                    totalSaldoPendiente: 0, 
                    ventasDetalle: [],
                    itemsPorRendir: [] 
                };
            }
            
            const esCobranza = mov.tipox === 'cobranza' || mov.tipo === 'cobranza';
            let comisionCorrecta = 0;

            if (esCobranza) {
                const monto = mov.monto || mov.pagoEfectivo || mov.montoCobrado || 0;
                acc[vendedorId].totalCobranza += monto;
                
                // Si es efectivo y no está rendido, sumamos a efectivo en mano
                if ((mov.metodoPago === 'Efectivo' || !mov.metodoPago) && !mov.rendido) {
                    acc[vendedorId].totalEfectivoMano += monto;
                    acc[vendedorId].itemsPorRendir.push(mov);
                }
            } else {
                comisionCorrecta = recalcularComisionVenta(mov.items, productMap, categoriaComisionMap);
                acc[vendedorId].totalVenta += mov.totalVenta || 0;
                acc[vendedorId].totalSaldoPendiente += mov.saldoPendiente || 0;
            }

            // Solo sumamos al total LIQUIDABLE si está 'Pagada'. 
            const esPagadaTotalmente = mov.estado === 'Pagada';
            const comisionGenerada = (esPagadaTotalmente && !mov.comisionLiquidada && !esCobranza) ? comisionCorrecta : 0;
            
            acc[vendedorId].comisionALiquidar += comisionGenerada;
            
            mov.comisionRecalculada = comisionCorrecta; 
            acc[vendedorId].ventasDetalle.push(mov);

            return acc;
        }, {});

        return Object.values(results);
    }, [ventas, cobranzas, vendedores, startDate, endDate, filterVendedorId, productMap, categoriaComisionMap]);
    
    const getClientName = (clientId, fallbackName) => {
        const client = clientes.find(c => c.id === clientId);
        return client?.nombre || client?.nombreCompleto || fallbackName || 'Cliente Eliminado';
    };

    const openRendicionModal = (vendedorReport) => {
        if (vendedorReport.totalEfectivoMano <= 0) return toast.info("No hay efectivo pendiente.");
        setActiveVendedorReport(vendedorReport);
        setModalType('rendicion');
        setModalOpen(true);
    };

    const openLiquidacionModal = (vendedorReport) => {
        if (vendedorReport.comisionALiquidar <= 0) return toast.info("No hay comisiones pendientes.");
        setActiveVendedorReport(vendedorReport);
        setModalType('liquidacion');
        setModalOpen(true);
    };

    const processTransaction = async (method) => {
        setModalOpen(false);
        if (!activeVendedorReport) return;

        if (modalType === 'rendicion') {
            const { id: vendedorId, nombre, totalEfectivoMano, itemsPorRendir } = activeVendedorReport;
            try {
                const batch = writeBatch(db);
                const rendicionRef = doc(getTenantCollection('ventas'));
                
                batch.set(rendicionRef, {
                    clientName: `Rendición Cobranzas - ${nombre}`,
                    clienteId: 'INTERNAL_RENDICION',
                    fecha: Timestamp.now(),
                    tipo: 'rendicion_cobranza',
                    pagoEfectivo: method === 'Efectivo' ? totalEfectivoMano : 0,
                    pagoTransferencia: method === 'Transferencia' ? totalEfectivoMano : 0,
                    totalVenta: totalEfectivoMano,
                    estado: 'Pagada',
                    vendedorId: vendedorId,
                    vendedorNombre: nombre,
                    detalleIds: itemsPorRendir.map(i => i.id)
                });

                itemsPorRendir.forEach(item => {
                    const itemRef = getTenantDoc('ventas', item.id);
                    batch.update(itemRef, { rendido: true, fechaRendicion: Timestamp.now() });
                });

                batch.commit();
                toast.success(`Rendición registrada como ${method}.`);
                setSelectedVendedorId(null);
                setActiveVendedorReport(null);
            } catch (err) {
                console.error(err);
                toast.error("Error al rendir.");
            }

        } else if (modalType === 'liquidacion') {
            const { id: vendedorId, nombre, comisionALiquidar, ventasDetalle } = activeVendedorReport;
            try {
                const gastoData = {
                    detalle: `Liquidación de comisiones para ${nombre}`,
                    monto: comisionALiquidar,
                    fechaGasto: Timestamp.now(),
                    metodoPago: method,
                    cierreId: null
                };
                await addTenantDoc('gastos', gastoData);

                const batch = writeBatch(db);
                ventasDetalle.forEach(venta => {
                    if (venta.estado === 'Pagada' && !venta.comisionLiquidada && venta.tipo !== 'cobranza') {
                        const comisionDeEstaVenta = recalcularComisionVenta(venta.items, productMap, categoriaComisionMap); 
                        if (comisionDeEstaVenta > 0) {
                            batch.update(getTenantDoc('ventas', venta.id), { comisionLiquidada: true });
                        }
                    }
                });
                batch.commit();
                toast.success(`Comisión liquidada mediante ${method}.`);
                setSelectedVendedorId(null);
                setActiveVendedorReport(null);
            } catch (err) {
                console.error(err);
                toast.error("Error al liquidar.");
            }
        }
    };

    const renderVendedorDetail = () => {
        const vendedorReport = reportData.find(r => r.id === selectedVendedorId);
        if (!vendedorReport) return null;
        
        return (
            <div className="p-6 bg-gray-50 min-h-screen">
                <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
                    <div className="bg-indigo-600 p-6 flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-white">Detalle de Gestión: {vendedorReport.nombre}</h3>
                        <button onClick={() => setSelectedVendedorId(null)} className="flex items-center text-sm font-medium text-white/80 hover:text-white bg-white/10 px-4 py-2 rounded-lg transition-all">
                            <ArrowLeft className="w-5 h-5 mr-2"/> Volver
                        </button>
                    </div>
                    
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            {/* Card 1: A Rendir */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg flex flex-col justify-between hover:shadow-xl transition-shadow">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Efectivo a Rendir</p>
                                    <p className="text-3xl font-extrabold text-gray-900">{formatCurrency(vendedorReport.totalEfectivoMano)}</p>
                                </div>
                                {vendedorReport.totalEfectivoMano > 0 && (
                                    <button onClick={() => openRendicionModal(vendedorReport)} className="mt-4 w-full py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-colors flex justify-center items-center gap-2">
                                        <DownloadIcon className="w-5 h-5" /> Recibir Dinero
                                    </button>
                                )}
                            </div>

                            {/* Card 2: Comisiones */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg flex flex-col justify-between hover:shadow-xl transition-shadow">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Comisión a Pagar</p>
                                    <p className="text-3xl font-extrabold text-emerald-600">{formatCurrency(vendedorReport.comisionALiquidar)}</p>
                                </div>
                                {vendedorReport.comisionALiquidar > 0 && (
                                    <button onClick={() => openLiquidacionModal(vendedorReport)} className="mt-4 w-full py-3 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-colors flex justify-center items-center gap-2">
                                        <HandCoinsIcon className="w-5 h-5" /> Pagar Comisión
                                    </button>
                                )}
                            </div>

                            {/* Card 3: Fiado */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg flex flex-col justify-center hover:shadow-xl transition-shadow">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Total Deudas (Ctas. Ctes.)</p>
                                <p className="text-3xl font-extrabold text-rose-600">{formatCurrency(vendedorReport.totalSaldoPendiente)}</p>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-8">
                            <h4 className="text-lg font-bold text-gray-800 mb-6 flex items-center"><BillIcon className="mr-2 text-indigo-500" /> Detalle de Movimientos</h4>
                            <div className="overflow-hidden rounded-xl border border-gray-200">
                                <table className="min-w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3">Fecha</th>
                                            <th className="px-6 py-3">Tipo</th>
                                            <th className="px-6 py-3">Cliente</th>
                                            <th className="px-6 py-3 text-right">Monto Op.</th>
                                            <th className="px-6 py-3 text-right text-indigo-600">A Rendir</th>
                                            <th className="px-6 py-3 text-right text-emerald-600">Comisión</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {vendedorReport.ventasDetalle.map((venta, idx) => {
                                            const esCobro = venta.tipo === 'cobranza';
                                            const esPagada = venta.estado === 'Pagada';
                                            const comisionTexto = esCobro ? '-' : (
                                                venta.comisionLiquidada ? <span className="text-gray-400 text-xs font-normal">PAGADA</span> 
                                                : esPagada ? <span className="text-emerald-600 font-bold">{formatCurrency(venta.comisionRecalculada)}</span>
                                                : <span className="text-orange-500 font-medium text-xs">{formatCurrency(venta.comisionRecalculada)} (Pend. Cobro)</span>
                                            );

                                            return (
                                                <tr key={venta.id} className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                                    <td className="px-6 py-4 text-gray-600 font-medium">{venta.fecha.toLocaleDateString('es-AR')}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${esCobro ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                            {esCobro ? 'COBRANZA' : 'VENTA'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-gray-800">{getClientName(venta.clienteId, venta.clienteNombre)}</td>
                                                    <td className="px-6 py-4 text-right text-gray-700 font-medium">
                                                        {formatCurrency(esCobro ? (venta.monto || venta.pagoEfectivo || venta.montoCobrado) : venta.totalVenta)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-indigo-600">
                                                        {esCobro && !venta.rendido ? formatCurrency(venta.monto || venta.pagoEfectivo || venta.montoCobrado) : (venta.rendido ? <span className="text-gray-400 text-xs font-normal">RENDIDO</span> : '-')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {comisionTexto}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (selectedVendedorId) return (
        <>
            {renderVendedorDetail()}
            <PaymentMethodModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                amount={activeVendedorReport ? (modalType === 'liquidacion' ? activeVendedorReport.comisionALiquidar : activeVendedorReport.totalEfectivoMano) : 0}
                type={modalType}
                onConfirm={processTransaction}
            />
        </>
    );

    if (!dataLoaded) return <div className="flex h-screen items-center justify-center text-gray-400 animate-pulse">Cargando sistema...</div>;

    return (
        <div className="p-8 bg-gray-50 min-h-screen font-sans text-gray-800">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-8 flex items-center"><CommissionIcon className="mr-3 text-indigo-600"/> Reporte de Vendedores</h2>
            
            {/* Filtros */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-6 items-end">
                <div className="flex-1 min-w-[220px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center"><UserCheckIcon className="w-4 h-4 mr-1"/> Vendedor</label>
                    <select value={filterVendedorId} onChange={e => setFilterVendedorId(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                        <option value="">Todos los Vendedores</option>
                        {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombreCompleto}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center"><CalendarIcon className="w-4 h-4 mr-1"/> Desde</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
                </div>
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center"><CalendarIcon className="w-4 h-4 mr-1"/> Hasta</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
                </div>
                <button onClick={() => { setFilterVendedorId(''); setStartDate(''); setEndDate(''); setError(''); }} className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                    Limpiar
                </button>
            </div>

            {/* Tabla General */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm divide-y divide-gray-100">
                        <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-4 text-left">Vendedor</th>
                                <th className="px-6 py-4 text-right">Ventas Totales</th>
                                <th className="px-6 py-4 text-right text-purple-600">Cobranzas</th>
                                <th className="px-6 py-4 text-right text-indigo-600">A Rendir (Caja)</th>
                                <th className="px-6 py-4 text-right text-emerald-600">Comisión</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {reportData.map((report) => (
                                <tr key={report.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-gray-900">{report.nombre}</td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-600">{formatCurrency(report.totalVenta)}</td>
                                    <td className="px-6 py-4 text-right font-medium text-purple-600">{formatCurrency(report.totalCobranza)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-indigo-700 bg-indigo-50/30 rounded-l-lg">{formatCurrency(report.totalEfectivoMano)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600 bg-emerald-50/30 rounded-r-lg">{formatCurrency(report.comisionALiquidar)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => setSelectedVendedorId(report.id)} className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors shadow-sm">
                                            Ver Detalle
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {reportData.length === 0 && (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-400 italic">No se encontraron datos para los filtros seleccionados.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ReporteVendedor;