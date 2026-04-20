import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTenant } from './TenantContext';
import { ShiftService } from '../services/ShiftService';
import { toast } from 'react-toastify';

const ShiftContext = createContext();

export const useShift = () => {
    const context = useContext(ShiftContext);
    if (!context) throw new Error('useShift debe usarse dentro de ShiftProvider');
    return context;
};

export const ShiftProvider = ({ children }) => {
    const { user, tenantId } = useTenant();
    const [activeShift, setActiveShift] = useState(null);
    const [loadingShift, setLoadingShift] = useState(true);

    // 1. Detección de Turno Activo (Sincronización en Tiempo Real)
    useEffect(() => {
        if (!user || !tenantId) {
            setActiveShift(null);
            setLoadingShift(false);
            return;
        }

        const unsubscribe = ShiftService.subscribeToActiveShift(user.uid, tenantId, (shift) => {
            setActiveShift(shift);
            setLoadingShift(false);
        });

        return () => unsubscribe();
    }, [user, tenantId]);

    // 2. Abrir Turno (Fondo de Caja)
    const openShift = async (initialCash) => {
        try {
            const shift = await ShiftService.openShift(user.uid, tenantId, initialCash);
            toast.success('🎉 Turno abierto correctamente. ¡Buenas ventas!');
            return shift;
        } catch (e) {
            console.error(e);
            toast.error('Error al abrir turno.');
            throw e;
        }
    };

    // 3. Cerrar Turno (Cierre Ciego)
    const closeShift = async (reportedCash, expectedCash) => {
        if (!activeShift) return;
        try {
            const result = await ShiftService.closeShift(tenantId, activeShift.id, reportedCash, expectedCash);
            toast.info(`Turno cerrado. Diferencia auditada: $${result.difference}`);
            setActiveShift(null);
            return result;
        } catch (e) {
            console.error(e);
            toast.error('Error al cerrar turno.');
            throw e;
        }
    };

    return (
        <ShiftContext.Provider value={{ 
            activeShift, 
            loadingShift, 
            openShift, 
            closeShift,
            hasOpenShift: !!activeShift 
        }}>
            {children}
        </ShiftContext.Provider>
    );
};
