import React, { useMemo } from 'react';
import { SEQUENTIAL_BLUE, INK } from './chartPalette';
import { formatCurrency } from './formatters';

const TOP_N = 8;

/**
 * Merma/rechazo en reparto: productos devueltos (venta.tipo === 'devolucion'),
 * generadas cuando la cantidad entregada difiere de la cargada (ver Rutas.jsx:541-565).
 * Reutiliza las ventas ya cargadas por el reporte (el filtro de fecha no excluye devoluciones).
 */
const MermaReparto = ({ ventas }) => {
    const { ranking, totalCosto, totalUnidades } = useMemo(() => {
        const porProducto = new Map();
        let costo = 0;
        let unidades = 0;

        ventas.filter(v => v.tipo === 'devolucion').forEach((v) => {
            (v.items || []).forEach((item) => {
                const key = item.id || item.nombre;
                if (!key) return;
                const cantidad = item.quantity || 0;
                const costoItem = (item.costo || 0) * cantidad;
                const entry = porProducto.get(key) || { nombre: item.nombre || 'Producto', cantidad: 0, costo: 0 };
                entry.cantidad += cantidad;
                entry.costo += costoItem;
                porProducto.set(key, entry);
                costo += costoItem;
                unidades += cantidad;
            });
        });

        const ranking = Array.from(porProducto.values()).sort((a, b) => b.costo - a.costo).slice(0, TOP_N);
        return { ranking, totalCosto: costo, totalUnidades: unidades };
    }, [ventas]);

    const maxCosto = ranking[0]?.costo || 0;

    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700">Merma en Reparto (Devoluciones)</h3>
                {totalUnidades > 0 && (
                    <span className="text-xs font-bold text-gray-500">{totalUnidades} un. · {formatCurrency(totalCosto)}</span>
                )}
            </div>

            {ranking.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-6 text-center">Sin devoluciones registradas en este período.</p>
            ) : (
                <div className="space-y-2">
                    {ranking.map((r, i) => {
                        const pct = maxCosto > 0 ? Math.max((r.costo / maxCosto) * 100, 4) : 0;
                        return (
                            <div key={r.nombre + i} className="py-1">
                                <div className="flex justify-between items-baseline mb-1 gap-2">
                                    <span className="text-sm font-semibold text-gray-700 truncate">{r.nombre}</span>
                                    <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(r.costo)}</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: SEQUENTIAL_BLUE[Math.min(i, SEQUENTIAL_BLUE.length - 1)] }} />
                                </div>
                                <p className="text-[11px] mt-0.5" style={{ color: INK.muted }}>{r.cantidad} unidades devueltas</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MermaReparto;
