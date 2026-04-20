import { db } from '../firebase';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    query, 
    where, 
    limit, 
    getDocs, 
    Timestamp,
    onSnapshot
} from 'firebase/firestore';

/**
 * Servicio de Gestión de Turnos (Shifts)
 * Cada usuario maneja su propia caja independiente.
 */
export const ShiftService = {
    
    // 1. Abrir Turno
    async openShift(userId, tenantId, initialCash = 0) {
        const shiftData = {
            userId,
            companyId: tenantId,
            status: 'OPEN',
            openedAt: Timestamp.now(),
            closedAt: null,
            initialCash: Number(initialCash),
            expectedCash: Number(initialCash), 
            reportedCash: 0,
            difference: 0,
            totalSales: 0,
            totalExpenses: 0,
            salesIds: []
        };
        
        const colRef = collection(db, 'companies', tenantId, 'shifts');
        const docRef = await addDoc(colRef, shiftData);
        return { id: docRef.id, ...shiftData };
    },

    // 2. Obtener Turno Activo (Snaphot para React State)
    subscribeToActiveShift(userId, tenantId, callback) {
        const q = query(
            collection(db, 'companies', tenantId, 'shifts'),
            where('userId', '==', userId),
            where('status', '==', 'OPEN'),
            limit(1)
        );

        return onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                callback({ id: doc.id, ...doc.data() });
            } else {
                callback(null);
            }
        });
    },

    // 3. Cerrar Turno (Cierre Ciego)
    async closeShift(tenantId, shiftId, reportedCash, expectedCash) {
        const shiftRef = doc(db, 'companies', tenantId, 'shifts', shiftId);
        const difference = Number(reportedCash) - Number(expectedCash);
        
        await updateDoc(shiftRef, {
            status: 'CLOSED',
            closedAt: Timestamp.now(),
            reportedCash: Number(reportedCash),
            expectedCash: Number(expectedCash),
            difference: Number(difference)
        });
        
        return { id: shiftId, difference };
    },

    // 4. Actualizar métricas del turno
    async updateShiftMetrics(tenantId, shiftId, amount, type = 'sale_cash') {
        const shiftRef = doc(db, 'companies', tenantId, 'shifts', shiftId);
        // Implementación futura...
    }
};
