import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, getDocs, addDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase.js';
import { toast } from 'react-toastify';
import Button from './Button'; 
import { useFirestore } from '../hooks/useFirestore';
// --- ICONOS SVG ---
const PlusIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
const EditIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const GiftIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>;

// ============================================================================
//  COMPONENTE INTERNO: PromotionModal (El Formulario)
// ============================================================================
const PromotionModal = ({ onClose, promoToEdit }) => {
    const { tenantId, addTenantDoc, getTenantCollection, getTenantDoc, updateTenantDoc } = useFirestore();
    const [step, setStep] = useState(1);
    const [promoType, setPromoType] = useState('');

    // --- DATOS ---
    const [products, setProducts] = useState([]);
    
    // Filtro Activadores
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filtro Regalos (NUEVO)
    const [filteredGiftProducts, setFilteredGiftProducts] = useState([]);
    const [giftSearchTerm, setGiftSearchTerm] = useState('');

    // ✅ ARRAY DE IDs (Surtido que ACTIVA la promo)
    const [selectedProductIds, setSelectedProductIds] = useState([]); 

    const [nombrePromocion, setNombrePromocion] = useState('');
    const [descripcion, setDescripcion] = useState('');
    
    // Variables de Reglas
    const [cantidadMinima, setCantidadMinima] = useState('');
    const [porcentajeDescuento, setPorcentajeDescuento] = useState('');
    const [cantidadLleva, setCantidadLleva] = useState('');
    const [cantidadPaga, setCantidadPaga] = useState('');
    
    // ✅ VARIABLES REGALO
    const [cantidadRegalo, setCantidadRegalo] = useState('');
    const [giftProductId, setGiftProductId] = useState('');

    // Cargar productos (Multi-Tenant)
    useEffect(() => {
        const fetchProducts = async () => {
            if (!tenantId) return;
            try {
                const q = getTenantCollection('productos');
                const productsQuery = await getDocs(q);
                const items = productsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                items.sort((a, b) => a.nombre.localeCompare(b.nombre));
                setProducts(items);
                setFilteredProducts(items);
                setFilteredGiftProducts(items); 
            } catch (error) {
                console.error("Error cargando productos:", error);
            }
        };
        fetchProducts();
    }, [tenantId]);

    // Cargar datos si es Edición
    useEffect(() => {
        if (promoToEdit) {
            setPromoType(promoToEdit.tipo);
            setNombrePromocion(promoToEdit.nombrePromocion);
            setDescripcion(promoToEdit.descripcion || '');
            
            if (promoToEdit.productoIds && Array.isArray(promoToEdit.productoIds)) {
                setSelectedProductIds(promoToEdit.productoIds);
            } else if (promoToEdit.productoId) {
                setSelectedProductIds([promoToEdit.productoId]);
            }

            if (promoToEdit.tipo === 'DESCUENTO_POR_CANTIDAD') {
                setCantidadMinima(promoToEdit.condicion?.cantidadMinima || '');
                setPorcentajeDescuento(promoToEdit.beneficio?.porcentajeDescuento || '');
            } else if (promoToEdit.tipo === 'LLEVA_X_PAGA_Y') {
                setCantidadLleva(promoToEdit.condicion?.cantidadMinima || '');
                setCantidadPaga(promoToEdit.beneficio?.cantidadAPagar || '');
            } else if (promoToEdit.tipo === 'REGALO_POR_COMPRA') {
                setCantidadLleva(promoToEdit.condicion?.cantidadMinima || '');
                setCantidadRegalo(promoToEdit.beneficio?.cantidadRegalo || '');
                setGiftProductId(promoToEdit.beneficio?.productoRegaloId || '');
            }
            setStep(2); 
        }
    }, [promoToEdit]);

    // Filtro buscador ACTIVADORES
    useEffect(() => {
        if (searchTerm === '') {
            setFilteredProducts(products);
        } else {
            setFilteredProducts(products.filter(p => 
                p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
            ));
        }
    }, [searchTerm, products]);

    // Filtro buscador REGALOS
    useEffect(() => {
        if (giftSearchTerm === '') {
            setFilteredGiftProducts(products);
        } else {
            setFilteredGiftProducts(products.filter(p => 
                p.nombre.toLowerCase().includes(giftSearchTerm.toLowerCase())
            ));
        }
    }, [giftSearchTerm, products]);

    const handleSelectType = (type) => {
        setPromoType(type);
        setStep(2);
    };

    // Toggle Checkbox (Activadores)
    const toggleProduct = (id) => {
        setSelectedProductIds(prev => {
            if (prev.includes(id)) return prev.filter(pId => pId !== id);
            return [...prev, id];
        });
    };

    const handleSelectAll = () => {
        const idsToAdd = filteredProducts.map(p => p.id);
        setSelectedProductIds(prev => [...new Set([...prev, ...idsToAdd])]);
    };

    const handleDeselectAll = () => {
        setSelectedProductIds([]);
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedProductIds.length === 0) {
            toast.error("Selecciona al menos un producto activador.");
            return;
        }

        const selectedProductsDetails = products.filter(p => selectedProductIds.includes(p.id));
        const productNames = selectedProductsDetails.map(p => p.nombre);

        let promoData = {
            nombrePromocion,
            descripcion,
            tipo: promoType,
            estado: 'activa',
            productoIds: selectedProductIds,
            nombresProductos: productNames,
            productoId: selectedProductIds[0], 
            productoNombre: productNames[0] + (productNames.length > 1 ? ' y otros...' : ''),
        };

        if (promoType === 'DESCUENTO_POR_CANTIDAD') {
            promoData.condicion = { cantidadMinima: parseInt(cantidadMinima) };
            promoData.beneficio = { porcentajeDescuento: parseInt(porcentajeDescuento) };
        } else if (promoType === 'LLEVA_X_PAGA_Y') {
            promoData.condicion = { cantidadMinima: parseInt(cantidadLleva) };
            promoData.beneficio = { cantidadAPagar: parseInt(cantidadPaga) };
        } else if (promoType === 'REGALO_POR_COMPRA') {
            if (!giftProductId) { toast.error('Selecciona el producto de regalo.'); return; }
            const giftProduct = products.find(p => p.id === giftProductId);
            
            promoData.condicion = { cantidadMinima: parseInt(cantidadLleva) };
            promoData.beneficio = { 
                cantidadRegalo: parseInt(cantidadRegalo),
                productoRegaloId: giftProductId,
                productoRegaloNombre: giftProduct ? giftProduct.nombre : 'Producto desconocido'
            };
        }

        setIsSaving(true);
        try {
            if (promoToEdit) {
                await updateTenantDoc('promociones', promoToEdit.id, promoData);
                toast.success('¡Promoción actualizada!');
            } else {
                await addTenantDoc('promociones', promoData);
                toast.success('¡Promoción creada!');
            }
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Error al guardar.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Paso 1: Tipo de Promoción</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button type="button" onClick={() => handleSelectType('DESCUENTO_POR_CANTIDAD')} className={`p-4 border-2 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition ${promoType === 'DESCUENTO_POR_CANTIDAD' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}>
                                <p className="font-bold text-lg text-indigo-700">% Descuento</p>
                                <p className="text-xs text-gray-600 mt-1">Ej: 10% OFF x 6u.</p>
                            </button>
                            <button type="button" onClick={() => handleSelectType('LLEVA_X_PAGA_Y')} className={`p-4 border-2 rounded-lg hover:border-green-500 hover:bg-green-50 transition ${promoType === 'LLEVA_X_PAGA_Y' ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                                <p className="font-bold text-lg text-green-700">X por Y</p>
                                <p className="text-xs text-gray-600 mt-1">Ej: 6x5 (Mismo prod).</p>
                            </button>
                            <button type="button" onClick={() => handleSelectType('REGALO_POR_COMPRA')} className={`p-4 border-2 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition ${promoType === 'REGALO_POR_COMPRA' ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}`}>
                                <p className="font-bold text-lg text-purple-700">Regalo x Compra</p>
                                <p className="text-xs text-gray-600 mt-1">Ej: Lleva 6, regalo 2 Bag.</p>
                            </button>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div>
                        {/* --- SECCIÓN ACTIVADORES --- */}
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Paso 2: Productos Activadores</h3>
                        <p className="text-sm text-gray-500 mb-4">Selecciona qué productos (surtido) activan la promoción.</p>

                        <div className="mb-2 flex gap-2">
                            <input type="text" placeholder="Buscar activador..." className="flex-1 px-3 py-2 border rounded-lg text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            <button type="button" onClick={handleSelectAll} className="text-xs bg-gray-200 px-3 py-2 rounded">Todos</button>
                            <button type="button" onClick={handleDeselectAll} className="text-xs bg-gray-200 px-3 py-2 rounded">Ninguno</button>
                        </div>
                        
                        <div className="mb-4 border rounded-lg h-40 overflow-y-auto p-2 bg-gray-50">
                            {filteredProducts.map(p => (
                                <label key={p.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer border-b border-gray-100 last:border-0">
                                    <input type="checkbox" className="form-checkbox h-5 w-5 text-indigo-600 rounded" checked={selectedProductIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                                    <span className="text-gray-700 text-sm">{p.nombre}</span>
                                </label>
                            ))}
                        </div>
                        <div className="mb-4 text-right text-xs text-indigo-600 font-bold">{selectedProductIds.length} seleccionados</div>
                        
                        <hr className="my-4 border-gray-200" />
                        
                        <h4 className="font-bold text-gray-800 mb-3">Configurar Regla</h4>

                        {promoType === 'DESCUENTO_POR_CANTIDAD' && (
                            <div className="flex items-center gap-2 flex-wrap bg-blue-50 p-4 rounded border border-blue-100">
                                <span>Mínimo</span><input type="number" value={cantidadMinima} onChange={e => setCantidadMinima(e.target.value)} className="w-16 px-1 border rounded text-center font-bold" />
                                <span>u. Descuento:</span><input type="number" value={porcentajeDescuento} onChange={e => setPorcentajeDescuento(e.target.value)} className="w-16 px-1 border rounded text-center font-bold" /><span>%</span>
                            </div>
                        )}

                        {promoType === 'LLEVA_X_PAGA_Y' && (
                            <div className="flex items-center gap-2 flex-wrap bg-green-50 p-4 rounded border border-green-100">
                                <span>Lleva</span><input type="number" value={cantidadLleva} onChange={e => setCantidadLleva(e.target.value)} className="w-16 px-1 border rounded text-center font-bold" />
                                <span>Paga</span><input type="number" value={cantidadPaga} onChange={e => setCantidadPaga(e.target.value)} className="w-16 px-1 border rounded text-center font-bold" />
                            </div>
                        )}

                        {/* --- SECCIÓN REGALO POR COMPRA (Con Buscador) --- */}
                        {promoType === 'REGALO_POR_COMPRA' && (
                            <div className="bg-purple-50 p-4 rounded border border-purple-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="font-medium text-purple-900">Llevando</span>
                                    <input type="number" value={cantidadLleva} onChange={e => setCantidadLleva(e.target.value)} className="w-16 px-2 py-1 border border-purple-300 rounded text-center font-bold" placeholder="6" />
                                    <span className="text-sm text-purple-800">unidades del surtido...</span>
                                </div>
                                
                                <div className="flex flex-col gap-2 border-t border-purple-200 pt-3">
                                    <div className="flex items-center gap-2">
                                        <GiftIcon className="text-purple-600 w-5 h-5" />
                                        <span className="font-bold text-purple-900">Regalamos</span>
                                        <input type="number" value={cantidadRegalo} onChange={e => setCantidadRegalo(e.target.value)} className="w-16 px-2 py-1 border border-purple-300 rounded text-center font-bold" placeholder="2" />
                                        <span className="text-sm text-purple-800">unidades de:</span>
                                    </div>
                                    
                                    {/* --- BUSCADOR Y LISTA PARA EL REGALO --- */}
                                    <div className="mt-2">
                                        <input 
                                            type="text" 
                                            placeholder="Buscar producto de regalo..." 
                                            className="w-full px-3 py-2 border border-purple-300 rounded text-sm mb-2"
                                            value={giftSearchTerm}
                                            onChange={(e) => setGiftSearchTerm(e.target.value)}
                                        />
                                        <div className="border border-purple-300 rounded h-32 overflow-y-auto bg-white p-1">
                                            {filteredGiftProducts.map(p => (
                                                <label key={`gift-${p.id}`} className={`flex items-center space-x-2 p-2 rounded cursor-pointer border-b border-gray-100 last:border-0 hover:bg-purple-50 ${giftProductId === p.id ? 'bg-purple-100' : ''}`}>
                                                    <input 
                                                        type="radio" // Radio porque solo se regala UN tipo de producto
                                                        name="giftProduct"
                                                        className="form-radio h-4 w-4 text-purple-600"
                                                        checked={giftProductId === p.id}
                                                        onChange={() => setGiftProductId(p.id)}
                                                    />
                                                    <span className="text-gray-700 text-sm truncate">{p.nombre}</span>
                                                </label>
                                            ))}
                                            {filteredGiftProducts.length === 0 && <p className="text-center text-xs text-gray-400 mt-2">Sin resultados</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 3:
                 return (
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Paso 3: Detalles Finales</h3>
                        <div className="mb-4">
                            <label className="block text-gray-700 font-bold mb-1">Nombre Interno</label>
                            <input type="text" value={nombrePromocion} onChange={e => setNombrePromocion(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required placeholder="Ej: Promo Fernet + Coca" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 font-bold mb-1">Descripción</label>
                            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full px-3 py-2 border rounded-lg h-20" required placeholder="Ej: Llevando 6 Fernet, te llevas 2 Coca Cola de regalo." />
                        </div>
                    </div>
                 );
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-2xl font-bold text-gray-800">{promoToEdit ? 'Editar' : 'Nueva'} Promoción</h2>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-800 text-2xl">&times;</button>
                    </div>
                    {renderStepContent()}
                    <div className="flex justify-between mt-8 pt-4 border-t">
                        {step > 1 ? <button type="button" onClick={() => setStep(step - 1)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg">Atrás</button> : <div/>}
                        {step < 3 ? (
                           <button type="button" onClick={() => {
                               if (step === 1 && !promoType) return toast.error("Elige un tipo de promoción.");
                               if (step === 2 && selectedProductIds.length === 0) return toast.error("Elige al menos un producto activador.");
                               setStep(step + 1);
                           }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg">Siguiente</button>
                        ) : (
                            <button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 px-8 rounded-lg transform hover:scale-105 transition">{isSaving ? 'Guardando...' : 'Guardar'}</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

// ============================================================================
//  COMPONENTE PRINCIPAL: Promotions (La Lista)
// ============================================================================
const Promotions = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [promoToDelete, setPromoToDelete] = useState(null);

    const { tenantId, onTenantSnapshot, deleteTenantDoc } = useFirestore();

    useEffect(() => {
        if (!tenantId) {
            setPromotions([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsub = onTenantSnapshot('promociones', (snap) => {
            setPromotions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [tenantId]);

    const handleOpenModal = (promo = null) => {
        setEditingPromo(promo);
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!promoToDelete) return;
        try {
            await deleteTenantDoc('promociones', promoToDelete.id);
            toast.success("Promoción eliminada.");
            setPromoToDelete(null);
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar.");
        }
    };

    const formatPromoType = (promo) => {
        if (promo.tipo === 'LLEVA_X_PAGA_Y') {
            return <div className="flex flex-col"><span className="font-bold text-indigo-700">Lleva {promo.condicion?.cantidadMinima} x Paga {promo.beneficio?.cantidadAPagar}</span><span className="text-xs text-gray-500">Surtido</span></div>;
        }
        if (promo.tipo === 'DESCUENTO_POR_CANTIDAD') {
            return <div className="flex flex-col"><span className="font-bold text-green-700">{promo.beneficio?.porcentajeDescuento}% OFF</span><span className="text-xs text-gray-500">Mín {promo.condicion?.cantidadMinima} u.</span></div>;
        }
        if (promo.tipo === 'REGALO_POR_COMPRA') {
            return (
                <div className="flex flex-col bg-purple-50 p-1 rounded border border-purple-100">
                    <span className="font-bold text-purple-700 text-xs">Lleva {promo.condicion?.cantidadMinima}</span>
                    <div className="flex items-center gap-1 text-xs text-purple-900">
                        <GiftIcon width={12} height={12} />
                        <span className="truncate max-w-[120px]">Regalo {promo.beneficio?.cantidadRegalo} {promo.beneficio?.productoRegaloNombre}</span>
                    </div>
                </div>
            );
        }
        return promo.tipo;
    };

    const formatProductList = (promo) => {
        if (promo.nombresProductos && Array.isArray(promo.nombresProductos)) {
            if (promo.nombresProductos.length === 1) return promo.nombresProductos[0];
            if (promo.nombresProductos.length <= 2) return promo.nombresProductos.join(', ');
            return <span title={promo.nombresProductos.join(', ')}>{promo.nombresProductos.slice(0, 2).join(', ')} <span className="text-gray-400 italic">(+{promo.nombresProductos.length - 2} más)</span></span>;
        }
        return promo.productoNombre || 'Sin productos';
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex justify-between items-center mb-8">
                <div><h2 className="text-2xl font-bold text-gray-800">Promociones</h2><p className="text-gray-500 text-sm">Gestión de ofertas y surtidos</p></div>
               <Button onClick={() => handleOpenModal()} icon={<PlusIcon />}>
  Nueva Promo
</Button>
            </div>

            {loading ? (<div className="text-center py-12 text-gray-400">Cargando...</div>) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full leading-normal">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                                <th className="px-5 py-3 text-left font-bold">Nombre</th>
                                <th className="px-5 py-3 text-left font-bold">Activadores (Surtido)</th>
                                <th className="px-5 py-3 text-left font-bold">Regla</th>
                                <th className="px-5 py-3 text-center font-bold">Estado</th>
                                <th className="px-5 py-3 text-center font-bold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {promotions.length === 0 ? (<tr><td colSpan="5" className="text-center py-10 text-gray-500 italic">Sin promociones.</td></tr>) : (
                                promotions.map(promo => (
                                    <tr key={promo.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-4"><p className="text-gray-900 font-bold text-sm">{promo.nombrePromocion}</p><p className="text-gray-500 text-xs mt-1 truncate max-w-xs">{promo.descripcion}</p></td>
                                        <td className="px-5 py-4 text-sm text-gray-700">{formatProductList(promo)}</td>
                                        <td className="px-5 py-4 text-sm">{formatPromoType(promo)}</td>
                                        <td className="px-5 py-4 text-center"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${promo.estado === 'activa' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{promo.estado?.toUpperCase()}</span></td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex justify-center gap-3">
                                                <button onClick={() => handleOpenModal(promo)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full" title="Editar"><EditIcon /></button>
                                                <button onClick={() => setPromoToDelete(promo)} className="p-2 text-red-600 hover:bg-red-50 rounded-full" title="Eliminar"><TrashIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Modal Formulario */}
            {isModalOpen && <PromotionModal onClose={() => { setIsModalOpen(false); setEditingPromo(null); }} promoToEdit={editingPromo} />}

            {/* Modal Borrar */}
            {promoToDelete && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="w-full max-w-sm p-6 bg-white rounded-xl shadow-2xl">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4"><TrashIcon className="h-6 w-6 text-red-600" /></div>
                            <h3 className="text-lg font-bold text-gray-900">¿Eliminar?</h3>
                            <p className="mt-2 text-sm text-gray-500">Se borrará <strong>"{promoToDelete.nombrePromocion}"</strong>.</p>
                        </div>
                        <div className="mt-6 flex justify-center gap-3">
                            <button onClick={() => setPromoToDelete(null)} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Promotions;