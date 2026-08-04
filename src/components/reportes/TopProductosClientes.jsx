import React from 'react';
import { SEQUENTIAL_BLUE, INK } from './chartPalette';
import { formatCurrency } from './formatters';
import { useRanking } from './hooks/useRankingProductosClientes';

const RankingBar = ({ label, monto, maxMonto, subtext, index }) => {
    const pct = maxMonto > 0 ? Math.max((monto / maxMonto) * 100, 4) : 0;
    const color = SEQUENTIAL_BLUE[Math.min(index, SEQUENTIAL_BLUE.length - 1)];
    return (
        <div className="py-1.5">
            <div className="flex justify-between items-baseline mb-1 gap-2">
                <span className="text-sm font-semibold text-gray-700 truncate">{label}</span>
                <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{formatCurrency(monto)}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            {subtext && <p className="text-[11px] mt-0.5" style={{ color: INK.muted }}>{subtext}</p>}
        </div>
    );
};

/**
 * Ranking de productos (por monto vendido, con margen) y clientes top del período.
 */
const TopProductosClientes = ({ ventas }) => {
    const { topProductos, topClientes } = useRanking(ventas);
    const maxProducto = topProductos[0]?.monto || 0;
    const maxCliente = topClientes[0]?.monto || 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Top Productos</h3>
                {topProductos.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-6 text-center">Sin ventas en este período.</p>
                ) : (
                    topProductos.map((p, i) => (
                        <RankingBar
                            key={p.nombre + i}
                            index={i}
                            label={p.nombre}
                            monto={p.monto}
                            maxMonto={maxProducto}
                            subtext={`${p.cantidad} un. · margen ${formatCurrency(p.margen)} (${p.monto > 0 ? ((p.margen / p.monto) * 100).toFixed(0) : 0}%)`}
                        />
                    ))
                )}
            </div>
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Top Clientes</h3>
                {topClientes.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-6 text-center">Sin ventas en este período.</p>
                ) : (
                    topClientes.map((c, i) => (
                        <RankingBar
                            key={c.nombre + i}
                            index={i}
                            label={c.nombre}
                            monto={c.monto}
                            maxMonto={maxCliente}
                            subtext={`${c.cantidadVentas} compra${c.cantidadVentas === 1 ? '' : 's'}`}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default TopProductosClientes;
