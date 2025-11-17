import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../firebase.js'; 
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';

// --- Iconos SVG (Internos) ---
const TrendingUp = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 6 13.5 15.5 10 12 1 21"></polyline><path d="M22 6h-6v6"/></svg>;
const TrendingDown = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>;
const DollarSign = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const CreditCard = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
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

    // --- NUEVO: ESTADO DE PAGINACIÓN ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);

    // ==================================================================
    // --- Lógica de 'useMemo' para totales (Sin cambios) ---
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
                acc.totalCostoDevoluciones += costo;
                acc.cantidadDevoluciones += 1;
            } else if (v.estado !== RENDER_STATUS.ANULADA) {
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

        const gananciaBruta = totalVenta - totalCosto - totalCostoDevoluciones;

        return { totalVenta, totalCosto, totalDeuda, gananciaBruta, totalCostoDevoluciones, cantidadDevoluciones };

    }, [ventas]);
    // ==================================================================
    // --- FIN DEL 'useMemo' de totales ---
    // ==================================================================


    useEffect(() => {
        setIsLoading(true);
        const q = query(
            collection(db, "ventas"),
            orderBy("fecha", "desc"),
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
            setCurrentPage(1); // Resetear paginación al cambiar filtros de fecha
            setIsLoading(false);
        }, (error) => {
            console.error("Error al obtener ventas: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [startDate, endDate]);

    
    // --- NUEVO: useMemo para la paginación ---
    const { paginatedVentas, totalPages } = useMemo(() => {
        const total = ventas.length;
        const totalP = Math.ceil(total / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return {
            paginatedVentas: ventas.slice(start, end),
            totalPages: totalP
        };
    }, [ventas, currentPage, itemsPerPage]);

    // --- NUEVO: Handlers de paginación ---
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };


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

                {/* ================================================== */}
                {/* --- CAMBIO: Tarjetas de Resumen (Estilo Corregido) --- */}
                {/* ================================================== */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
                    
                    {/* Card 1: Total Ventas */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500 flex flex-col justify-between h-full">
                        <div className="flex items-start gap-4"> 
                            <div className="p-3 rounded-xl bg-green-100 text-green-600">{<TrendingUp />}</div>
                            <div className="min-w-0 flex-1"> 
                                <p className="text-sm text-gray-500 font-medium">Total Ventas (Neto)</p>
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{formatCurrency(totalVenta)}</p>
                        </div>
                    </div>

                    {/* Card 2: Ganancia Bruta */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500 flex flex-col justify-between h-full">
                        <div className="flex items-start gap-4"> 
                            <div className="p-3 rounded-xl bg-blue-100 text-blue-600">{<DollarSign />}</div>
                            <div className="min-w-0 flex-1"> 
                                <p className="text-sm text-gray-500 font-medium">Ganancia Bruta</p>
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{formatCurrency(gananciaBruta)}</p>
                        </div>
                    </div>

                    {/* Card 3: Saldo Pendiente */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500 flex flex-col justify-between h-full">
                        <div className="flex items-start gap-4"> 
                            <div className="p-3 rounded-xl bg-yellow-100 text-yellow-600">{<CreditCard />}</div>
                            <div className="min-w-0 flex-1"> 
                                <p className="text-sm text-gray-500 font-medium">Saldo Pendiente</p>
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{formatCurrency(totalDeuda)}</p>
                        </div>
                    </div>

                    {/* Card 4: Costo Devoluciones */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500 flex flex-col justify-between h-full">
                        <div className="flex items-start gap-4"> 
                            <div className="p-3 rounded-xl bg-red-100 text-red-600">{<RefreshCw />}</div>
                            <div className="min-w-0 flex-1"> 
                                <p className="text-sm text-gray-500 font-medium">Costo Devoluciones</p>
                                <p className="text-xs text-gray-400">{cantidadDevoluciones} devol.</p>
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-bold text-red-700 whitespace-nowrap overflow-hidden text-ellipsis">{formatCurrency(totalCostoDevoluciones)}</p>
                        </div>
                    </div>
                    
                    {/* Card 5: Costo Mercadería */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-gray-500 flex flex-col justify-between h-full">
                        <div className="flex items-start gap-4"> 
                            <div className="p-3 rounded-xl bg-gray-100 text-gray-600">{<TrendingDown />}</div>
                            <div className="min-w-0 flex-1"> 
                                <p className="text-sm text-gray-500 font-medium">Costo Mercadería</p>
                            </div>
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{formatCurrency(totalCosto)}</p>
                        </div>
                    </div>
                </div>

                {/* ================================================== */}
                {/* --- FIN CAMBIO TARJETAS --- */}
                {/* ================================================== */}


                {/* Tabla de Ventas (Modificada para paginación) */}
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
                                {/* --- CAMBIO: Mapeo sobre 'paginatedVentas' --- */}
                                {paginatedVentas.map((venta) => (
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
                                        <td className={`px-6 py-4 text-right font-bold ${
                                            (venta.totalVenta - venta.totalCosto) < 0 ? 'text-red-700' : 'text-gray-700'
                                        }`}>
                                            {formatCurrency(venta.totalVenta - venta.totalCosto)}
                                        </td>
                                    </tr>
                                ))}
                                {paginatedVentas.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-10 text-center text-gray-500 italic">
                                            No se encontraron operaciones para el rango de fechas seleccionado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* --- NUEVO: Controles de Paginación --- */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center p-4 border-t">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    &larr; Anterior
                                </button>
                                <span className="text-sm text-gray-700">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Siguiente &rarr;
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReporteGeneral;