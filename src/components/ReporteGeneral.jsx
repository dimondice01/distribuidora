import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../firebase.js'; 
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';

// --- Iconos SVG (Internos) ---
const TrendingUp = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 6 13.5 15.5 10 12 1 21"></polyline><path d="M22 6h-6v6"/></svg>;
const TrendingDown = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>;
const DollarSign = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const CreditCard = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
// --- CAMBIO: Icono para Devoluciones ---
const RefreshCw = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;


// --- Constantes (Sin cambios) ---
const RENDER_STATUS = {
    PAGADA: 'Pagada',
    ADEUDA: 'Adeuda',
    PENDIENTE: 'Pendiente de Entrega',
    REPARTIENDO: 'Repartiendo',
    ANULADA: 'Anulada',
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);
};

function ReporteGeneral() {
    const [ventas, setVentas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return Timestamp.fromDate(d);
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        return Timestamp.fromDate(d);
    });

    // ==================================================================
    // --- CAMBIO: Lógica de 'useMemo' para separar Ventas y Devoluciones ---
    // ==================================================================
    const {
        totalVenta,
        totalCosto,
        totalDeuda,
        gananciaBruta,
        totalCostoDevoluciones,
        cantidadDevoluciones
    } = useMemo(() => {
        
        const { 
            totalVenta, 
            totalCosto, 
            totalDeuda, 
            totalCostoDevoluciones, 
            cantidadDevoluciones 
        } = ventas.reduce((acc, v) => {
            const costo = v.totalCosto || 0;
            const venta = v.totalVenta || 0;
            const saldo = v.saldoPendiente || 0;

            if (v.tipo === 'devolucion') {
                // Es una devolución: Suma al costo de devoluciones
                acc.totalCostoDevoluciones += costo;
                acc.cantidadDevoluciones += 1;
            } else if (v.estado !== RENDER_STATUS.ANULADA) {
                // Es una Venta, Reposición o Antigua (que no esté Anulada)
                acc.totalVenta += venta;
                acc.totalCosto += costo;
                acc.totalDeuda += saldo;
            }
            
            return acc;
        }, {
            totalVenta: 0,
            totalCosto: 0,
            totalDeuda: 0,
            totalCostoDevoluciones: 0,
            cantidadDevoluciones: 0
        });

        // La Ganancia Bruta ahora resta el costo de las devoluciones
        const gananciaBruta = totalVenta - totalCosto - totalCostoDevoluciones;

        return { totalVenta, totalCosto, totalDeuda, gananciaBruta, totalCostoDevoluciones, cantidadDevoluciones };

    }, [ventas]);
    // ==================================================================
    // --- FIN DEL CAMBIO en 'useMemo' ---
    // ==================================================================


    useEffect(() => {
        setIsLoading(true);
        const q = query(
            collection(db, "ventas"),
            orderBy("fecha", "desc"),
            // (Mantenemos la lógica de filtrado de fechas)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const ventasData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const fechaVenta = data.fecha; 
                
                if (fechaVenta && fechaVenta >= startDate && fechaVenta <= endDate) {
                    ventasData.push({
                        id: doc.id,
                        ...data,
                        fecha: fechaVenta.toDate ? fechaVenta.toDate() : new Date(fechaVenta),
                    });
                }
            });
            setVentas(ventasData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error al obtener ventas: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [startDate, endDate]);


    const handleDateChange = (e) => {
        const { name, value } = e.target;
        const [year, month, day] = value.split('-').map(Number);
        
        if (name === 'startDate') {
            const newStartDate = new Date(year, month - 1, day, 0, 0, 0, 0);
            setStartDate(Timestamp.fromDate(newStartDate));
        } else if (name === 'endDate') {
            const newEndDate = new Date(year, month - 1, day, 23, 59, 59, 999);
            setEndDate(Timestamp.fromDate(newEndDate));
        }
    };

    // --- Función de formato de fecha para los inputs (sin cambios) ---
    const formatDateForInput = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate(); 
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };


    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Reporte General</h1>
                
                {/* Controles de Fecha (sin cambios) */}
                <div className="mb-6 p-4 bg-white rounded-lg shadow flex items-center space-x-4">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Desde</label>
                        <input
                            type="date"
                            name="startDate"
                            id="startDate"
                            value={formatDateForInput(startDate)}
                            onChange={handleDateChange}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Hasta</label>
                        <input
                            type="date"
                            name="endDate"
                            id="endDate"
                            value={formatDateForInput(endDate)}
                            onChange={handleDateChange}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                        />
                    </div>
                </div>

                {/* Tarjetas de Resumen */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
                    {/* Tarjeta 1: Total Venta (Modificada) */}
                    <div className="bg-white rounded-lg shadow p-5 flex items-center space-x-4">
                        <div className="p-3 rounded-full bg-green-100 text-green-600"><TrendingUp /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Ventas (Neto)</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalVenta)}</p>
                        </div>
                    </div>
                    {/* Tarjeta 2: Ganancia Bruta (Modificada) */}
                    <div className="bg-white rounded-lg shadow p-5 flex items-center space-x-4">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600"><DollarSign /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Ganancia Bruta</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(gananciaBruta)}</p>
                        </div>
                    </div>
                    {/* Tarjeta 3: Deuda (Modificada) */}
                    <div className="bg-white rounded-lg shadow p-5 flex items-center space-x-4">
                        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600"><CreditCard /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Saldo Pendiente (Deuda)</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalDeuda)}</p>
                        </div>
                    </div>
                    
                    {/* ================================================== */}
                    {/* --- CAMBIO: Nueva Tarjeta de Devoluciones --- */}
                    {/* ================================================== */}
                    <div className="bg-white rounded-lg shadow p-5 flex items-center space-x-4">
                        <div className="p-3 rounded-full bg-red-100 text-red-600"><RefreshCw /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Costo Devoluciones</p>
                            <p className="text-2xl font-bold text-red-700">{formatCurrency(totalCostoDevoluciones)}</p>
                            <p className="text-xs text-gray-500">{cantidadDevoluciones} devoluciones</p>
                        </div>
                    </div>
                    
                    {/* Tarjeta 5: Costo Total (Modificada) */}
                    <div className="bg-white rounded-lg shadow p-5 flex items-center space-x-4">
                        <div className="p-3 rounded-full bg-gray-100 text-gray-600"><TrendingDown /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Costo Mercadería (Ventas)</p>
                            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCosto)}</p>
                        </div>
                    </div>
                </div>

                {/* Tabla de Ventas (Modificada) */}
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Historial de Operaciones</h2>
                {isLoading ? (
                    <p>Cargando...</p>
                ) : (
                    <div className="bg-white shadow rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Deuda</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ganancia Bruta</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {ventas.map((venta) => (
                                    // --- CAMBIO: Fila condicional ---
                                    <tr 
                                        key={venta.id} 
                                        className={
                                            venta.tipo === 'devolucion' ? 'bg-red-50 hover:bg-red-100' : 
                                            (venta.estado === RENDER_STATUS.ANULADA ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50')
                                        }
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{venta.fecha.toLocaleDateString('es-AR')}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{venta.clienteNombre}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{venta.vendedorName}</td>
                                        {/* --- CAMBIO: Columna de Estado --- */}
                                        <td className="px-6 py-4">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                venta.tipo === 'devolucion' ? 'bg-red-200 text-red-900' :
                                                venta.estado === RENDER_STATUS.PAGADA ? 'bg-green-100 text-green-800' :
                                                venta.estado === RENDER_STATUS.ADEUDA ? 'bg-yellow-100 text-yellow-800' :
                                                venta.estado === RENDER_STATUS.REPARTIENDO ? 'bg-indigo-100 text-indigo-800' :
                                                venta.estado === RENDER_STATUS.PENDIENTE ? 'bg-gray-200 text-gray-800' :
                                                'bg-red-100 text-red-800' // (Anulada)
                                            }`}>
                                                {venta.tipo === 'devolucion' ? 'Devolución' : venta.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">{formatCurrency(venta.totalVenta)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-red-700">{formatCurrency(venta.saldoPendiente)}</td>
                                        {/* (Esta ganancia bruta es Venta - Costo de esa línea) */}
                                        <td className={`px-6 py-4 text-right font-bold ${
                                            (venta.totalVenta - venta.totalCosto) < 0 ? 'text-red-700' : 'text-gray-700'
                                        }`}>
                                            {formatCurrency(venta.totalVenta - venta.totalCosto)}
                                        </td>
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