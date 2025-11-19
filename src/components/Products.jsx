import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase.js'; 
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs, limit } from 'firebase/firestore';

// --- Iconos SVG ---
const EditIcon = (props) => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const DeleteIcon = (props) => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const BarcodeIcon = (props) => <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
const SearchIcon = (props) => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const PlusIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="M12 5v14" /></svg>;

function Products() {
  // --- SIMULACIÓN DE ROL (Conecta esto a tu Auth Context) ---
  const isAdmin = true; // CAMBIAR A: const { user } = useAuth(); const isAdmin = user.role === 'admin';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({ 
    nombre: '', 
    precio: '', 
    stock: '', // Stock TOTAL actual
    codigoDeBarras: '', 
    costo: '', 
    categoriaId: '', 
    comisionEspecifica: '',
    // Nuevos campos para la lógica de lotes/vencimiento
    stockToAdd: '', // Cantidad a agregar (solo edición)
    stockToRemove: '', // Cantidad a descontar (solo admin edición)
    fechaVencimientoInput: '' // Fecha del lote que se está agregando
  });

  const [editingProductId, setEditingProductId] = useState(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const scanInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // --- Paginación ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15); 

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'productos'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCurrentPage(1); 
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'categorias'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isScanning && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [isScanning]);

  // --- Funciones Auxiliares de Fechas ---
  
  // Obtiene la fecha de vencimiento más próxima de un producto basándose en sus lotes
  const getProximoVencimiento = (product) => {
    if (!product.historialLotes || product.historialLotes.length === 0) return null;
    
    // Filtramos lotes que tengan fecha válida
    const fechas = product.historialLotes
        .map(l => l.fechaVencimiento)
        .filter(f => f) // que no sea null/undefined
        .sort(); // Ordenar ascendente (la más vieja primero)
        
    return fechas.length > 0 ? fechas[0] : null;
  };

  // Determina si hay alerta de vencimiento (menos de 30 días)
  const checkAlertaVencimiento = (fechaString) => {
    if (!fechaString) return false;
    const fechaVenc = new Date(fechaString);
    const hoy = new Date();
    const diferenciaTiempo = fechaVenc - hoy;
    const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));
    return diasRestantes <= 30;
  };

  const openModalForAdd = () => {
    setEditingProductId(null);
    setFormData({ 
        nombre: '', precio: '', stock: '', codigoDeBarras: '', costo: '', categoriaId: '', comisionEspecifica: '',
        stockToAdd: '', stockToRemove: '', fechaVencimientoInput: '' 
    });
    setError('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (product) => {
    setEditingProductId(product.id);
    setFormData({ 
        ...product, 
        comisionEspecifica: product.comisionEspecifica || '',
        // Reseteamos los campos de "acción"
        stockToAdd: '', 
        stockToRemove: '',
        fechaVencimientoInput: '' // El usuario debe ingresar la fecha del NUEVO stock
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones básicas
    if (!formData.nombre || !formData.precio || !formData.costo || !formData.categoriaId) {
      setError("Por favor, completa todos los campos obligatorios.");
      return;
    }

    // Cálculo de Stock y Gestión de Lotes
    let finalStock = Number(formData.stock) || 0;
    let historialLotesActualizado = editingProductId 
        ? (products.find(p => p.id === editingProductId)?.historialLotes || []) 
        : [];

    if (editingProductId) {
        // --- MODO EDICIÓN ---
        const toAdd = Number(formData.stockToAdd) || 0;
        const toRemove = Number(formData.stockToRemove) || 0;

        // Validación Admin para descontar
        if (toRemove > 0 && !isAdmin) {
            setError("Solo los administradores pueden descontar stock.");
            return;
        }

        // Si se agrega stock, es OBLIGATORIO poner fecha de vencimiento
        if (toAdd > 0 && !formData.fechaVencimientoInput) {
            setError("Si agregas stock, debes ingresar la fecha de vencimiento del nuevo lote.");
            return;
        }

        // Cálculo matemático del nuevo stock
        finalStock = finalStock + toAdd - toRemove;

        if (finalStock < 0) {
            setError("El stock no puede quedar en negativo.");
            return;
        }

        // Si agregamos stock, guardamos el lote en el historial
        if (toAdd > 0) {
            historialLotesActualizado.push({
                fechaIngreso: new Date().toISOString(),
                cantidad: toAdd,
                fechaVencimiento: formData.fechaVencimientoInput
            });
        }
        // (Opcional) Si descontamos stock, podríamos marcar lotes como consumidos, 
        // pero para este ejemplo solo ajustamos el total y mantenemos el historial de ingresos.

    } else {
        // --- MODO CREACIÓN ---
        // En creación, el stock inicial es el primer lote
        if (!formData.fechaVencimientoInput) {
             setError("Ingresa la fecha de vencimiento del stock inicial.");
             return;
        }
        
        // El stock inicial viene del input "stock" en el form de creación
        finalStock = Number(formData.stock);
        
        historialLotesActualizado.push({
            fechaIngreso: new Date().toISOString(),
            cantidad: finalStock,
            fechaVencimiento: formData.fechaVencimientoInput
        });
    }

    const productData = {
      nombre: formData.nombre,
      precio: Number(formData.precio),
      costo: Number(formData.costo),
      stock: finalStock, // Guardamos el total calculado
      historialLotes: historialLotesActualizado, // Guardamos el array de fechas
      codigoDeBarras: formData.codigoDeBarras || '',
      categoriaId: formData.categoriaId,
      comisionEspecifica: formData.comisionEspecifica ? Number(formData.comisionEspecifica) : null
    };
    
    try {
      if (editingProductId) {
        await updateDoc(doc(db, 'productos', editingProductId), productData);
      } else {
        // Validaciones de duplicados al crear
        const qNombre = query(collection(db, "productos"), where("nombre", "==", productData.nombre), limit(1));
        if (!(await getDocs(qNombre)).empty) {
          setError("Ya existe un producto con este nombre.");
          return;
        }
        if (productData.codigoDeBarras) {
          const qCodigo = query(collection(db, "productos"), where("codigoDeBarras", "==", productData.codigoDeBarras), limit(1));
          if (!(await getDocs(qCodigo)).empty) {
            setError("Ya existe un producto con este código de barras.");
            return;
          }
        }
        await addDoc(collection(db, 'productos'), productData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error al guardar:", err);
      setError("No se pudo guardar el producto.");
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
        alert("Solo administradores pueden eliminar productos.");
        return;
    }
    if (window.confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      try {
        await deleteDoc(doc(db, 'productos', id));
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  const handleScan = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = scanInput.trim();
      if (!code) return;

      const q = query(collection(db, "productos"), where("codigoDeBarras", "==", code), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        openModalForEdit({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
      } else {
        openModalForAdd();
        setFormData(prev => ({ ...prev, codigoDeBarras: code }));
      }
      setIsScanning(false);
      setScanInput('');
    }
  };

  const getCategory = (categoryId) => categories.find(cat => cat.id === categoryId);
  
  const getEffectiveCommission = (product) => {
    if (product.comisionEspecifica != null) {
      return <span className="font-bold text-teal-600">{product.comisionEspecifica}% (Espec.)</span>;
    }
    const category = getCategory(product.categoriaId);
    if (category && category.comisionGeneral) {
      return `${category.comisionGeneral}% (Cat.)`;
    }
    return '0%';
  };

  const filteredProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesCategory = selectedCategory ? product.categoriaId === selectedCategory : true;
      const matchesSearch = searchTerm ? (product.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;
      return matchesCategory && matchesSearch;
    });
    return filtered;
  }, [products, searchTerm, selectedCategory]);
  
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  
  const paginatedProducts = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  return (
    <div className="p-4 bg-gray-50 rounded-lg min-h-[60vh]">
      {/* Encabezado */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-700">Gestión de Productos</h2>
        <div className="flex items-center space-x-2">
           <button onClick={() => setIsScanning(!isScanning)} className="flex items-center px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg shadow-md hover:bg-gray-700 transition-all">
            <BarcodeIcon />
            {isScanning ? 'Cancelar' : 'Escanear'}
          </button>
          <button onClick={openModalForAdd} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition-all flex items-center">
                <PlusIcon className="w-4 h-4 mr-1"/>
            Agregar Producto
          </button>
        </div>
      </div>
      
      {isScanning && (
        <div className="mb-4">
          <input ref={scanInputRef} type="text" placeholder="Esperando código de barras..." className="w-full px-4 py-2 text-lg font-mono bg-white border-2 border-indigo-500 rounded-lg shadow-inner focus:outline-none" value={scanInput} onChange={(e) => setScanInput(e.target.value)} onKeyDown={handleScan} />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center space-x-4 mb-4">
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon /></span>
          <input type="text" placeholder="Buscar por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
        </div>
        <div className="relative">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full px-4 py-2 border rounded-lg appearance-none">
            <option value="">Todas las Categorías</option>
            {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
          </select>
        </div>
      </div>
      
      {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md mb-4">{error}</p>}

      {/* Tabla */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Nombre</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Categoría</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Vencimiento</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Precio Venta</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Stock</th>
              <th className="px-6 py-3 font-semibold text-center text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedProducts.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500 italic">No se encontraron productos.</td></tr>
            ) : (
                paginatedProducts.map((product) => {
                  const proximoVenc = getProximoVencimiento(product);
                  const esAlerta = checkAlertaVencimiento(proximoVenc);
                  
                  return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-800 font-medium">{product.nombre}</td>
                    <td className="px-6 py-4 text-gray-500">{getCategory(product.categoriaId)?.nombre || 'N/A'}</td>
                    
                    {/* Columna Vencimiento */}
                    <td className="px-6 py-4">
                        {proximoVenc ? (
                            <span className={`px-2 py-1 rounded text-xs font-bold ${esAlerta ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
                                {new Date(proximoVenc).toLocaleDateString('es-AR')} 
                                {esAlerta && " (!)"}
                            </span>
                        ) : (
                            <span className="text-gray-400 text-xs">N/A</span>
                        )}
                    </td>

                    <td className="px-6 py-4 text-green-600 font-semibold">${Number(product.precio).toFixed(2)}</td>
                    <td className={`px-6 py-4 text-gray-600 font-bold ${product.stock < 10 ? 'text-red-600' : ''}`}>
                        {product.stock}
                        {product.stock < 10 && <span className="ml-2 text-xs">(Bajo)</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center space-x-4">
                        <button onClick={() => openModalForEdit(product)} className="text-blue-500 hover:text-blue-700" title="Editar / Agregar Stock"><EditIcon /></button>
                        {isAdmin && (
                            <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-700" title="Eliminar (Admin)"><DeleteIcon /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})
            )}
          </tbody>
        </table>
      </div>
      
      {/* Paginación */}
      {totalPages > 1 && (
          <div className="flex justify-center items-center mt-4 space-x-4">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">&larr; Anterior</button>
              <span className="text-sm text-gray-700">Página {currentPage} de {totalPages}</span>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Siguiente &rarr;</button>
          </div>
      )}

      {/* Modal para Agregar/Editar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
          <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
                {editingProductId ? `Editar: ${formData.nombre}` : 'Agregar Nuevo Producto'}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              
              {/* --- DATOS GENERALES --- */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                  <select value={formData.categoriaId} onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })} className="w-full px-3 py-2 border rounded-md" required>
                    <option value="" disabled>Selecciona una categoría</option>
                    {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo *</label>
                  <input type="number" step="0.01" value={formData.costo} onChange={(e) => setFormData({ ...formData, costo: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta *</label>
                  <input type="number" step="0.01" value={formData.precio} onChange={(e) => setFormData({ ...formData, precio: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comisión (%)</label>
                  <input type="number" step="0.1" placeholder="Opcional" value={formData.comisionEspecifica} onChange={(e) => setFormData({ ...formData, comisionEspecifica: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                </div>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
                  <input type="text" value={formData.codigoDeBarras} onChange={(e) => setFormData({ ...formData, codigoDeBarras: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
              </div>

              <hr className="my-4 border-gray-200" />

              {/* --- SECCIÓN STOCK Y VENCIMIENTOS --- */}
              <h4 className="text-md font-bold text-indigo-700">Gestión de Stock y Vencimiento</h4>
              
              {editingProductId ? (
                // MODO EDICIÓN
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Stock Actual Total:</span>
                        <span className="text-xl font-bold text-gray-800">{formData.stock} u.</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-green-700 mb-1">+ Agregar Stock</label>
                            <input type="number" placeholder="0" min="0" value={formData.stockToAdd} onChange={(e) => setFormData({ ...formData, stockToAdd: e.target.value })} className="w-full px-3 py-2 border border-green-300 rounded-md focus:ring-green-500"/>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento (Nuevo lote) *</label>
                             <input type="date" value={formData.fechaVencimientoInput} onChange={(e) => setFormData({ ...formData, fechaVencimientoInput: e.target.value })} className="w-full px-3 py-2 border rounded-md" 
                                    required={formData.stockToAdd > 0} disabled={!formData.stockToAdd || formData.stockToAdd <= 0}/>
                        </div>
                    </div>

                    {/* SOLO ADMIN PUEDE DESCONTAR */}
                    {isAdmin && (
                        <div className="mt-4 pt-4 border-t border-gray-300">
                            <h5 className="text-sm font-bold text-red-700 mb-2">Zona Admin: Ajuste / Merma</h5>
                            <div>
                                <label className="block text-sm font-medium text-red-600 mb-1">- Descontar Stock</label>
                                <input type="number" placeholder="0" min="0" value={formData.stockToRemove} onChange={(e) => setFormData({ ...formData, stockToRemove: e.target.value })} className="w-full px-3 py-2 border border-red-300 bg-red-50 rounded-md"/>
                            </div>
                        </div>
                    )}
                </div>
              ) : (
                // MODO CREACIÓN
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial *</label>
                        <input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento *</label>
                        <input type="date" value={formData.fechaVencimientoInput} onChange={(e) => setFormData({ ...formData, fechaVencimientoInput: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/>
                     </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}
              
              <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border rounded-md hover:bg-indigo-700">
                    {editingProductId ? 'Actualizar Producto' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;