import React, { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, orderBy, query } from 'firebase/firestore';

// --- Iconos SVG ---
const PlusIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
const EditIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const TrashIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

function Zonas() {
    const [zonas, setZonas] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nombre, setNombre] = useState('');
    const [editingZone, setEditingZone] = useState(null);
    const [error, setError] = useState('');
    const [zoneToDelete, setZoneToDelete] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'zonas'), orderBy('nombre'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const zonasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setZonas(zonasData);
        }, (err) => {
            console.error("Error al cargar zonas:", err);
            setError("No se pudieron cargar las zonas.");
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nombre.trim()) {
            setError('El nombre de la zona no puede estar vacío.');
            return;
        }

        try {
            if (editingZone) {
                const zoneRef = doc(db, 'zonas', editingZone.id);
                await updateDoc(zoneRef, { nombre: nombre.trim() });
            } else {
                await addDoc(collection(db, 'zonas'), { nombre: nombre.trim() });
            }
            closeModal();
        } catch (err) {
            console.error("Error guardando zona:", err);
            setError("No se pudo guardar la zona.");
        }
    };

    const handleDelete = async () => {
        if (!zoneToDelete) return;
        try {
            await deleteDoc(doc(db, 'zonas', zoneToDelete.id));
            setZoneToDelete(null);
        } catch (err) {
            console.error("Error eliminando zona:", err);
            setError("No se pudo eliminar la zona.");
            setZoneToDelete(null);
        }
    };

    const openModal = (zona = null) => {
        if (zona) {
            setEditingZone(zona);
            setNombre(zona.nombre);
        } else {
            setEditingZone(null);
            setNombre('');
        }
        setError('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingZone(null);
        setNombre('');
        setError('');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow min-h-[70vh]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-700">Gestión de Zonas</h2>
                <button 
                    onClick={() => openModal()} 
                    className="flex items-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                >
                    <PlusIcon />
                    Agregar Zona
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Nombre de la Zona</th>
                            <th className="px-6 py-3 font-semibold text-right text-gray-600 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {zonas.map((zona) => (
                            <tr key={zona.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-gray-800">{zona.nombre}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end space-x-4">
                                        <button onClick={() => openModal(zona)} className="text-blue-500 hover:text-blue-700" title="Editar"><EditIcon /></button>
                                        <button onClick={() => setZoneToDelete(zona)} className="text-red-500 hover:text-red-700" title="Eliminar"><TrashIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
                        <h3 className="text-lg font-medium">{editingZone ? 'Editar Zona' : 'Agregar Nueva Zona'}</h3>
                        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="zoneName" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input 
                                    id="zoneName" 
                                    type="text" 
                                    value={nombre} 
                                    onChange={(e) => setNombre(e.target.value)} 
                                    className="w-full px-3 py-2 border rounded-md" 
                                    required 
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}
                            <div className="flex justify-end pt-4 space-x-2">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border rounded-md">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {zoneToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                     <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
                        <p className="mt-2 text-sm text-gray-600">¿Estás seguro de que quieres eliminar la zona <strong>{zoneToDelete.nombre}</strong>? Esta acción no se puede deshacer.</p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button type="button" onClick={() => setZoneToDelete(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                            <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Zonas;

