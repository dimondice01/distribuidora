import { useEffect, useMemo, useState } from 'react';
import { useFirestore } from '../../../hooks/useFirestore';

// Mismo patrón defensivo de fecha que usa MapaCRM.jsx: la app Android graba
// 'fecha' (Timestamp) en las visitas nuevas, pero puede haber docs legacy con
// solo 'timestamp'. Se trae la colección completa (es liviana, un doc por
// visita/venta de campo) y se filtra el rango en memoria, igual que MapaCRM.
function resolveTs(doc) {
    if (doc.fecha?.toDate) return doc.fecha.toDate();
    if (doc.timestamp) return new Date(doc.timestamp);
    return null;
}

/**
 * Trae las visitas de campo (con y sin venta) registradas por la app Android,
 * ya acotadas al rango de fechas del reporte.
 */
export function useVisitasReporte({ tenantId, startDate, endDate }) {
    const { onTenantSnapshot } = useFirestore();
    const [visitasSinFiltrar, setVisitasSinFiltrar] = useState([]);

    useEffect(() => {
        if (!tenantId) { setVisitasSinFiltrar([]); return; }
        const unsubscribe = onTenantSnapshot('visitas', (snap) => {
            setVisitasSinFiltrar(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, [{ field: 'fecha', direction: 'desc' }]);
        return () => unsubscribe();
    }, [tenantId, onTenantSnapshot]);

    const visitas = useMemo(() => {
        return visitasSinFiltrar
            .map(v => ({ ...v, ts: resolveTs(v) }))
            .filter(v => v.ts && v.ts >= startDate && v.ts <= endDate);
    }, [visitasSinFiltrar, startDate, endDate]);

    return { visitas };
}
