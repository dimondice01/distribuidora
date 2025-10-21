import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase.js';

const PromotionModal = ({ onClose }) => {
    const [step, setStep] = useState(1);
    const [promoType, setPromoType] = useState('');

    // Estado para todos los campos del formulario
    const [products, setProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [nombrePromocion, setNombrePromocion] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [cantidadMinima, setCantidadMinima] = useState('');
    const [porcentajeDescuento, setPorcentajeDescuento] = useState('');
    const [cantidadLleva, setCantidadLleva] = useState('');
    const [cantidadPaga, setCantidadPaga] = useState('');

    // Cargar productos para el selector
    useEffect(() => {
        const fetchProducts = async () => {
            const productsQuery = await getDocs(collection(db, 'productos'));
            setProducts(productsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchProducts();
    }, []);

    const handleSelectType = (type) => {
        setPromoType(type);
        setStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const selectedProduct = products.find(p => p.id === selectedProductId);
        if (!selectedProduct) {
            alert("Por favor, selecciona un producto.");
            return;
        }

        let promoData = {
            nombrePromocion,
            descripcion,
            tipo: promoType,
            estado: 'activa', // Por defecto se crea como activa
            productoId: selectedProductId,
            productoNombre: selectedProduct.nombre,
        };

        if (promoType === 'DESCUENTO_POR_CANTIDAD') {
            promoData.condicion = { cantidadMinima: parseInt(cantidadMinima) };
            promoData.beneficio = { porcentajeDescuento: parseInt(porcentajeDescuento) };
        } else if (promoType === 'LLEVA_X_PAGA_Y') {
            promoData.condicion = { cantidadMinima: parseInt(cantidadLleva) };
            promoData.beneficio = { cantidadAPagar: parseInt(cantidadPaga) };
        }

        try {
            await addDoc(collection(db, 'promociones'), promoData);
            alert('¡Promoción creada con éxito!');
            onClose(); // Cierra el modal
        } catch (error) {
            console.error("Error al crear la promoción: ", error);
            alert('Hubo un error al crear la promoción.');
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Paso 1: Elige el tipo de promoción</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button onClick={() => handleSelectType('DESCUENTO_POR_CANTIDAD')} className="p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition">
                                <p className="font-bold text-lg">Descuento por Cantidad</p>
                                <p className="text-sm text-gray-600">Ej: 10% de descuento llevando una caja de 36 unidades.</p>
                            </button>
                            <button onClick={() => handleSelectType('LLEVA_X_PAGA_Y')} className="p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition">
                                <p className="font-bold text-lg">Lleva X, Paga Y</p>
                                <p className="text-sm text-gray-600">Ej: Llevando 6 unidades, el cliente paga solo 5.</p>
                            </button>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Paso 2: Configura la promoción</h3>
                        <div className="mb-4">
                            <label className="block text-gray-700 font-bold mb-2">Producto</label>
                            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required>
                                <option value="" disabled>Selecciona un producto...</option>
                                {products.map(product => (
                                    <option key={product.id} value={product.id}>{product.nombre}</option>
                                ))}
                            </select>
                        </div>
                        {promoType === 'DESCUENTO_POR_CANTIDAD' && (
                            <>
                                <label className="block text-gray-700 font-bold mb-2">Condición y Beneficio</label>
                                <div className="flex items-center gap-4">
                                    <span>Llevando a partir de</span>
                                    <input type="number" value={cantidadMinima} onChange={e => setCantidadMinima(e.target.value)} className="w-24 px-3 py-2 border rounded-lg" placeholder="36" required />
                                    <span>unidades, ofrecer un</span>
                                    <input type="number" value={porcentajeDescuento} onChange={e => setPorcentajeDescuento(e.target.value)} className="w-24 px-3 py-2 border rounded-lg" placeholder="10" required />
                                    <span>% de descuento.</span>
                                </div>
                            </>
                        )}
                        {promoType === 'LLEVA_X_PAGA_Y' && (
                            <>
                                <label className="block text-gray-700 font-bold mb-2">Condición y Beneficio</label>
                                <div className="flex items-center gap-4">
                                    <span>Llevando</span>
                                    <input type="number" value={cantidadLleva} onChange={e => setCantidadLleva(e.target.value)} className="w-24 px-3 py-2 border rounded-lg" placeholder="6" required />
                                    <span>unidades, el cliente paga</span>
                                    <input type="number" value={cantidadPaga} onChange={e => setCantidadPaga(e.target.value)} className="w-24 px-3 py-2 border rounded-lg" placeholder="5" required />
                                    <span>.</span>
                                </div>
                            </>
                        )}
                    </div>
                );
            case 3:
                 return (
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Paso 3: Detalles Finales</h3>
                        <div className="mb-4">
                            <label className="block text-gray-700 font-bold mb-2">Nombre de la Promoción (Interno)</label>
                            <input type="text" value={nombrePromocion} onChange={e => setNombrePromocion(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Ej: Promo Verano Coca" required />
                        </div>
                        <div className="mb-4">
                            <label className="block text-gray-700 font-bold mb-2">Descripción (para el vendedor)</label>
                            <input type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Ej: Llevando 6 Coca Cola 1.5L, paga 5" required />
                        </div>
                    </div>
                 );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl">
                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Nueva Promoción</h2>
                        <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
                    </div>
                    
                    {renderStepContent()}

                    <div className="flex justify-between mt-8">
                        {step > 1 ? (
                            <button type="button" onClick={() => setStep(step - 1)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg">Atrás</button>
                        ) : <div />}
                        
                        {step < 3 ? (
                           step > 1 && <button type="button" onClick={() => setStep(step + 1)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Siguiente</button>
                        ) : (
                            <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Guardar Promoción</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PromotionModal;