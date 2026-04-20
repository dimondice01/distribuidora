import React from 'react';
import { db } from '../firebase';
import { collection, query, where, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, orderBy, limit, writeBatch } from 'firebase/firestore';
import { useTenant } from '../contexts/TenantContext';

export const useFirestore = () => {
    const { tenantId } = useTenant();

    /**
     * Devuelve una referencia de colección aislada jerárquicamente.
     */
    const getTenantCollection = React.useCallback((collectionPath) => {
        if (!tenantId) throw new Error("Acceso Denegado: No se encontró companyId.");
        return collection(db, 'companies', tenantId, collectionPath);
    }, [tenantId]);

    /**
     * Devuelve una referencia de documento aislada jerárquicamente.
     */
    const getTenantDoc = React.useCallback((collectionPath, docId) => {
        if (!tenantId) throw new Error("Acceso Denegado: No se encontró companyId.");
        return doc(db, 'companies', tenantId, collectionPath, docId);
    }, [tenantId]);

    /**
     * Versión para escrituras jerárquicas (Creación con ID automático).
     */
    const addTenantDoc = React.useCallback(async (collectionPath, data) => {
        if (!tenantId) throw new Error("Acceso Denegado: No se puede guardar sin companyId.");
        const colRef = collection(db, 'companies', tenantId, collectionPath);
        return await addDoc(colRef, { ...data, companyId: tenantId });
    }, [tenantId]);

    /**
     * Helper para actualizaciones simplificadas.
     */
    const updateTenantDoc = React.useCallback(async (collectionPath, docId, data) => {
        const docRef = getTenantDoc(collectionPath, docId);
        return await updateDoc(docRef, data);
    }, [getTenantDoc]);

    /**
     * Helper para eliminaciones simplificadas.
     */
    const deleteTenantDoc = React.useCallback(async (collectionPath, docId) => {
        const docRef = getTenantDoc(collectionPath, docId);
        return await deleteDoc(docRef);
    }, [getTenantDoc]);

    /**
     * Wrapper para onSnapshot jerárquico.
     */
    const onTenantSnapshot = React.useCallback((path, callback, orders = [], onError = null) => {
        let q = getTenantCollection(path);
        
        if (Array.isArray(orders)) {
            orders.forEach(o => {
                q = query(q, orderBy(o.field, o.direction || 'asc'));
            });
        }

        return onSnapshot(q, callback, (error) => {
            if (onError) onError(error);
            console.error(`Error en Snapshot de ${path}:`, error);
        });
    }, [getTenantCollection]);

    return {
        tenantId,
        getTenantCollection,
        getTenantDoc,
        addTenantDoc,
        updateTenantDoc,
        deleteTenantDoc,
        onTenantSnapshot,
        db 
    };
};
