import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import PromotionModal from './PromotionModal.jsx';
import { toast } from 'react-toastify';

// --- Iconos SVG (Internos) ---
const PlusIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
const EditIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const TrashIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

const Promotions = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null); // Para pasar datos al modal de edición
    const [promoToDelete, setPromoToDelete] = useState(null); // Para el modal de confirmación de borrado

    useEffect(() => {
        setLoading(true);
        const promotionsQuery = query(collection(db, 'promociones'));
        const unsubscribe = onSnapshot(promotionsQuery, (snapshot) => {
            const promotionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPromotions(promotionsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    // --- NUEVAS FUNCIONES PARA EDITAR Y ELIMINAR ---

    const handleOpenModal = (promo = null) => {
        setEditingPromo(promo); // Si es null, es para crear. Si tiene datos, es para editar.
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPromo(null);
    };

    const handleDelete = async () => {
        if (!promoToDelete) return;
        try {
            await deleteDoc(doc(db, 'promociones', promoToDelete.id));
            toast.success(`Promoción "${promoToDelete.nombrePromocion}" eliminada con éxito.`);
            setPromoToDelete(null);
        } catch (error) {
            console.error("Error al eliminar la promoción:", error);
            toast.error("No se pudo eliminar la promoción.");
            setPromoToDelete(null);
        }
    };

    const formatPromoType = (promo) => {
        if (promo.tipo === 'LLEVA_X_PAGA_Y') {
            return `${promo.condicion.cantidadMinima} x ${promo.beneficio.cantidadAPagar}`;
        }
        if (promo.tipo === 'DESCUENTO_POR_CANTIDAD') {
            return `${promo.beneficio.porcentajeDescuento}% OFF`;
        }
        return promo.tipo;
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Gestión de Promociones</h2>
                <button 
                    onClick={() => handleOpenModal()} // Llama a la nueva función
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2"
                >
                    <PlusIcon />
                    Nueva Promoción
                </button>
            </div>

            {loading ? ( <div className="text-center py-10">Cargando...</div> ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr className="bg-gray-200 text-gray-600 uppercase text-sm">
                                <th className="px-5 py-3 border-b-2 border-gray-300 text-left">Promoción</th>
                                <th className="px-5 py-3 border-b-2 border-gray-300 text-left">Producto</th>
                                <th className="px-5 py-3 border-b-2 border-gray-300 text-left">Tipo</th>
                                <th className="px-5 py-3 border-b-2 border-gray-300 text-center">Estado</th>
                                <th className="px-5 py-3 border-b-2 border-gray-300 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {promotions.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-10 text-gray-500">No hay promociones creadas. ¡Crea la primera!</td></tr>
                            ) : (
                                promotions.map(promo => (
                                    <tr key={promo.id} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="px-5 py-4"><p className="text-gray-900 font-semibold">{promo.nombrePromocion}</p><p className="text-gray-600 text-sm">{promo.descripcion}</p></td>
                                        <td className="px-5 py-4"><p className="text-gray-800">{promo.productoNombre}</p></td>
                                        <td className="px-5 py-4"><span className="bg-blue-200 text-blue-800 py-1 px-3 rounded-full text-xs font-semibold">{formatPromoType(promo)}</span></td>
                                        <td className="px-5 py-4 text-center"><span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${promo.estado === 'activa' ? 'bg-green-500' : 'bg-red-500'}`}>{promo.estado}</span></td>
                                        <td className="px-5 py-4 text-center">
                                            {/* --- BOTONES CONECTADOS --- */}
                                            <div className="flex justify-center gap-4">
                                                <button onClick={() => handleOpenModal(promo)} className="text-blue-600 hover:text-blue-900 transition-colors" title="Editar"><EditIcon /></button>
                                                <button onClick={() => setPromoToDelete(promo)} className="text-red-600 hover:text-red-900 transition-colors" title="Eliminar"><TrashIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            {isModalOpen && <PromotionModal onClose={handleCloseModal} promoToEdit={editingPromo} />}

            {/* --- MODAL DE CONFIRMACIÓN PARA ELIMINAR --- */}
            {promoToDelete && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            ¿Estás seguro de que quieres eliminar la promoción <strong>"{promoToDelete.nombrePromocion}"</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button type="button" onClick={() => setPromoToDelete(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Cancelar
                            </button>
                            <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700">
                                Eliminar Definitivamente
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Promotions;