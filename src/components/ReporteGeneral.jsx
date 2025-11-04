import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../firebase.js'; 
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';

// --- Iconos SVG (Internos) ---
const TrendingUp = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 6 13.5 15.5 10 12 1 21"></polyline><path d="M22 6h-6v6"/></svg>;
const TrendingDown = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>;
const DollarSign = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const Inbox = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;

const RENDER_STATUS = {
    PAGADA: 'Pagada',
    ADEUDA: 'Adeuda',
    REPARTIENDO: 'Repartiendo',
    PENDIENTE: 'Pendiente de Entrega',
    ANULADA: 'Anulada'
};

const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

function ReporteGeneral() {
    const [ventas, setVentas] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'ventas'), orderBy('fecha', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ventasData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                fecha: doc.data().fecha.toDate()
            }));
            setVentas(ventasData);
            setLoading(false);
        }, (err) => {
            console.error("Error al cargar ventas:", err);
            setError("No se pudieron cargar las ventas.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- PRIMER FILTRADO (POR FECHA Y NO ANULADAS) ---
    const ventasFiltradas = useMemo(() => {
        return ventas.filter(venta => {
            if (venta.estado === RENDER_STATUS.ANULADA) {
                return false;
            }
            const ventaDate = venta.fecha;
            if (startDate && new Date(ventaDate) < new Date(startDate + 'T00:00:00')) {
                return false;
            }
            if (endDate && new Date(ventaDate) > new Date(endDate + 'T23:59:59')) {
                return false;
            }
            return true;
        });
    }, [ventas, startDate, endDate]);

    // --- ¡NUEVO! SEGUNDO FILTRADO (POR ESTADO "CONCRETADO") ---
    // Estas son las ventas que SÍ se entregaron y generaron ganancia.
    const ventasConcretadas = useMemo(() => {
        return ventasFiltradas.filter(v => 
            v.estado === RENDER_STATUS.PAGADA || 
            v.estado === RENDER_STATUS.ADEUDA
        );
    }, [ventasFiltradas]);


    // --- LÓGICA DE CÁLCULO (useMemo) MODIFICADA ---
    const {
        totalVentasConcretadas, // ANTES: totalVentasBrutas
        totalGananciaNetaReal,   // ANTES: totalGananciaNeta
        totalAdeudado,
        totalCobrado
    } = useMemo(() => {
        
        // 1. CÁLCULOS SOBRE VENTAS CONCRETADAS (Pagada, Adeuda)
        //    Esto nos da la Venta Real y la Ganancia Real.
        const totalVentasConcretadas = ventasConcretadas.reduce((acc, v) => acc + (v.totalVenta || 0), 0);
        const totalCostosReal = ventasConcretadas.reduce((acc, v) => acc + (v.totalCosto || 0), 0);
        const totalDescuentosReal = ventasConcretadas.reduce((acc, v) => acc + (v.totalDescuentoPromociones || 0), 0);
        const totalComisionesReal = ventasConcretadas.reduce((acc, v) => acc + (v.totalComision || 0), 0);

        // Ganancia Neta Real = Ventas - Costos - Descuentos - Comisiones
        const totalGananciaNetaReal = totalVentasConcretadas - totalCostosReal - totalDescuentosReal - totalComisionesReal;

        // 2. CÁLCULOS DE FLUJO DE CAJA (Cobros y Deudas)
        //    Esto nos dice cuánto dinero entró y cuánto falta.
        
        // Total Cobrado = Suma de (totalVenta - saldoPendiente) de las ventas concretadas.
        const totalCobrado = ventasConcretadas.reduce((acc, v) => acc + ((v.totalVenta || 0) - (v.saldoPendiente || 0)), 0);
        
        // Total Adeudado = Suma de (saldoPendiente) de las ventas concretadas.
        const totalAdeudado = ventasConcretadas.reduce((acc, v) => acc + (v.saldoPendiente || 0), 0);

        return {
            totalVentasConcretadas,
            totalGananciaNetaReal,
            totalAdeudado,
            totalCobrado
        };

    }, [ventasConcretadas]); // Dependemos de las ventas ya filtradas por estado

    if (error) {
        return <div className="p-6 text-red-600">{error}</div>;
    }

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Reporte General</h2>
            
            <div className="bg-white p-6 rounded-xl shadow-lg mb-6 flex flex-wrap gap-4 items-center">
                <h3 className="text-lg font-semibold text-gray-700 mr-4">Filtrar por Fecha</h3>
                <div className="flex-1 min-w-[200px]">
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-500 mb-1">Desde</label>
                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg shadow-sm" />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-500 mb-1">Hasta</label>
                    <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg shadow-sm" />
                </div>
                <button 
                    onClick={() => { setStartDate(''); setEndDate(''); }} 
                    className="mt-6 px-4 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 transition"
                >
                    Limpiar Filtros
                </button>
            </div>
            
            {/* --- TARJETAS DE MÉTRICAS (ACTUALIZADAS) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                
                {/* Tarjeta 1: Ventas Concretadas (Lo real) */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Ventas Concretadas (Real)</p>
                            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalVentasConcretadas)}</p>
                        </div>
                        <span className="p-3 bg-green-100 rounded-full text-green-600"><TrendingUp /></span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Suma de ventas 'Pagadas' y 'Adeuda'.</p>
                </div>

                {/* Tarjeta 2: Ganancia Neta (Lo real) */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Ganancia Neta (Real)</p>
                            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalGananciaNetaReal)}</p>
                        </div>
                        <span className="p-3 bg-green-100 rounded-full text-green-600"><DollarSign /></span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Ganancia sobre ventas concretadas.</p>
                </div>

                {/* Tarjeta 3: Total Cobrado (Lo real) */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Cobrado (Caja)</p>
                            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalCobrado)}</p>
                        </div>
                        <span className="p-3 bg-blue-100 rounded-full text-blue-600"><Inbox /></span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Dinero real que ingresó de ventas concretadas.</p>
                </div>

                {/* Tarjeta 4: Total Adeudado (Lo real) */}
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Adeudado (Real)</p>
                            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalAdeudado)}</p>
                        </div>
                        <span className="p-3 bg-yellow-100 rounded-full text-yellow-600"><TrendingDown /></span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Saldos pendientes de ventas concretadas.</p>
                </div>
            </div>

            {/* --- TABLA DE VENTAS (Muestra 'ventasFiltradas' para ver el detalle completo) --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Detalle de Ventas Generadas (Todas)</h3>
                {loading ? (
                    <p className="text-center text-gray-500 p-8">Cargando datos...</p>
                ) : (
                    <div className="overflow-x-auto max-h-[60vh]">
                        <table className="min-w-full text-sm divide-y divide-gray-200">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Fecha</th>
                                    <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Cliente</th>
                                    <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Vendedor</th>
                                    <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Tipo</th>
                                    <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Estado</th>
                                    <th className="px-6 py-3 font-semibold text-right text-gray-600 uppercase">Total Venta</th>
                                    <th className="px-6 py-3 font-semibold text-right text-gray-600 uppercase">Saldo Pend.</th>
                                    <th className="px-6 py-3 font-semibold text-right text-gray-600 uppercase">Ganancia Bruta</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {ventasFiltradas.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-8 text-center text-gray-500 italic">No se encontraron ventas para el rango de fechas seleccionado.</td>
                                    </tr>
                                )}
                                {ventasFiltradas.map((venta) => (
                                    <tr key={venta.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-700">{venta.fecha.toLocaleDateString('es-AR')}</td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">{venta.clienteNombre || 'N/A'}</td>
                                        <td className="px-6 py-4 text-gray-700">{venta.vendedorNombre || 'N/A'}</td>
                                        <td className="px-6 py-4 text-gray-700">
                                            {/* (Este campo se mostrará cuando lo implementemos al 100%) */}
                                            {venta.tipo === 'reposicion' ? (
                                                <span className="px-2 py-1 text-xs rounded-full font-semibold bg-cyan-100 text-cyan-800">
                                                    REPOSICIÓN
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">Venta</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                venta.estado === RENDER_STATUS.PAGADA ? 'bg-green-100 text-green-800' :
                                                venta.estado === RENDER_STATUS.ADEUDA ? 'bg-yellow-100 text-yellow-800' :
                                                venta.estado === RENDER_STATUS.REPARTIENDO ? 'bg-indigo-100 text-indigo-800' :
                                                venta.estado === RENDER_STATUS.PENDIENTE ? 'bg-gray-200 text-gray-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {venta.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">{formatCurrency(venta.totalVenta)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-red-700">{formatCurrency(venta.saldoPendiente)}</td>
                                        {/* (Nota: Esta ganancia bruta no resta comisiones ni descuentos, es Venta - Costo) */}
                                        <td className="px-6 py-4 text-right font-bold text-gray-700">{formatCurrency(venta.totalVenta - venta.totalCosto)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReporteGeneral;