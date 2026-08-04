import { useEffect, useState } from 'react';
import { useFirestore } from '../../../hooks/useFirestore';

const RENDER_STATUS_PENDIENTE = 'Pendiente de Entrega';

function procesarVentasSnapshot(querySnapshot) {
    const ventasData = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Ganancia = devengado: SIEMPRE la fecha real de la venta. Nunca la fecha
        // del último pago, para que un cobro posterior no haga "reaparecer" la
        // venta completa (con su totalVenta íntegro) en el reporte del día de hoy.
        const fechaVenta = data.fecha ? data.fecha.toDate() : null;
        if (!fechaVenta) return;

        // FILTRO CLAVE: Solo mostrar si hubo movimiento real (No Pendientes puros sin pago).
        const tienePagos = (data.pagoEfectivo > 0 || data.pagoTransferencia > 0);
        const esPendientePuro = data.estado === RENDER_STATUS_PENDIENTE && !tienePagos;

        // Compatibilidad hacia atrás: cobros viejos escritos dentro de "ventas"
        // (antes de separar la colección cobranzas) no deben ensuciar la ganancia.
        const esCobroLegacy = data.tipo === 'cobranza' || data.tipo === 'cobro' || !!data.ventaOriginalId;

        if (!esPendientePuro && !esCobroLegacy) {
            ventasData.push({ id: doc.id, ...data, fecha: fechaVenta });
        }
    });
    return ventasData;
}

/**
 * Trae las ventas del rango de fechas dado, ya filtradas en el propio query de
 * Firestore (no descarga el historial completo). Rango "en vivo" (incluye hoy)
 * usa onSnapshot; rango histórico usa una lectura puntual (getDocs).
 */
export function useVentasReporte({ tenantId, startDate, endDate, isRangoEnVivo }) {
    const { onTenantSnapshotFiltered, getTenantDocsOnce } = useFirestore();
    const [ventas, setVentas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) {
            setVentas([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const queryOptions = {
            wheres: [
                ['fecha', '>=', startDate],
                ['fecha', '<=', endDate],
            ],
            orders: [{ field: 'fecha', direction: 'desc' }],
        };

        if (isRangoEnVivo) {
            const unsubscribe = onTenantSnapshotFiltered('ventas', (snap) => {
                setVentas(procesarVentasSnapshot(snap));
                setIsLoading(false);
            }, queryOptions, () => setIsLoading(false));
            return () => unsubscribe();
        }

        let cancelado = false;
        getTenantDocsOnce('ventas', queryOptions)
            .then((snap) => { if (!cancelado) { setVentas(procesarVentasSnapshot(snap)); setIsLoading(false); } })
            .catch((error) => { console.error('Error cargando ventas:', error); if (!cancelado) setIsLoading(false); });
        return () => { cancelado = true; };
    }, [tenantId, startDate, endDate, isRangoEnVivo, onTenantSnapshotFiltered, getTenantDocsOnce]);

    return { ventas, isLoading };
}
