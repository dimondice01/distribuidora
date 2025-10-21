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
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', precio: '', stock: '', codigoDeBarras: '', costo: '', categoriaId: '', comisionEspecifica: '' });
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
      setCurrentPage(1); // Resetear a la primera página al recibir nuevos datos
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

  const openModalForAdd = () => {
    setEditingProductId(null);
    setFormData({ nombre: '', precio: '', stock: '', codigoDeBarras: '', costo: '', categoriaId: '', comisionEspecifica: '' });
    setError('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (product) => {
    setEditingProductId(product.id);
    setFormData({ ...product, comisionEspecifica: product.comisionEspecifica || '' });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre || !formData.precio || !formData.stock || !formData.costo || !formData.categoriaId) {
      setError("Por favor, completa todos los campos obligatorios.");
      return;
    }

    const productData = {
      nombre: formData.nombre,
      precio: Number(formData.precio),
      stock: Number(formData.stock),
      costo: Number(formData.costo),
      codigoDeBarras: formData.codigoDeBarras || '',
      categoriaId: formData.categoriaId,
      // Guardamos null si el campo está vacío para indicar que no hay comisión específica
      comisionEspecifica: formData.comisionEspecifica ? Number(formData.comisionEspecifica) : null
    };
    
    try {
      if (editingProductId) {
        await updateDoc(doc(db, 'productos', editingProductId), productData);
      } else {
        // Lógica de validación de duplicados (Optimizada para la creación)
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
    // Utilizamos una ventana de confirmación simple, idealmente sería un modal
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
  
  // Lógica para determinar la comisión a mostrar
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

  // --- Lógica de Filtrado y Paginación ---
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
  
  // Efecto para resetear la página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  return (
    <div className="p-4 bg-gray-50 rounded-lg min-h-[60vh]">
      {/* Encabezado y botones */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-700">Gestión de Productos</h2>
        <div className="flex items-center space-x-2">
           <button onClick={() => setIsScanning(!isScanning)} className="flex items-center px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all">
            <BarcodeIcon />
            {isScanning ? 'Cancelar' : 'Escanear'}
          </button>
          <button onClick={openModalForAdd} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all flex items-center">
                <PlusIcon className="w-4 h-4 mr-1"/>
            Agregar Producto
          </button>
        </div>
      </div>
      
      {/* Input de escaneo */}
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
      
      {/* Mensaje de error */}
      {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md mb-4">{error}</p>}

      {/* Tabla de productos */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Nombre</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Categoría</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Comisión</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Precio Venta</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Stock</th>
              <th className="px-6 py-3 font-semibold text-center text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedProducts.length === 0 ? (
                <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500 italic">No se encontraron productos.</td>
                </tr>
            ) : (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-800">{product.nombre}</td>
                    <td className="px-6 py-4 text-gray-500">{getCategory(product.categoriaId)?.nombre || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-800">{getEffectiveCommission(product)}</td>
                    <td className="px-6 py-4 text-green-600 font-semibold">${Number(product.precio).toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-600">{product.stock}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center space-x-4">
                        <button onClick={() => openModalForEdit(product)} className="text-blue-500 hover:text-blue-700"><EditIcon /></button>
                        <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-700"><DeleteIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Controles de Paginación */}
      {totalPages > 1 && (
          <div className="flex justify-center items-center mt-4 space-x-4">
              <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                  &larr; Anterior
              </button>
              <span className="text-sm text-gray-700">
                  Página {currentPage} de {totalPages}
              </span>
              <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                  Siguiente &rarr;
              </button>
          </div>
      )}

      {/* Modal para Agregar/Editar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
          <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
            <h3 className="text-lg font-medium">{editingProductId ? 'Editar Producto' : 'Agregar Nuevo Producto'}</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* Campos del formulario */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input id="productName" type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/>
                </div>
                <div>
                  <label htmlFor="productCategory" className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select id="productCategory" value={formData.categoriaId} onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })} className="w-full px-3 py-2 border rounded-md" required>
                    <option value="" disabled>Selecciona una categoría</option>
                    {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
                  </select>
                </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="productCost" className="block text-sm font-medium text-gray-700 mb-1">Costo</label>
                  <input id="productCost" type="number" step="0.01" value={formData.costo} onChange={(e) => setFormData({ ...formData, costo: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/>
                </div>
                <div>
                  <label htmlFor="productPrice" className="block text-sm font-medium text-gray-700 mb-1">Precio Venta</label>
                  <input id="productPrice" type="number" step="0.01" value={formData.precio} onChange={(e) => setFormData({ ...formData, precio: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/>
                </div>
              </div>
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="comisionEspecifica" className="block text-sm font-medium text-gray-700 mb-1">Comisión Específica (%)</label>
                  <input id="comisionEspecifica" type="number" step="0.1" placeholder="Opcional" value={formData.comisionEspecifica} onChange={(e) => setFormData({ ...formData, comisionEspecifica: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                  <label htmlFor="productStock" className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input id="productStock" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/>
                </div>
              </div>
              <div>
                <label htmlFor="productBarcode" className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label>
                <input id="productBarcode" type="text" value={formData.codigoDeBarras} onChange={(e) => setFormData({ ...formData, codigoDeBarras: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{error}</p>}
              <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border rounded-md">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;
