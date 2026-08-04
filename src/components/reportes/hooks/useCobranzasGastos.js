import { useEffect, useState } from 'react';
import { useFirestore } from '../../../hooks/useFirestore';

/**
 * Trae cobranzas y gastos del rango de fechas dado (ya acotado en el query),
 * para calcular el Flujo de Efectivo real. Mismo patrón live/histórico que useVentasReporte.
 */
export function useCobranzasGastos({ tenantId, startDate, endDate, isRangoEnVivo }) {
    const { onTenantSnapshotFiltered, getTenantDocsOnce } = useFirestore();
    const [cobranzas, setCobranzas] = useState([]);
    const [gastos, setGastos] = useState([]);

    useEffect(() => {
        if (!tenantId) {
            setCobranzas([]);
            setGastos([]);
            return;
        }

        const cobranzasOptions = {
            wheres: [['fecha', '>=', startDate], ['fecha', '<=', endDate]],
            orders: [{ field: 'fecha', direction: 'desc' }],
        };
        // Los gastos siempre se graban con 'fechaGasto' (ver Gastos.jsx / seeder.js).
        const gastosOptions = {
            wheres: [['fechaGasto', '>=', startDate], ['fechaGasto', '<=', endDate]],
            orders: [{ field: 'fechaGasto', direction: 'desc' }],
        };

        const procesarCobranzas = (snap) => {
            const data = [];
            snap.forEach((doc) => {
                const d = doc.data();
                const fecha = d.fecha ? d.fecha.toDate() : null;
                if (fecha) data.push({ id: doc.id, ...d, fecha });
            });
            setCobranzas(data);
        };

        const procesarGastos = (snap) => {
            const data = [];
            snap.forEach((doc) => {
                const d = doc.data();
                const fecha = d.fechaGasto ? d.fechaGasto.toDate() : null;
                if (fecha) data.push({ id: doc.id, ...d, fecha });
            });
            setGastos(data);
        };

        if (isRangoEnVivo) {
            const unsubCobranzas = onTenantSnapshotFiltered('cobranzas', procesarCobranzas, cobranzasOptions);
            const unsubGastos = onTenantSnapshotFiltered('gastos', procesarGastos, gastosOptions);
            return () => { unsubCobranzas(); unsubGastos(); };
        }

        let cancelado = false;
        Promise.all([
            getTenantDocsOnce('cobranzas', cobranzasOptions),
            getTenantDocsOnce('gastos', gastosOptions),
        ])
            .then(([cobranzasSnap, gastosSnap]) => {
                if (cancelado) return;
                procesarCobranzas(cobranzasSnap);
                procesarGastos(gastosSnap);
            })
            .catch((error) => console.error('Error cargando cobranzas/gastos:', error));
        return () => { cancelado = true; };
    }, [tenantId, startDate, endDate, isRangoEnVivo, onTenantSnapshotFiltered, getTenantDocsOnce]);

    return { cobranzas, gastos };
}
