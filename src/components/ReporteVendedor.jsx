import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js'; 
import { collection, onSnapshot, query, orderBy, Timestamp, doc, writeBatch, addDoc, getDocs } from 'firebase/firestore'; 
import { toast } from 'react-toastify';

// --- Iconos SVG ---
const CommissionIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1h10v10"/><path d="M10.9 11.1 1 21"/><path d="M13 18a5 5 0 0 0-5-5c-1.3 0-2.6.5-3.5 1.5l.5.5M17 14a5 5 0 0 0-5-5c-1.3 0-2.6.5-3.5 1.5l.5.5"/></svg>;
const CalendarIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const UserCheckIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>;
const HandCoinsIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="M14 9.4V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5.4"/><path d="M16 16.5c1.2.6 2.5 1 4 1a5 5 0 0 0 5-5c0-1.5-1.3-2.8-3-3"/><path d="M21.2 13.2a1 1 0 0 0-1-1.7l-1.2.6a1 1 0 0 0-.5 1.7l1.2.6a1 1 0 0 0 1.7-.5Z"/></svg>;
const BillIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 5H8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><path d="M12 9v3"/><path d="M12 17h.01"/></svg>;
const ArrowLeft = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const DownloadIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

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

function ReporteVendedor() {
    const [ventas, setVentas] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [error, setError] = useState('');
    const [filterVendedorId, setFilterVendedorId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedVendedorId, setSelectedVendedorId] = useState(null);

    const [productMap, setProductMap] = useState(new Map());
    const [categoriaComisionMap, setCategoriaComisionMap] = useState(new Map());

    useEffect(() => {
        const qVentas = query(collection(db, 'ventas'), orderBy('fecha', 'desc'));
        const unsubscribeVentas = onSnapshot(qVentas, (snapshot) => {
            setVentas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), fecha: doc.data().fecha.toDate() })));
        }, (err) => setError("Error al cargar ventas."));

        const qVendedores = collection(db, 'vendedores');
        const unsubscribeVendedores = onSnapshot(qVendedores, (snapshot) => {
            setVendedores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qClientes = collection(db, 'clientes');
        const unsubscribeClientes = onSnapshot(qClientes, (snapshot) => {
            setClientes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const fetchProductsAndCategories = async () => {
            try {
                const catSnap = await getDocs(collection(db, 'categorias'));
                const catMap = new Map();
                catSnap.forEach(doc => {
                    catMap.set(doc.id, doc.data().comisionGeneral || 0);
                });
                setCategoriaComisionMap(catMap);

                const prodSnap = await getDocs(collection(db, 'productos'));
                const prodMap = new Map();
                prodSnap.forEach(doc => {
                    prodMap.set(doc.id, { id: doc.id, ...doc.data() });
                });
                setProductMap(prodMap);
                
            } catch (err) {
                console.error("Error cargando productos/categorías:", err);
                setError("Error al cargar datos de productos.");
            }
        };
        
        fetchProductsAndCategories();

        return () => { unsubscribeVentas(); unsubscribeVendedores(); unsubscribeClientes(); };
    }, []);

    const reportData = useMemo(() => {
        if (productMap.size === 0 || categoriaComisionMap.size === 0) return [];

        let filteredVentas = ventas.filter(v => v.estado !== 'Anulada');
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start) { start.setHours(0, 0, 0, 0); filteredVentas = filteredVentas.filter(v => v.fecha >= start); }
        if (end) { end.setHours(23, 59, 59, 999); filteredVentas = filteredVentas.filter(v => v.fecha <= end); }
        if (filterVendedorId) filteredVentas = filteredVentas.filter(v => v.vendedorId === filterVendedorId);

        const results = filteredVentas.reduce((acc, venta) => {
            const vendedorId = venta.vendedorId;
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
                    itemsPorRendir: [] // Lista de IDs de cobranzas no rendidas
                };
            }
            
            const esCobranza = venta.tipo === 'cobranza';
            let comisionCorrecta = 0;

            if (esCobranza) {
                const monto = venta.pagoEfectivo || venta.montoCobrado || 0;
                acc[vendedorId].totalCobranza += monto;
                
                // Solo suma a "Efectivo en Mano" si NO ha sido rendido ya
                if (!venta.rendido) {
                    acc[vendedorId].totalEfectivoMano += monto;
                    acc[vendedorId].itemsPorRendir.push(venta);
                }
            } else {
                comisionCorrecta = recalcularComisionVenta(venta.items, productMap, categoriaComisionMap);
                acc[vendedorId].totalVenta += venta.totalVenta || 0;
                acc[vendedorId].totalSaldoPendiente += venta.saldoPendiente || 0;
            }

            const comisionGenerada = (venta.estado === 'Pagada' && !venta.comisionLiquidada && !esCobranza) ? comisionCorrecta : 0;
            acc[vendedorId].comisionALiquidar += comisionGenerada;
            
            venta.comisionRecalculada = comisionCorrecta; 
            acc[vendedorId].ventasDetalle.push(venta);

            return acc;
        }, {});

        return Object.values(results);
    }, [ventas, vendedores, startDate, endDate, filterVendedorId, productMap, categoriaComisionMap]);
    
    const getClientName = (clientId, fallbackName) => {
        const client = clientes.find(c => c.id === clientId);
        return client?.nombre || client?.nombreCompleto || fallbackName || 'Cliente Eliminado';
    };

    // --- NUEVA FUNCIÓN: Rendir el dinero a Caja ---
    const handleRendirDinero = async (vendedorReport) => {
        const { id: vendedorId, nombre, totalEfectivoMano, itemsPorRendir } = vendedorReport;
        
        if (totalEfectivoMano <= 0) {
            toast.info("No hay efectivo pendiente de rendición.");
            return;
        }

        if (!window.confirm(`¿Confirmas la recepción de ${formatCurrency(totalEfectivoMano)} de ${nombre}? Se creará un ingreso en la Caja Diaria y se marcarán los cobros como rendidos.`)) {
            return;
        }

        try {
            const batch = writeBatch(db);

            // 1. Crear el documento de RENDICIÓN (Ingreso en Caja)
            // Nota: 'tipo: rendicion_cobranza' es lo que busca Caja.jsx para sumarlo
            const rendicionRef = doc(collection(db, 'ventas'));
            batch.set(rendicionRef, {
                clientName: `Rendición Cobranzas - ${nombre}`,
                clienteId: 'INTERNAL_RENDICION',
                fecha: Timestamp.now(),
                tipo: 'rendicion_cobranza', // CRÍTICO
                pagoEfectivo: totalEfectivoMano,
                pagoTransferencia: 0,
                totalVenta: totalEfectivoMano,
                estado: 'Pagada',
                vendedorId: vendedorId,
                vendedorNombre: nombre,
                detalleIds: itemsPorRendir.map(i => i.id) // Guardamos qué cobros se rindieron
            });

            // 2. Marcar los cobros individuales como 'rendido: true'
            itemsPorRendir.forEach(item => {
                const itemRef = doc(db, 'ventas', item.id);
                batch.update(itemRef, { rendido: true, fechaRendicion: Timestamp.now() });
            });

            await batch.commit();
            toast.success('¡Dinero ingresado a caja y rendición completada!');
            setSelectedVendedorId(null);

        } catch (err) {
            console.error("Error al rendir dinero:", err);
            toast.error("Error al procesar la rendición.");
        }
    };

    const handleLiquidarComision = async (vendedorReport) => {
        const { id: vendedorId, nombre, comisionALiquidar } = vendedorReport;
        if (comisionALiquidar <= 0) return;

        if (!window.confirm(`¿Confirmas la liquidación de ${formatCurrency(comisionALiquidar)} en comisiones para ${nombre}?`)) return;

        try {
            const gastoData = {
                detalle: `Liquidación de comisiones para ${nombre}`,
                monto: comisionALiquidar,
                fechaGasto: Timestamp.now(),
                metodoPago: 'Efectivo',
                cierreId: null
            };
            await addDoc(collection(db, 'gastos'), gastoData);

            const batch = writeBatch(db);
            vendedorReport.ventasDetalle.forEach(venta => {
                if (venta.estado === 'Pagada' && !venta.comisionLiquidada && venta.tipo !== 'cobranza') {
                    const comisionDeEstaVenta = recalcularComisionVenta(venta.items, productMap, categoriaComisionMap); 
                    if (comisionDeEstaVenta > 0) {
                        batch.update(doc(db, 'ventas', venta.id), { comisionLiquidada: true });
                    }
                }
            });
            await batch.commit();
            toast.success('¡Comisiones liquidadas con éxito!');
            setSelectedVendedorId(null);
        } catch (err) {
            console.error(err);
            toast.error("Error al liquidar.");
        }
    };

    const renderVendedorDetail = () => {
        const vendedorReport = reportData.find(r => r.id === selectedVendedorId);
        if (!vendedorReport) return null;
        
        return (
            <div className="p-4 bg-gray-50 rounded-lg min-h-screen">
                <div className="bg-white p-6 rounded-xl shadow-lg mt-8 border border-indigo-200 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => setSelectedVendedorId(null)} className="flex items-center text-sm font-medium text-gray-600 hover:text-indigo-500 transition-colors">
                            <ArrowLeft className="w-5 h-5 mr-1"/> Volver al Resumen
                        </button>
                    </div>
                    <h3 className="text-2xl font-bold text-indigo-700 mb-4">Detalle de Gestión: {vendedorReport.nombre}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800 font-medium">Efectivo a Rendir (Cobranzas Pendientes):</p>
                            <p className="text-3xl font-extrabold text-blue-900">{formatCurrency(vendedorReport.totalEfectivoMano)}</p>
                            {vendedorReport.totalEfectivoMano > 0 && (
                                <button onClick={() => handleRendirDinero(vendedorReport)} className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 w-full flex justify-center items-center">
                                    <DownloadIcon className="w-4 h-4 mr-2" /> Recibir Dinero
                                </button>
                            )}
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <p className="text-sm text-green-800 font-medium">Comisión Generada (a pagar):</p>
                            <p className="text-3xl font-extrabold text-green-900">{formatCurrency(vendedorReport.comisionALiquidar)}</p>
                            {vendedorReport.comisionALiquidar > 0 && (
                                <button onClick={() => handleLiquidarComision(vendedorReport)} className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow hover:bg-green-700 w-full flex justify-center items-center">
                                    <HandCoinsIcon className="w-4 h-4 mr-2" /> Pagar Comisión
                                </button>
                            )}
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <p className="text-sm text-red-800 font-medium">Fiado (Ctas. Ctes. Generadas):</p>
                            <p className="text-3xl font-extrabold text-red-900">{formatCurrency(vendedorReport.totalSaldoPendiente)}</p>
                        </div>
                    </div>

                    <div className="mt-8">
                        <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center"><BillIcon className="mr-2 text-indigo-600" /> Detalle de Movimientos</h4>
                         <div className="overflow-x-auto border rounded-lg max-h-96">
                                <table className="min-w-full text-sm divide-y divide-gray-200">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 font-semibold text-left text-gray-600">Fecha</th>
                                            <th className="px-4 py-2 font-semibold text-left text-gray-600">Tipo</th>
                                            <th className="px-4 py-2 font-semibold text-left text-gray-600">Cliente</th>
                                            <th className="px-4 py-2 font-semibold text-right text-gray-600">Total Op.</th>
                                            <th className="px-4 py-2 font-semibold text-right text-blue-600">A Rendir</th>
                                            <th className="px-4 py-2 font-semibold text-right text-green-600">Comisión</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {vendedorReport.ventasDetalle.map(venta => {
                                            const esCobro = venta.tipo === 'cobranza';
                                            return (
                                                <tr key={venta.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-gray-600">{venta.fecha.toLocaleDateString('es-AR')}</td>
                                                    <td className="px-4 py-2">
                                                        <span className={`px-2 py-1 text-xs rounded-full font-bold ${esCobro ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                                            {esCobro ? 'COBRANZA' : 'VENTA'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 font-medium text-gray-800">{getClientName(venta.clienteId, venta.clienteNombre)}</td>
                                                    <td className="px-4 py-2 text-right text-gray-800">
                                                        {formatCurrency(esCobro ? (venta.pagoEfectivo || venta.montoCobrado) : venta.totalVenta)}
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-bold text-blue-700">
                                                        {esCobro && !venta.rendido ? formatCurrency(venta.pagoEfectivo || venta.montoCobrado) : (venta.rendido ? <span className="text-gray-400 text-xs">RENDIDO</span> : '-')}
                                                    </td>
                                                    <td className={`px-4 py-2 text-right font-bold ${venta.comisionLiquidada ? 'text-gray-400' : 'text-green-700'}`}>
                                                        {esCobro ? '-' : formatCurrency(venta.comisionRecalculada)}
                                                        {venta.comisionLiquidada && <span className="text-xs text-gray-400"> (Liq.)</span>}
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
        );
    };

    if (selectedVendedorId) return renderVendedorDetail();

    if (productMap.size === 0 || categoriaComisionMap.size === 0) return <div className="p-10 text-center">Cargando sistema...</div>;

    return (
        <div className="p-4 bg-gray-50 rounded-lg min-h-screen">
            <h2 className="text-3xl font-extrabold text-gray-800 mb-6 border-b pb-3"><CommissionIcon className="inline-block mr-2 align-text-bottom"/> Reporte de Vendedores</h2>
            <div className="bg-white p-4 rounded-xl shadow-lg mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]"><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><UserCheckIcon className="mr-1"/> Vendedor</label><select value={filterVendedorId} onChange={e => setFilterVendedorId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500"><option value="">Todos los Vendedores</option>{vendedores.map(v => <option key={v.id} value={v.id}>{v.nombreCompleto}</option>)}</select></div>
                <div className="flex-1 min-w-[150px]"><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><CalendarIcon className="mr-1"/> Fecha Inicio</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500"/></div>
                <div className="flex-1 min-w-[150px]"><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><CalendarIcon className="mr-1"/> Fecha Fin</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500"/></div>
                <button onClick={() => { setFilterVendedorId(''); setStartDate(''); setEndDate(''); setError(''); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Limpiar Filtros</button>
            </div>
            <div className="overflow-x-auto bg-white rounded-xl shadow">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-indigo-600 text-white">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-left uppercase">Vendedor</th>
                            <th className="px-6 py-3 font-semibold text-right uppercase">Ventas</th>
                            <th className="px-6 py-3 font-semibold text-right uppercase bg-indigo-700">Recaudado (Total)</th>
                            <th className="px-6 py-3 font-semibold text-right uppercase bg-indigo-800">A Rendir (Caja)</th>
                            <th className="px-6 py-3 font-semibold text-right uppercase">Comisión</th>
                            <th className="px-6 py-3 font-semibold text-center uppercase">Detalle</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.map((report) => (
                            <tr key={report.id} className="hover:bg-indigo-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900">{report.nombre}</td>
                                <td className="px-6 py-4 text-right font-semibold">{formatCurrency(report.totalVenta)}</td>
                                <td className="px-6 py-4 text-right font-semibold text-purple-700">{formatCurrency(report.totalCobranza)}</td>
                                <td className="px-6 py-4 text-right font-extrabold text-blue-800 border-l border-indigo-100">{formatCurrency(report.totalEfectivoMano)}</td>
                                <td className="px-6 py-4 text-right font-extrabold text-green-700">{formatCurrency(report.comisionALiquidar)}</td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => setSelectedVendedorId(report.id)} className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-100 rounded-full hover:bg-indigo-200 transition-colors">Ver Detalle</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ReporteVendedor;