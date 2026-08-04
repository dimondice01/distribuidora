import { useMemo, useState, useCallback } from 'react';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const hoy = () => startOfDay(new Date());

/**
 * Maneja el rango de fechas del reporte + atajos (hoy/semana/mes/mes anterior).
 * Un rango que llega hasta "hoy" se considera "en vivo" (onSnapshot); un rango
 * completamente pasado se lee una sola vez (getDocs) porque no va a cambiar.
 */
export function useRangoFechas() {
    const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
    const [endDate, setEndDate] = useState(() => endOfDay(new Date()));

    const setRango = useCallback((inicio, fin) => {
        setStartDate(startOfDay(inicio));
        setEndDate(endOfDay(fin));
    }, []);

    const atajos = useMemo(() => ({
        hoy: () => setRango(new Date(), new Date()),
        semana: () => setRango(startOfWeek(new Date(), { weekStartsOn: 1 }), new Date()),
        mes: () => setRango(startOfMonth(new Date()), new Date()),
        mesAnterior: () => {
            const mesPrevio = subMonths(new Date(), 1);
            setRango(startOfMonth(mesPrevio), endOfMonth(mesPrevio));
        },
    }), [setRango]);

    const isRangoEnVivo = useMemo(() => endDate >= hoy(), [endDate]);

    return { startDate, endDate, setStartDate, setEndDate, setRango, atajos, isRangoEnVivo };
}
