import { useEffect, useState } from 'react';
import { useFirestore } from '../../../hooks/useFirestore';

const RENDER_STATUS_ANULADA = 'Anulada';

function calcularTotales(querySnapshot) {
    let totalVenta = 0;
    let totalCosto = 0;
    querySnapshot.forEach((doc) => {
        const d = doc.data();
        if (d.tipo === 'devolucion') {
            totalCosto += d.totalCosto || 0;
            return;
        }
        if (d.estado === RENDER_STATUS_ANULADA) return;
        totalVenta += d.totalVenta || 0;
        totalCosto += d.totalCosto || 0;
    });
    return { totalVenta, gananciaBruta: totalVenta - totalCosto };
}

/**
 * Trae los totales del período inmediatamente anterior (misma duración) para
 * mostrar el delta % en los KPIs. Siempre es un rango pasado -> lectura puntual.
 */
export function useComparativoPeriodo({ tenantId, startDate, endDate }) {
    const { getTenantDocsOnce } = useFirestore();
    const [comparativo, setComparativo] = useState({ totalVenta: 0, gananciaBruta: 0 });

    useEffect(() => {
        if (!tenantId) {
            setComparativo({ totalVenta: 0, gananciaBruta: 0 });
            return;
        }

        const duracionMs = endDate.getTime() - startDate.getTime();
        const finAnterior = new Date(startDate.getTime() - 1);
        const inicioAnterior = new Date(finAnterior.getTime() - duracionMs);

        let cancelado = false;
        getTenantDocsOnce('ventas', {
            wheres: [['fecha', '>=', inicioAnterior], ['fecha', '<=', finAnterior]],
        })
            .then((snap) => { if (!cancelado) setComparativo(calcularTotales(snap)); })
            .catch((error) => console.error('Error cargando período comparativo:', error));
        return () => { cancelado = true; };
    }, [tenantId, startDate, endDate, getTenantDocsOnce]);

    return comparativo;
}
