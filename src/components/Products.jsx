import React, { useState, useEffect, useMemo, useRef } from 'react';
// 1. IMPORTAMOS STORAGE Y FIRESTORE
import { db, storage } from '../firebase.js'; 
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs, limit } from 'firebase/firestore';
// 2. IMPORTAMOS FUNCIONES DE STORAGE
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- Iconos SVG ---
const EditIcon = (props) => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const DeleteIcon = (props) => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const BarcodeIcon = (props) => <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
const SearchIcon = (props) => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const PlusIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
const ListIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const ImageIcon = (props) => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

function Products() {
  const isAdmin = true; 

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  // ✅ NUEVO: Estado para las listas de precios globales
  const [globalPriceLists, setGlobalPriceLists] = useState([]); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isListManagerOpen, setIsListManagerOpen] = useState(false); // ✅ Modal del gestor de listas

  const [imageFile, setImageFile] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);

  // Estados visualización
  const [selectedPriceList, setSelectedPriceList] = useState(''); // '' = Precio Base
  
  // Estados para agregar precio en el modal de producto
  const [selectedListToAdd, setSelectedListToAdd] = useState(''); // ✅ Ahora es un ID o Nombre seleccionado
  const [nuevoPrecioLista, setNuevoPrecioLista] = useState('');
  
  // Estado para Crear Nueva Lista Global
  const [newGlobalListName, setNewGlobalListName] = useState('');

  const [formData, setFormData] = useState({ 
    nombre: '', precio: '', stock: '', codigoDeBarras: '', costo: '', categoriaId: '', comisionEspecifica: '', img: '', 
    preciosExtra: {}, 
    stockToAdd: '', stockToRemove: '', fechaVencimientoInput: '' 
  });

  const [editingProductId, setEditingProductId] = useState(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const scanInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15); 

  // 1. CARGA DE DATOS
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

  // ✅ NUEVO: Cargar las listas de precios globales desde Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'listas_precios'), (snapshot) => {
        setGlobalPriceLists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isScanning && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [isScanning]);


  // --- LOGICA DE LISTAS GLOBALES ---
  const handleCreateGlobalList = async () => {
      if(!newGlobalListName.trim()) return;
      try {
          // Guardamos el nombre tal cual
          await addDoc(collection(db, 'listas_precios'), { nombre: newGlobalListName.trim() });
          setNewGlobalListName('');
      } catch (error) {
          console.error("Error creando lista:", error);
          alert("Error al crear la lista");
      }
  };

  const handleDeleteGlobalList = async (id) => {
      if(window.confirm("¿Borrar esta lista? (No afectará los precios ya guardados en productos, pero no podrás seleccionarla para nuevos)")){
          try {
              await deleteDoc(doc(db, 'listas_precios', id));
          } catch (error) {
              console.error("Error borrando lista:", error);
          }
      }
  };


  // --- HELPERS PRECIOS ---
  const getDisplayPrice = (product) => {
    if (selectedPriceList && product.preciosExtra && product.preciosExtra[selectedPriceList]) {
        return Number(product.preciosExtra[selectedPriceList]);
    }
    return Number(product.precio);
  };

  // ✅ Modificado para usar el Select
  const handleAddPrecioExtra = () => {
    if (!selectedListToAdd || !nuevoPrecioLista) return;
    
    setFormData(prev => ({
        ...prev,
        preciosExtra: {
            ...prev.preciosExtra,
            [selectedListToAdd]: Number(nuevoPrecioLista) // Usamos la lista seleccionada como KEY
        }
    }));
    setSelectedListToAdd('');
    setNuevoPrecioLista('');
  };

  const handleRemovePrecioExtra = (key) => {
    const copia = { ...formData.preciosExtra };
    delete copia[key];
    setFormData(prev => ({ ...prev, preciosExtra: copia }));
  };

  // --- IMAGEN & MODALES ---
  const handleImageChange = (e) => {
    if (e.target.files[0]) setImageFile(e.target.files[0]);
  };

  const openModalForAdd = () => {
    setEditingProductId(null);
    setFormData({ 
        nombre: '', precio: '', stock: '', codigoDeBarras: '', costo: '', categoriaId: '', comisionEspecifica: '', img: '',
        preciosExtra: {}, 
        stockToAdd: '', stockToRemove: '', fechaVencimientoInput: '' 
    });
    setImageFile(null); 
    setError('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (product) => {
    setEditingProductId(product.id);
    setFormData({ 
        ...product, 
        comisionEspecifica: product.comisionEspecifica || '',
        img: product.img || '', 
        preciosExtra: product.preciosExtra || {}, 
        stockToAdd: '', stockToRemove: '', fechaVencimientoInput: '' 
    });
    setImageFile(null); 
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre || !formData.precio || !formData.costo || !formData.categoriaId) {
      setError("Por favor, completa todos los campos obligatorios.");
      return;
    }

    setIsUploading(true); 

    try {
        let imageUrl = formData.img; 
        if (imageFile) {
            const storageRef = ref(storage, `productos/${Date.now()}_${imageFile.name}`);
            await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(storageRef);
        }

        let finalStock = Number(formData.stock) || 0;
        let historialLotesActualizado = editingProductId 
            ? (products.find(p => p.id === editingProductId)?.historialLotes || []) 
            : [];

        if (editingProductId) {
            const toAdd = Number(formData.stockToAdd) || 0;
            const toRemove = Number(formData.stockToRemove) || 0;

            if (toRemove > 0 && !isAdmin) {
                setError("Solo los administradores pueden descontar stock.");
                setIsUploading(false); return;
            }
            if (toAdd > 0 && !formData.fechaVencimientoInput) {
                setError("Si agregas stock, debes ingresar la fecha de vencimiento.");
                setIsUploading(false); return;
            }
            finalStock = finalStock + toAdd - toRemove;
            if (finalStock < 0) {
                setError("El stock no puede ser negativo.");
                setIsUploading(false); return;
            }
            if (toAdd > 0) {
                historialLotesActualizado.push({
                    fechaIngreso: new Date().toISOString(),
                    cantidad: toAdd,
                    fechaVencimiento: formData.fechaVencimientoInput
                });
            }
        } else {
            if (!formData.fechaVencimientoInput) {
                setError("Ingresa la fecha de vencimiento inicial.");
                setIsUploading(false); return;
            }
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
            stock: finalStock,
            historialLotes: historialLotesActualizado,
            codigoDeBarras: formData.codigoDeBarras || '',
            categoriaId: formData.categoriaId,
            comisionEspecifica: formData.comisionEspecifica ? Number(formData.comisionEspecifica) : null,
            img: imageUrl,
            preciosExtra: formData.preciosExtra 
        };
    
        if (editingProductId) {
            await updateDoc(doc(db, 'productos', editingProductId), productData);
        } else {
            // Validar duplicados (simplificado)
            const qNombre = query(collection(db, "productos"), where("nombre", "==", productData.nombre), limit(1));
            if (!(await getDocs(qNombre)).empty) { setError("Nombre duplicado."); setIsUploading(false); return; }
            
            await addDoc(collection(db, 'productos'), productData);
        }
        setIsModalOpen(false);
    } catch (err) {
      console.error("Error al guardar:", err);
      setError("No se pudo guardar el producto.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (window.confirm("¿Eliminar producto?")) {
      try { await deleteDoc(doc(db, 'productos', id)); } catch (error) { console.error(error); }
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

  const getCategory = (id) => categories.find(c => c.id === id);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory ? product.categoriaId === selectedCategory : true;
      const matchesSearch = searchTerm ? (product.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;
      return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, selectedCategory]);
  
  const paginatedProducts = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // --- RENDER ---
  return (
    <div className="p-4 bg-gray-50 rounded-lg min-h-[60vh]">
      
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-700">Gestión de Productos</h2>
        <div className="flex items-center space-x-2">
           <button onClick={() => setIsScanning(!isScanning)} className="flex items-center px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg shadow-md hover:bg-gray-700">
            <BarcodeIcon /> {isScanning ? 'Cancelar' : 'Escanear'}
          </button>
          
          {/* ✅ NUEVO BOTÓN: GESTIONAR LISTAS */}
          <button onClick={() => setIsListManagerOpen(true)} className="px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 flex items-center">
             <ListIcon className="w-4 h-4 mr-2"/> Listas Precios
          </button>

          <button onClick={openModalForAdd} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 flex items-center">
             <PlusIcon className="w-4 h-4 mr-1"/> Agregar Producto
          </button>
        </div>
      </div>
      
      {isScanning && (
        <div className="mb-4">
          <input ref={scanInputRef} type="text" placeholder="Escanea aquí..." className="w-full px-4 py-2 text-lg font-mono border-2 border-indigo-500 rounded-lg" value={scanInput} onChange={(e) => setScanInput(e.target.value)} onKeyDown={handleScan} />
        </div>
      )}

      {/* FILTROS & VISUALIZACIÓN */}
      <div className="flex flex-wrap items-center space-x-4 mb-4">
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon /></span>
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="border rounded-lg px-4 py-2">
            <option value="">Todas las Categorías</option>
            {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
        </select>
        {/* SELECTOR LISTA VISUALIZACIÓN */}
        <select value={selectedPriceList} onChange={(e) => setSelectedPriceList(e.target.value)} className="border rounded-lg px-4 py-2 bg-yellow-50 border-yellow-300 text-yellow-800 font-medium">
            <option value="">Precio Base</option>
            {globalPriceLists.map(list => (
                <option key={list.id} value={list.nombre}>Lista: {list.nombre}</option>
            ))}
        </select>
      </div>
      
      {error && <p className="text-red-600 bg-red-100 p-2 rounded mb-4">{error}</p>}

      {/* TABLA DE PRODUCTOS */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Img</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Nombre</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Categoría</th>
              {/* Encabezado dinámico */}
              <th className="px-6 py-3 text-left font-semibold text-gray-600">
                 {selectedPriceList ? `Precio (${selectedPriceList})` : 'Precio Venta'}
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Stock</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedProducts.map((product) => {
                  const displayedPrice = getDisplayPrice(product);
                  const isSpecialPrice = selectedPriceList && product.preciosExtra && product.preciosExtra[selectedPriceList];

                  return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                        {product.img ? <img src={product.img} className="w-10 h-10 object-cover rounded border" /> : <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center"><ImageIcon /></div>}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">{product.nombre}</td>
                    <td className="px-6 py-4 text-gray-500">{getCategory(product.categoriaId)?.nombre || '-'}</td>
                    <td className="px-6 py-4">
                        <span className={`font-bold ${isSpecialPrice ? 'text-purple-600' : 'text-green-600'}`}>
                            ${displayedPrice.toFixed(2)}
                        </span>
                        {selectedPriceList && !isSpecialPrice && <span className="text-xs text-gray-400 ml-2">(Base)</span>}
                    </td>
                    <td className={`px-6 py-4 font-bold ${product.stock < 10 ? 'text-red-600' : 'text-gray-600'}`}>
                        {product.stock}
                    </td>
                    <td className="px-6 py-4 text-center space-x-3">
                        <button onClick={() => openModalForEdit(product)} className="text-blue-600"><EditIcon /></button>
                        {isAdmin && <button onClick={() => handleDelete(product.id)} className="text-red-600"><DeleteIcon /></button>}
                    </td>
                  </tr>
                )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex justify-center mt-4 space-x-2">
          <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">Anterior</button>
          <span className="px-3 py-1">Página {currentPage} de {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Siguiente</button>
      </div>

      {/* ✅ MODAL GESTOR DE LISTAS */}
      {isListManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Administrar Nombres de Listas</h3>
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        placeholder="Nueva lista (Ej: Mayorista)" 
                        className="border p-2 rounded flex-1"
                        value={newGlobalListName}
                        onChange={(e) => setNewGlobalListName(e.target.value)}
                    />
                    <button onClick={handleCreateGlobalList} className="bg-green-600 text-white px-4 rounded font-bold">+</button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {globalPriceLists.length === 0 && <p className="text-gray-400 text-sm">No hay listas creadas.</p>}
                    {globalPriceLists.map(list => (
                        <div key={list.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                            <span className="font-medium">{list.nombre}</span>
                            <button onClick={() => handleDeleteGlobalList(list.id)} className="text-red-500 hover:text-red-700">Eliminar</button>
                        </div>
                    ))}
                </div>
                <button onClick={() => setIsListManagerOpen(false)} className="mt-4 w-full py-2 bg-gray-200 rounded text-gray-700 font-semibold">Cerrar</button>
            </div>
        </div>
      )}

      {/* MODAL PRODUCTO (ADD/EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold mb-4 border-b pb-2">{editingProductId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              
              {/* IMAGEN */}
              <div className="flex items-center space-x-4 bg-gray-50 p-3 rounded border">
                <div className="w-20 h-20 bg-white border border-dashed flex items-center justify-center overflow-hidden">
                    {imageFile ? <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover"/> : (formData.img ? <img src={formData.img} className="w-full h-full object-cover"/> : <span className="text-xs text-gray-400">Sin img</span>)}
                </div>
                <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm text-gray-500"/>
              </div>

              {/* CAMPOS BASICOS */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium">Nombre *</label><input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full p-2 border rounded" required/></div>
                <div>
                    <label className="block text-sm font-medium">Categoría *</label>
                    <select value={formData.categoriaId} onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })} className="w-full p-2 border rounded" required>
                        <option value="" disabled>Seleccionar...</option>
                        {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium">Costo *</label><input type="number" step="0.01" value={formData.costo} onChange={(e) => setFormData({ ...formData, costo: e.target.value })} className="w-full p-2 border rounded" required/></div>
                  <div><label className="block text-sm font-medium">Precio Base *</label><input type="number" step="0.01" value={formData.precio} onChange={(e) => setFormData({ ...formData, precio: e.target.value })} className="w-full p-2 border rounded" required/></div>
                  <div><label className="block text-sm font-medium">Cód. Barras</label><input type="text" value={formData.codigoDeBarras} onChange={(e) => setFormData({ ...formData, codigoDeBarras: e.target.value })} className="w-full p-2 border rounded" /></div>
              </div>

              {/* ✅ SECCIÓN PRECIOS EXTRA */}
              <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                <h4 className="text-sm font-bold text-yellow-800 mb-2 uppercase">Precios por Lista</h4>
                
                <div className="flex gap-2 mb-3">
                    {/* SELECTOR DE LISTAS DISPONIBLES */}
                    <select 
                        value={selectedListToAdd} 
                        onChange={(e) => setSelectedListToAdd(e.target.value)} 
                        className="border p-2 rounded flex-1 text-sm bg-white"
                    >
                        <option value="">-- Seleccionar Lista --</option>
                        {globalPriceLists.map(l => (
                            <option key={l.id} value={l.nombre}>{l.nombre}</option>
                        ))}
                    </select>

                    <input 
                        type="number" 
                        placeholder="Precio" 
                        className="border p-2 rounded w-24 text-sm"
                        value={nuevoPrecioLista}
                        onChange={(e) => setNuevoPrecioLista(e.target.value)}
                    />
                    <button type="button" onClick={handleAddPrecioExtra} className="bg-yellow-600 text-white px-3 rounded text-sm font-bold">+</button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {Object.entries(formData.preciosExtra || {}).length === 0 && <p className="text-xs text-gray-400 italic">Sin precios extra.</p>}
                    {Object.entries(formData.preciosExtra || {}).map(([nombre, valor]) => (
                        <div key={nombre} className="bg-white border border-yellow-300 px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-sm">
                            <span className="font-bold text-gray-700">{nombre}:</span>
                            <span className="text-green-700 font-bold">${valor}</span>
                            <button type="button" onClick={() => handleRemovePrecioExtra(nombre)} className="text-red-400 font-bold ml-1">×</button>
                        </div>
                    ))}
                </div>
                {globalPriceLists.length === 0 && (
                    <p className="text-xs text-red-500 mt-2">* No tienes listas creadas. Usa el botón "Listas Precios" en el menú principal para crear una (ej: Mayorista).</p>
                )}
              </div>

              <hr />

              {/* STOCK */}
              <h4 className="text-md font-bold text-indigo-700">Stock</h4>
              {editingProductId ? (
                <div className="bg-gray-50 p-3 rounded border grid grid-cols-2 gap-4">
                    <div className="col-span-2 text-right font-bold text-gray-800">Actual: {formData.stock} u.</div>
                    <div><label className="text-xs font-bold text-green-700">+ Agregar</label><input type="number" className="w-full p-1 border border-green-300 rounded" value={formData.stockToAdd} onChange={(e) => setFormData({...formData, stockToAdd: e.target.value})}/></div>
                    <div><label className="text-xs font-medium">Vencimiento *</label><input type="date" className="w-full p-1 border rounded" value={formData.fechaVencimientoInput} onChange={(e) => setFormData({...formData, fechaVencimientoInput: e.target.value})}/></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded border">
                     <div><label className="text-sm font-medium">Stock Inicial</label><input type="number" className="w-full p-2 border rounded" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})}/></div>
                     <div><label className="text-sm font-medium">Vencimiento</label><input type="date" className="w-full p-2 border rounded" value={formData.fechaVencimientoInput} onChange={(e) => setFormData({...formData, fechaVencimientoInput: e.target.value})}/></div>
                </div>
              )}

              <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border rounded hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={isUploading} className="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">{isUploading ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;