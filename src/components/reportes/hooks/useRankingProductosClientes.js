import { useMemo } from 'react';

const RENDER_STATUS_ANULADA = 'Anulada';
const TOP_N = 8;

/**
 * Ranking de productos (por monto vendido, con margen) y clientes top del período.
 * Compartido entre TopProductosClientes.jsx (visualización) y ExportMenu.jsx (Excel).
 */
export function useRanking(ventas) {
    return useMemo(() => {
        const productos = new Map();
        const clientes = new Map();

        ventas.forEach((v) => {
            if (v.tipo === 'devolucion' || v.estado === RENDER_STATUS_ANULADA) return;

            const cKey = v.clienteId || v.clienteNombre || 'sin-cliente';
            const cEntry = clientes.get(cKey) || { nombre: v.clienteNombre || 'Consumidor Final', monto: 0, cantidadVentas: 0 };
            cEntry.monto += v.totalVenta || 0;
            cEntry.cantidadVentas += 1;
            clientes.set(cKey, cEntry);

            (v.items || []).forEach((item) => {
                const pKey = item.id || item.nombre;
                if (!pKey) return;
                const monto = (item.precio || 0) * (item.quantity || 0);
                const costo = (item.costo || 0) * (item.quantity || 0);
                const pEntry = productos.get(pKey) || { nombre: item.nombre || 'Producto', cantidad: 0, monto: 0, margen: 0 };
                pEntry.cantidad += item.quantity || 0;
                pEntry.monto += monto;
                pEntry.margen += monto - costo;
                productos.set(pKey, pEntry);
            });
        });

        const topProductos = Array.from(productos.values()).sort((a, b) => b.monto - a.monto).slice(0, TOP_N);
        const topClientes = Array.from(clientes.values()).sort((a, b) => b.monto - a.monto).slice(0, TOP_N);
        return { topProductos, topClientes };
    }, [ventas]);
}
