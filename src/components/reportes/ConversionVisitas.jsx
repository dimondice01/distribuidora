import React, { useMemo } from 'react';
import { STATUS, INK } from './chartPalette';

/**
 * Tasa de conversión visita -> venta por vendedor, usando la colección `visitas`
 * que graba la app Android en cada visita (con o sin venta). Métrica que no
 * suelen medir los ERPs de distribuidoras tradicionales. Mismo cálculo que
 * usa MapaCRM.jsx, pero agregado por vendedor en vez de por evento en el mapa.
 */
const ConversionVisitas = ({ visitas, resolverNombreVendedor }) => {
    const ranking = useMemo(() => {
        const porVendedor = new Map();
        visitas.forEach((v) => {
            if (!v.vendedorId) return;
            const entry = porVendedor.get(v.vendedorId) || { vendedorId: v.vendedorId, ventas: 0, visitas: 0 };
            if (v.resultado === 'con_venta') entry.ventas += 1;
            else entry.visitas += 1;
            porVendedor.set(v.vendedorId, entry);
        });

        return Array.from(porVendedor.values())
            .map((e) => {
                const total = e.ventas + e.visitas;
                const nombre = resolverNombreVendedor(e.vendedorId) || nombreFallback(visitas, e.vendedorId);
                return { ...e, total, nombre, tasa: total > 0 ? (e.ventas / total) * 100 : 0 };
            })
            .sort((a, b) => b.total - a.total);
    }, [visitas, resolverNombreVendedor]);

    const totalVentas = visitas.filter(v => v.resultado === 'con_venta').length;
    const totalVisitas = visitas.length;
    const tasaGeneral = totalVisitas > 0 ? (totalVentas / totalVisitas) * 100 : null;

    const colorTasa = (tasa) => (tasa >= 60 ? STATUS.good : tasa >= 30 ? STATUS.warning : STATUS.critical);

    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700">Conversión Visita → Venta</h3>
                {tasaGeneral !== null && (
                    <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ color: colorTasa(tasaGeneral), backgroundColor: `${colorTasa(tasaGeneral)}1a` }}>
                        {tasaGeneral.toFixed(0)}% general ({totalVentas}/{totalVisitas})
                    </span>
                )}
            </div>

            {ranking.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-6 text-center">
                    Sin visitas registradas por la app en este período (requiere que los vendedores actualicen la app Android).
                </p>
            ) : (
                <div className="space-y-3">
                    {ranking.map((r) => (
                        <div key={r.vendedorId}>
                            <div className="flex justify-between items-baseline mb-1 gap-2">
                                <span className="text-sm font-semibold text-gray-700 truncate">{r.nombre}</span>
                                <span className="text-xs font-medium" style={{ color: INK.muted }}>{r.ventas} ventas / {r.total} visitas</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.max(r.tasa, 3)}%`, backgroundColor: colorTasa(r.tasa) }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Fallback si el vendedor no está en el catálogo (ej. usuario eliminado): usa el nombre denormalizado de la propia visita.
function nombreFallback(visitas, vendedorId) {
    const v = visitas.find(x => x.vendedorId === vendedorId);
    return v?.vendedorName || v?.vendedorNombre || 'Vendedor';
}

export default ConversionVisitas;
