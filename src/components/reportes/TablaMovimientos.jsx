import React, { useMemo, useState } from 'react';
import { formatCurrency } from './formatters';

const RENDER_STATUS = {
    PAGADA: 'Pagada',
    ADEUDA: 'Adeuda',
};

const ITEMS_PER_PAGE = 15;

/**
 * Tabla de movimientos con paginación en memoria sobre el array ya filtrado
 * (fecha + filtros de negocio). El dataset ya viene acotado por Firestore
 * (Fase 0), así que no hace falta paginación de query aquí: un período típico
 * (día/semana/mes) entra cómodo en memoria.
 */
const TablaMovimientos = ({ ventas, isLoading, resolverVendedorNombre }) => {
    const [currentPage, setCurrentPage] = useState(1);

    const { paginatedVentas, totalPages } = useMemo(() => {
        const totalP = Math.max(1, Math.ceil(ventas.length / ITEMS_PER_PAGE));
        const page = Math.min(currentPage, totalP);
        const start = (page - 1) * ITEMS_PER_PAGE;
        return { paginatedVentas: ventas.slice(start, start + ITEMS_PER_PAGE), totalPages: totalP };
    }, [ventas, currentPage]);

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Movimientos Detallados</h2>
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                    {ventas.length} registros encontrados
                </span>
            </div>

            {isLoading ? (
                <div className="p-10 text-center text-gray-400 animate-pulse">Cargando datos...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha Movimiento</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vendedor</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Deuda</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ganancia</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {paginatedVentas.map((venta) => (
                                <tr key={venta.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                        {venta.fecha.toLocaleDateString('es-AR')}
                                        <div className="text-[10px] text-gray-400">{venta.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{venta.clienteNombre}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{resolverVendedorNombre(venta) || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full ${
                                            venta.tipo === 'devolucion' ? 'bg-rose-100 text-rose-800' :
                                            venta.estado === RENDER_STATUS.PAGADA ? 'bg-emerald-100 text-emerald-800' :
                                            venta.estado === RENDER_STATUS.ADEUDA ? 'bg-amber-100 text-amber-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {venta.tipo === 'devolucion' ? 'Devolución' : venta.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-800">{formatCurrency(venta.totalVenta)}</td>
                                    <td className={`px-6 py-4 text-right text-sm font-bold ${venta.saldoPendiente > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                        {formatCurrency(venta.saldoPendiente)}
                                    </td>
                                    <td className={`px-6 py-4 text-right text-sm font-bold ${(venta.totalVenta - venta.totalCosto) > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                        {formatCurrency(venta.totalVenta - (venta.totalCosto || 0))}
                                    </td>
                                </tr>
                            ))}
                            {paginatedVentas.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
                                        No hay movimientos registrados en este período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 shadow-sm">
                        Anterior
                    </button>
                    <span className="text-sm font-medium text-gray-600">Página {currentPage} de {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 shadow-sm">
                        Siguiente
                    </button>
                </div>
            )}
        </div>
    );
};

export default TablaMovimientos;
