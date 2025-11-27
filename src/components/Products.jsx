import React, { useState, useEffect, useMemo, useRef } from 'react';
// 1. IMPORTAMOS STORAGE Y FIRESTORE
import { db, storage } from '../firebase.js'; 
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs, limit } from 'firebase/firestore';
// 2. IMPORTAMOS FUNCIONES DE STORAGE
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Button from './Button'; // Asegúrate de la ruta correcta
// --- ICONOGRAFÍA PREMIUM (Stroke 1.5, Rounded) ---
const EditIcon = (props) => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
const DeleteIcon = (props) => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456-1.278A11.862 11.862 0 0020.62 6m-14.456.374a11.862 11.862 0 00-.87 5.143" /></svg>;
const BarcodeIcon = (props) => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" /></svg>;
const SearchIcon = (props) => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const PlusIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const ListIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
const ImageIcon = (props) => <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
const XIcon = (props) => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const CloudUploadIcon = (props) => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>;

function Products() {
  const isAdmin = true; 

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [globalPriceLists, setGlobalPriceLists] = useState([]); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isListManagerOpen, setIsListManagerOpen] = useState(false);

  const [imageFile, setImageFile] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);

  const [selectedPriceList, setSelectedPriceList] = useState(''); 
  
  const [selectedListToAdd, setSelectedListToAdd] = useState(''); 
  const [nuevoPrecioLista, setNuevoPrecioLista] = useState('');
  
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
          await addDoc(collection(db, 'listas_precios'), { nombre: newGlobalListName.trim() });
          setNewGlobalListName('');
      } catch (error) {
          console.error("Error creando lista:", error);
          alert("Error al crear la lista");
      }
  };

  const handleDeleteGlobalList = async (id) => {
      if(window.confirm("¿Borrar esta lista?")){
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

  const handleAddPrecioExtra = () => {
    if (!selectedListToAdd || !nuevoPrecioLista) return;
    
    setFormData(prev => ({
        ...prev,
        preciosExtra: {
            ...prev.preciosExtra,
            [selectedListToAdd]: Number(nuevoPrecioLista)
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
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Inventario</h2>
            <p className="text-slate-500 mt-1 font-medium">Gestión de stock, precios y productos</p>
        </div>
        <div className="flex flex-wrap gap-3">
            <button 
                onClick={() => setIsScanning(!isScanning)} 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm border ${isScanning ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            >
                <BarcodeIcon className="w-5 h-5" /> 
                {isScanning ? 'Cancelar Escaneo' : 'Escanear'}
            </button>
            
            <button 
                onClick={() => setIsListManagerOpen(true)} 
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all"
            >
                <ListIcon className="w-5 h-5"/> 
                Listas
            </button>

          <Button onClick={openModalForAdd} icon={<PlusIcon className="w-5 h-5"/>}>
    Nuevo
</Button>
        </div>
      </div>
      
      {isScanning && (
        <div className="mb-6 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <BarcodeIcon className="w-6 h-6 text-indigo-500 animate-pulse"/>
            </div>
            <input 
                ref={scanInputRef} 
                type="text" 
                placeholder="Escanea el código de barras aquí..." 
                className="w-full pl-12 pr-4 py-4 text-xl font-mono bg-white border-2 border-indigo-500 rounded-2xl shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all" 
                value={scanInput} 
                onChange={(e) => setScanInput(e.target.value)} 
                onKeyDown={handleScan} 
            />
          </div>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-12 gap-2">
        <div className="md:col-span-5 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><SearchIcon /></span>
            <input 
                type="text" 
                placeholder="Buscar producto..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none" 
            />
        </div>
        <div className="md:col-span-4">
            <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)} 
                className="w-full py-2.5 px-4 bg-slate-50 border-transparent rounded-xl text-sm font-medium text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
                <option value="">Todas las Categorías</option>
                {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
            </select>
        </div>
        <div className="md:col-span-3">
            <select 
                value={selectedPriceList} 
                onChange={(e) => setSelectedPriceList(e.target.value)} 
                className="w-full py-2.5 px-4 bg-amber-50 text-amber-700 border-transparent rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
            >
                <option value="">Precio Base (General)</option>
                {globalPriceLists.map(list => (
                    <option key={list.id} value={list.nombre}>Lista: {list.nombre}</option>
                ))}
            </select>
        </div>
      </div>
      
      {error && <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> {error}</div>}

      {/* TABLA ESTILO IOS CLEAN (U-Border + Hover) */}
      <div className="overflow-hidden rounded-2xl shadow-sm bg-transparent"> 
        <table className="min-w-full whitespace-nowrap border-separate border-spacing-y-0">
            <thead>
                <tr className="bg-slate-100 border-t border-x border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-l border-t border-slate-200 rounded-tl-2xl">Producto</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-t border-slate-200">Categoría</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-t border-slate-200">
                        {selectedPriceList ? <span className="text-amber-600">Precio ({selectedPriceList})</span> : 'Precio Venta'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-t border-slate-200">Stock</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-r border-t border-slate-200 rounded-tr-2xl">Acciones</th>
                </tr>
            </thead>
            <tbody>
                {paginatedProducts.map((product, index) => {
                    const displayedPrice = getDisplayPrice(product);
                    const isSpecialPrice = selectedPriceList && product.preciosExtra && product.preciosExtra[selectedPriceList];
                    const isLast = index === paginatedProducts.length - 1;

                    return (
                    <tr key={product.id} className="group">
                        {/* Celdas con Hover Effect sincronizado */}
                        <td className={`px-6 py-4 bg-white group-hover:bg-indigo-50/60 transition-colors border-b border-l border-slate-200 ${isLast ? 'rounded-bl-2xl' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {product.img ? <img src={product.img} className="h-full w-full object-cover" alt="" /> : <ImageIcon className="w-6 h-6 text-slate-300"/>}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900">{product.nombre}</div>
                                    {product.codigoDeBarras && <div className="text-xs text-slate-400 font-mono mt-0.5">{product.codigoDeBarras}</div>}
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 bg-white group-hover:bg-indigo-50/60 transition-colors border-b border-slate-200">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-100">
                                {getCategory(product.categoriaId)?.nombre || 'Sin cat.'}
                            </span>
                        </td>
                        <td className="px-6 py-4 bg-white group-hover:bg-indigo-50/60 transition-colors border-b border-slate-200">
                            <div className="flex flex-col">
                                <span className={`text-sm font-bold ${isSpecialPrice ? 'text-amber-600' : 'text-slate-700'}`}>
                                    ${displayedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </span>
                                {selectedPriceList && !isSpecialPrice && <span className="text-[10px] text-slate-400 uppercase font-bold">Base</span>}
                            </div>
                        </td>
                        <td className="px-6 py-4 bg-white group-hover:bg-indigo-50/60 transition-colors border-b border-slate-200">
                            <div className="flex items-center">
                                <span className={`text-sm font-bold ${product.stock < 10 ? 'text-red-600' : 'text-slate-700'}`}>
                                    {product.stock} u.
                                </span>
                                {product.stock < 10 && <span className="ml-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                            </div>
                        </td>
                        <td className={`px-6 py-4 text-right bg-white group-hover:bg-indigo-50/60 transition-colors border-b border-r border-slate-200 ${isLast ? 'rounded-br-2xl' : ''}`}>
                            <div className="flex items-center justify-end gap-2">
                                <button onClick={() => openModalForEdit(product)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"><EditIcon /></button>
                                {isAdmin && <button onClick={() => handleDelete(product.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><DeleteIcon /></button>}
                            </div>
                        </td>
                    </tr>
                    )
                })}
            </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">Anterior</button>
            <span className="px-4 py-2 bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-lg shadow-sm">{currentPage} de {totalPages}</span>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">Siguiente</button>
        </div>
      )}

      {/* ✅ MODAL GESTOR DE LISTAS (Fondo Slate-50 / Inputs White) */}
      {isListManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-50 p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Listas de Precios</h3>
                    <button onClick={() => setIsListManagerOpen(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400"><XIcon className="w-5 h-5"/></button>
                </div>
                
                <div className="flex gap-2 mb-6">
                    <input 
                        type="text" 
                        placeholder="Ej: Mayorista, Kiosco..." 
                        className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={newGlobalListName}
                        onChange={(e) => setNewGlobalListName(e.target.value)}
                    />
                    <button onClick={handleCreateGlobalList} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200"><PlusIcon /></button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {globalPriceLists.length === 0 && <div className="text-center py-8 text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-xl bg-slate-100/50">No hay listas configuradas.</div>}
                    {globalPriceLists.map(list => (
                        <div key={list.id} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-indigo-200 transition-colors">
                            <span className="font-semibold text-slate-700 text-sm">{list.nombre}</span>
                            <button onClick={() => handleDeleteGlobalList(list.id)} className="text-slate-300 hover:text-red-500 transition-colors"><DeleteIcon className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* MODAL PRODUCTO (ADD/EDIT - Fondo Slate-50 / Inputs White) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-50 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            
            {/* HEADER MODAL */}
            <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 z-10">
                <h3 className="text-xl font-bold text-slate-800">{editingProductId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"><XIcon/></button>
            </div>
            
            <div className="overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                <form onSubmit={handleSave} className="space-y-8">
                    
                    {/* SECCIÓN 1: INFO PRINCIPAL */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* UPLOAD IMAGEN */}
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Imagen</label>
                            <div className="aspect-square bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-300 transition-colors cursor-pointer shadow-sm">
                                {imageFile ? (
                                    <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover"/>
                                ) : formData.img ? (
                                    <img src={formData.img} className="w-full h-full object-cover"/>
                                ) : (
                                    <div className="text-center p-4">
                                        <CloudUploadIcon className="w-8 h-8 text-slate-300 mx-auto mb-2"/>
                                        <span className="text-xs text-slate-400 font-medium">Subir foto</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer"/>
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                    <p className="text-white text-xs font-bold">Cambiar</p>
                                </div>
                            </div>
                        </div>

                        {/* CAMPOS DE TEXTO */}
                        <div className="md:col-span-2 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre del Producto *</label>
                                <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Categoría *</label>
                                    <select value={formData.categoriaId} onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" required>
                                        <option value="" disabled>Seleccionar...</option>
                                        {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Cód. Barras</label>
                                    <input type="text" value={formData.codigoDeBarras} onChange={(e) => setFormData({ ...formData, codigoDeBarras: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-200" />

                    {/* SECCIÓN 2: PRECIOS Y COSTOS */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-indigo-500 rounded-full"></span> Precios y Costos
                        </h4>
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Costo Unitario</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-2.5 text-slate-400 font-bold">$</span>
                                    <input type="number" step="0.01" value={formData.costo} onChange={(e) => setFormData({ ...formData, costo: e.target.value })} className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" required/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Precio Venta Base</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-2.5 text-slate-400 font-bold">$</span>
                                    <input type="number" step="0.01" value={formData.precio} onChange={(e) => setFormData({ ...formData, precio: e.target.value })} className="w-full pl-8 pr-4 py-2.5 bg-white border border-green-200 rounded-xl text-green-700 font-bold shadow-sm focus:ring-2 focus:ring-green-500 outline-none" required/>
                                </div>
                            </div>
                        </div>

                        {/* PRECIOS EXTRA CARD */}
                        <div className="bg-white border border-amber-100 rounded-xl p-5 shadow-sm">
                            <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">Listas de Precios Adicionales</label>
                            <div className="flex gap-3 mb-4">
                                <select value={selectedListToAdd} onChange={(e) => setSelectedListToAdd(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 border border-amber-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none">
                                    <option value="">-- Seleccionar Lista --</option>
                                    {globalPriceLists.map(l => (<option key={l.id} value={l.nombre}>{l.nombre}</option>))}
                                </select>
                                <div className="relative w-32">
                                    <span className="absolute left-3 top-2 text-amber-400 font-bold text-xs">$</span>
                                    <input type="number" placeholder="0.00" className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-amber-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500" value={nuevoPrecioLista} onChange={(e) => setNuevoPrecioLista(e.target.value)}/>
                                </div>
                                <button type="button" onClick={handleAddPrecioExtra} className="bg-amber-500 text-white px-4 rounded-lg font-bold hover:bg-amber-600 shadow-sm transition-colors">+</button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {Object.entries(formData.preciosExtra || {}).length === 0 && <p className="text-xs text-amber-400/70 italic">No hay precios diferenciados configurados.</p>}
                                {Object.entries(formData.preciosExtra || {}).map(([nombre, valor]) => (
                                    <div key={nombre} className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-sm">
                                        <span className="font-bold text-slate-600">{nombre}</span>
                                        <span className="text-amber-600 font-bold bg-white px-1.5 rounded border border-amber-100">${valor}</span>
                                        <button type="button" onClick={() => handleRemovePrecioExtra(nombre)} className="text-slate-400 hover:text-red-500 font-bold text-lg leading-none ml-1">×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-200" />

                    {/* SECCIÓN 3: STOCK */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-blue-500 rounded-full"></span> Gestión de Stock
                        </h4>
                        {editingProductId ? (
                            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm font-medium text-slate-500">Stock Actual en Sistema</span>
                                    <span className="text-2xl font-bold text-slate-800">{formData.stock} <span className="text-sm font-normal text-slate-400">unidades</span></span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Agregar Stock (+)</label>
                                        <input type="number" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-blue-600 outline-none focus:border-blue-500 transition-all" placeholder="0" value={formData.stockToAdd} onChange={(e) => setFormData({...formData, stockToAdd: e.target.value})}/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Vencimiento (Lote)</label>
                                        <input type="date" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-600 outline-none focus:border-blue-500 transition-all" value={formData.fechaVencimientoInput} onChange={(e) => setFormData({...formData, fechaVencimientoInput: e.target.value})}/>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Stock Inicial</label>
                                    <input type="number" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm" placeholder="0" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vencimiento</label>
                                    <input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-600 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm" value={formData.fechaVencimientoInput} onChange={(e) => setFormData({...formData, fechaVencimientoInput: e.target.value})}/>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FOOTER FORM */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors">Cancelar</button>
                        <button type="submit" disabled={isUploading} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:translate-y-0">
                            {isUploading ? 'Guardando...' : 'Guardar Producto'}
                        </button>
                    </div>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;