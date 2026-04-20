import React, { useState, useEffect, useMemo, useRef } from 'react';
import { storage } from '../firebase.js'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, deleteDoc, query, where, getDocs, limit, writeBatch, collection } from 'firebase/firestore';
import Button from './Button'; 
import { toast } from 'react-toastify'; 
import { useFirestore } from '../hooks/useFirestore';
import * as XLSX from 'xlsx';

// --- ICONOGRAFÍA (SVG Optimizada) ---
const Icon = ({ d, className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const EditIcon = () => <Icon d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />;
const DeleteIcon = () => <Icon d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456-1.278A11.862 11.862 0 0020.62 6m-14.456.374a11.862 11.862 0 00-.87 5.143" />;
const BarcodeIcon = () => <Icon d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />;
const SearchIcon = () => <Icon d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />;
const PlusIcon = () => <Icon d="M12 4.5v15m7.5-7.5h-15" />;
const ListIcon = () => <Icon d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />;
const TagIcon = () => <Icon d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.703.542A9.003 9.003 0 0021 11.751V7.5a2.25 2.25 0 00-2.25-2.25h-4.318a2.25 2.25 0 01-1.591-.659L9.568 3z" />;
const ImageIcon = () => <Icon d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" className="w-6 h-6 text-slate-300"/>;
const XIcon = () => <Icon d="M6 18L18 6M6 6l12 12" />;
const CloudUploadIcon = () => <Icon d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" className="w-8 h-8"/>;
const TrendingUpIcon = () => <Icon d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />;
const CheckIcon = () => <Icon d="M5 13l4 4L19 7" className="w-4 h-4"/>;
const FireIcon = () => <Icon d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />;

// --- UTILIDAD DE OPTIMIZACIÓN (CENTER CROP A WEBP) ---
const optimizeProductImage = (file, size = 800) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;

        // Lógica de Center Crop (Zoom para llenar el cuadrado)
        const originalWidth = img.width;
        const originalHeight = img.height;
        const sourceSize = Math.min(originalWidth, originalHeight);
        const sx = (originalWidth - sourceSize) / 2;
        const sy = (originalHeight - sourceSize) / 2;

        ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, size, size);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Error al comprimir imagen"));
        }, 'image/webp', 0.85);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

function Products() {
  const { onTenantSnapshot, getTenantCollection, getTenantDoc, addTenantDoc, updateTenantDoc, deleteTenantDoc, tenantId, db } = useFirestore();
  const isAdmin = true; 

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [marcas, setMarcas] = useState([]); 
  const [proveedores, setProveedores] = useState([]);
  const [globalPriceLists, setGlobalPriceLists] = useState([]); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isListManagerOpen, setIsListManagerOpen] = useState(false);
  const [isBrandManagerOpen, setIsBrandManagerOpen] = useState(false);

  // --- ESTADOS AUMENTO MASIVO ---
  const [isMassUpdateOpen, setIsMassUpdateOpen] = useState(false);
  const [massUpdateMode, setMassUpdateMode] = useState('marca'); 
  const [selectedBrandForUpdate, setSelectedBrandForUpdate] = useState('');
  const [selectedCategoryForUpdate, setSelectedCategoryForUpdate] = useState('');
  const [selectedProductsForUpdate, setSelectedProductsForUpdate] = useState([]); 
  const [percentCost, setPercentCost] = useState('');
  const [percentPrice, setPercentPrice] = useState('');
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [isUpdatingMassive, setIsUpdatingMassive] = useState(false);

  const [imageFile, setImageFile] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);

  // --- ESTADOS PARA SUBIDA RÁPIDA (HOVER + CTRL+V) ---
  const [hoveredProductId, setHoveredProductId] = useState(null); 
  const fileInputRef = useRef(null); 
  const [isProcessingQuick, setIsProcessingQuick] = useState(false);

  const [selectedPriceList, setSelectedPriceList] = useState(''); 
  const [selectedListToAdd, setSelectedListToAdd] = useState(''); 
  const [nuevoPrecioLista, setNuevoPrecioLista] = useState('');
  
  const [newGlobalListName, setNewGlobalListName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');

  const [formData, setFormData] = useState({ 
    nombre: '', precio: '', stock: '', codigoDeBarras: '', costo: '', categoriaId: '', marca: '', proveedorId: '', ivaAlicuota: 21, costoIncluyeIva: true, comisionEspecifica: '', img: '', 
    preciosExtra: {}, stockToAdd: '', stockToRemove: '', fechaVencimientoInput: '',
    tipo: 'producto', numeroSerie: '', fechaServicio: '', visibleEnCatalogo: true // CAMPOS MATA FUEGOS
  });

  const [editingProductId, setEditingProductId] = useState(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const scanInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; 

  // --- CARGA DE DATOS MULTI-TENANT ---
  useEffect(() => { 
    if (!tenantId) return;
    const u = onTenantSnapshot('productos', (s) => { 
        setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))); 
        // Eliminado setCurrentPage(1) de aquí para evitar saltos al subir fotos (Ctrl+V)
    }); 
    const u2 = onTenantSnapshot('categorias', (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() }))), [{ field: 'nombre' }]);
    const u3 = onTenantSnapshot('marcas', (s) => setMarcas(s.docs.map(d => ({ id: d.id, ...d.data() }))), [{ field: 'nombre' }]);
    const u4 = onTenantSnapshot('proveedores', (s) => setProveedores(s.docs.map(d => ({ id: d.id, ...d.data() }))), [{ field: 'nombre' }]);
    const u5 = onTenantSnapshot('listas_precios', (s) => setGlobalPriceLists(s.docs.map(d => ({ id: d.id, ...d.data() }))), [{ field: 'nombre' }]);
    return () => { u(); u2(); u3(); u4(); u5(); };
  }, [tenantId]);

  useEffect(() => { if (isScanning && scanInputRef.current) scanInputRef.current.focus(); }, [isScanning]);

  // ✅ CONTROL DE RESET DE PÁGINA: Solo cuando el usuario cambia un filtro activamente
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedProvider]);

  // --- SOPORTE CTRL + V (CLIPBOARD) ---
  useEffect(() => {
    const handlePaste = async (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      let pastedFile = null;
      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          pastedFile = item.getAsFile();
          break;
        }
      }

      if (!pastedFile) return;

      if (isModalOpen) {
        setImageFile(pastedFile);
        toast.info("¡Imagen pegada al formulario!");
      } else if (hoveredProductId) {
        // Subida rápida desde el listado
        handleQuickImageUpload(pastedFile, hoveredProductId);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isModalOpen, hoveredProductId]);

  const handleQuickImageUpload = async (file, productId) => {
    if (isProcessingQuick) return;
    setIsProcessingQuick(true);
    const tId = toast.loading("Optimizando y subiendo imagen...");
    try {
      const [stdBlob, thumbBlob] = await Promise.all([
        optimizeProductImage(file, 800),
        optimizeProductImage(file, 300)
      ]);

      const timestamp = Date.now();
      const sRef = ref(storage, `productos/${tenantId}/std_${timestamp}.webp`);
      const tRef = ref(storage, `productos/${tenantId}/thumb_${timestamp}.webp`);

      await Promise.all([uploadBytes(sRef, stdBlob), uploadBytes(tRef, thumbBlob)]);
      const [imageUrl, imageThumbUrl] = await Promise.all([getDownloadURL(sRef), getDownloadURL(tRef)]);

      await updateTenantDoc('productos', productId, {
        img: imageUrl,
        imgThumb: imageThumbUrl
      });
      toast.update(tId, { render: "¡Imagen actualizada correctamente!", type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      console.error(error);
      toast.update(tId, { render: "Error al subir imagen", type: "error", isLoading: false, autoClose: 3000 });
    } finally {
      setIsProcessingQuick(false);
    }
  };

  // --- AUMENTO MASIVO ---
  useEffect(() => {
      if (massUpdateMode === 'marca' && selectedBrandForUpdate) {
          const matchingIds = products.filter(p => p.marca === selectedBrandForUpdate).map(p => p.id);
          setSelectedProductsForUpdate(matchingIds);
      } else if (massUpdateMode === 'categoria' && selectedCategoryForUpdate) {
          const matchingIds = products.filter(p => p.categoriaId === selectedCategoryForUpdate).map(p => p.id);
          setSelectedProductsForUpdate(matchingIds);
      } else {
          if (massUpdateMode !== 'manual') setSelectedProductsForUpdate([]);
      }
  }, [massUpdateMode, selectedBrandForUpdate, selectedCategoryForUpdate, products]);

  const toggleProductSelection = (id) => {
      setSelectedProductsForUpdate(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const handleMassUpdate = async () => {
      const count = selectedProductsForUpdate.length;
      if (count === 0) return toast.error("No hay productos seleccionados.");
      if (!percentCost && !percentPrice) return toast.error("Ingresa al menos un porcentaje.");

      if (!window.confirm(`¿Actualizar ${count} productos?\n\nCosto: ${percentCost || 0}%\nVenta: ${percentPrice || 0}%`)) return;

      setIsUpdatingMassive(true);
      const factorCosto = 1 + (Number(percentCost) || 0) / 100;
      const factorPrecio = 1 + (Number(percentPrice) || 0) / 100;
      const productsToUpdate = products.filter(p => selectedProductsForUpdate.includes(p.id));

      try {
          const batchSize = 400; 
          for (let i = 0; i < productsToUpdate.length; i += batchSize) {
              const batch = writeBatch(db);
              const chunk = productsToUpdate.slice(i, i + batchSize);
              chunk.forEach(prod => {
                  const ref = getTenantDoc('productos', prod.id);
                  const updates = {};
                  if (percentCost) updates.costo = Math.round(prod.costo * factorCosto);
                  if (percentPrice) {
                      updates.precio = Math.round(prod.precio * factorPrecio);
                      if (prod.preciosExtra) {
                          const newExtras = {};
                          Object.entries(prod.preciosExtra).forEach(([key, val]) => { newExtras[key] = Math.round(Number(val) * factorPrecio); });
                          updates.preciosExtra = newExtras;
                      }
                  }
                  batch.update(ref, updates);
              });
              await batch.commit();
          }
          toast.success(`¡${count} productos actualizados!`);
          setIsMassUpdateOpen(false);
          setSelectedBrandForUpdate(''); setSelectedCategoryForUpdate(''); setSelectedProductsForUpdate([]);
          setPercentCost(''); setPercentPrice('');
      } catch (error) { console.error(error); toast.error("Error masivo."); } finally { setIsUpdatingMassive(false); }
  };

  // --- GESTORES ---
  const handleCreateGlobalList = async () => { if(!newGlobalListName.trim()) return; try { await addTenantDoc('listas_precios', { nombre: newGlobalListName.trim() }); setNewGlobalListName(''); toast.success("Lista creada"); } catch (e) { console.error(e); } };
  const handleDeleteGlobalList = async (id) => { if(window.confirm("¿Borrar lista?")) try { await deleteTenantDoc('listas_precios', id); toast.success("Lista eliminada"); } catch (e) { console.error(e); } };

  const handleCreateBrand = async () => { if(!newBrandName.trim()) return; try { await addTenantDoc('marcas', { nombre: newBrandName.trim() }); setNewBrandName(''); toast.success("Marca creada"); } catch (e) { console.error(e); } };
  const handleDeleteBrand = async (id) => { if(window.confirm("¿Borrar marca?")) try { await deleteTenantDoc('marcas', id); toast.success("Marca eliminada"); } catch (e) { console.error(e); } };

  // --- HELPERS ---
  const getDisplayPrice = (product) => (selectedPriceList && product.preciosExtra?.[selectedPriceList]) ? Number(product.preciosExtra[selectedPriceList]) : Number(product.precio);
  
  const handleAddPrecioExtra = () => {
    if (!selectedListToAdd || !nuevoPrecioLista) return;
    setFormData(prev => ({ ...prev, preciosExtra: { ...prev.preciosExtra, [selectedListToAdd]: Number(nuevoPrecioLista) } }));
    setSelectedListToAdd(''); setNuevoPrecioLista('');
  };
  const handleRemovePrecioExtra = (key) => { const c = { ...formData.preciosExtra }; delete c[key]; setFormData(prev => ({ ...prev, preciosExtra: c })); };
  const handleImageChange = (e) => { if (e.target.files[0]) setImageFile(e.target.files[0]); };

  const openModalForAdd = () => { setEditingProductId(null); setFormData({ nombre: '', precio: '', stock: '', codigoDeBarras: '', costo: '', categoriaId: '', marca: '', proveedorId: '', ivaAlicuota: 21, costoIncluyeIva: true, comisionEspecifica: '', img: '', preciosExtra: {}, stockToAdd: '', stockToRemove: '', fechaVencimientoInput: '', tipo: 'producto', numeroSerie: '', fechaServicio: '', visibleEnCatalogo: true }); setImageFile(null); setError(''); setIsModalOpen(true); };
  const openModalForEdit = (p) => { setEditingProductId(p.id); setFormData({ ...p, marca: p.marca || '', proveedorId: p.proveedorId || '', ivaAlicuota: p.ivaAlicuota || 21, costoIncluyeIva: p.costoIncluyeIva ?? true, comisionEspecifica: p.comisionEspecifica || '', img: p.img || '', preciosExtra: p.preciosExtra || {}, stockToAdd: '', stockToRemove: '', fechaVencimientoInput: '', tipo: p.tipo || 'producto', numeroSerie: p.numeroSerie || '', fechaServicio: p.fechaServicio || '', visibleEnCatalogo: p.visibleEnCatalogo ?? true }); setImageFile(null); setError(''); setIsModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setError('');
    if (!formData.nombre || !formData.precio || !formData.costo || !formData.categoriaId) { setError("Faltan datos obligatorios."); return; }
    setIsUploading(true); 
    try {
        let imageUrl = formData.img; 
        let imageThumbUrl = formData.imgThumb || '';

        if (imageFile) {
            toast.info("Optimizando imágenes...");
            // Generar Standard (800px) y Thumb (300px)
            const [stdBlob, thumbBlob] = await Promise.all([
                optimizeProductImage(imageFile, 800),
                optimizeProductImage(imageFile, 300)
            ]);

            const timestamp = Date.now();
            const sRef = ref(storage, `productos/${tenantId}/std_${timestamp}.webp`);
            const tRef = ref(storage, `productos/${tenantId}/thumb_${timestamp}.webp`);

            await Promise.all([uploadBytes(sRef, stdBlob), uploadBytes(tRef, thumbBlob)]);
            [imageUrl, imageThumbUrl] = await Promise.all([getDownloadURL(sRef), getDownloadURL(tRef)]);
        }

        let finalStock = Number(formData.stock) || 0;
        let historial = editingProductId ? (products.find(p => p.id === editingProductId)?.historialLotes || []) : [];

        if (editingProductId) {
            const toAdd = Number(formData.stockToAdd) || 0; const toRemove = Number(formData.stockToRemove) || 0;
            if (toRemove > 0 && !isAdmin) { setError("Solo admins descuentan stock."); setIsUploading(false); return; }
            finalStock = finalStock + toAdd - toRemove;
            if (toAdd > 0) historial.push({ fechaIngreso: new Date().toISOString(), cantidad: toAdd, fechaVencimiento: formData.fechaVencimientoInput });
        } else {
            finalStock = Number(formData.stock);
            historial.push({ fechaIngreso: new Date().toISOString(), cantidad: finalStock, fechaVencimiento: formData.fechaVencimientoInput });
        }

        const pData = { 
            nombre: formData.nombre, 
            precio: Number(formData.precio), 
            costo: Number(formData.costo), 
            stock: finalStock, 
            historialLotes: historial, 
            codigoDeBarras: formData.codigoDeBarras || '', 
            categoriaId: formData.categoriaId, 
            marca: formData.marca || '', 
            comisionEspecifica: formData.comisionEspecifica ? Number(formData.comisionEspecifica) : null, 
            img: imageUrl, 
            imgThumb: imageThumbUrl, // Nuevo campo optimizado
            preciosExtra: formData.preciosExtra,
            tipo: formData.tipo,
            proveedorId: formData.proveedorId || '',
            ivaAlicuota: Number(formData.ivaAlicuota) || 21,
            costoIncluyeIva: formData.costoIncluyeIva,
            numeroSerie: formData.numeroSerie || '',
            fechaServicio: formData.fechaServicio || '',
            visibleEnCatalogo: formData.visibleEnCatalogo
        };
        
        if (editingProductId) await updateTenantDoc('productos', editingProductId, pData);
        else await addTenantDoc('productos', pData);
        setIsModalOpen(false); toast.success("Producto guardado.");
    } catch (e) { console.error(e); setError("Error al guardar."); } finally { setIsUploading(false); }
  };

  const handleDelete = async (id) => { if (!isAdmin) return; if (window.confirm("¿Eliminar?")) try { await deleteTenantDoc('productos', id); toast.success("Eliminado"); } catch (e) { console.error(e); } };

  const handleExportExcel = () => {
      if (filteredProducts.length === 0) return toast.warning("No hay productos para exportar.");
      
      const doExport = window.confirm("¿Exportar formato resumido (solo Nombre y Stock)?\n\nAceptar = Resumido (Para Pedidos)\nCancelar = Completo (Todos los datos)");

      let dataToExport = [];
      
      if (doExport) {
          dataToExport = filteredProducts.map(p => ({
              'Producto': p.nombre || '',
              'Precio Costo': p.costo || 0,
              'Precio Venta': p.precio || 0,
              'Stock Actual': p.stock || 0,
              'Cantidad a Pedir': '' 
          }));
      } else {
          dataToExport = filteredProducts.map(p => {
              const catName = categories.find(c => c.id === p.categoriaId)?.nombre || '';
              const provName = proveedores.find(pr => pr.id === p.proveedorId)?.nombre || '';
              return {
                  'Producto': p.nombre || '',
                  'Marca': p.marca || '',
                  'Categoría': catName,
                  'Proveedor': provName,
                  'Costo': p.costo || 0,
                  'Precio': p.precio || 0,
                  'Stock': p.stock || 0,
                  'Código Barras': p.codigoDeBarras || ''
              };
          });
      }

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
      XLSX.writeFile(workbook, `productos_${new Date().getTime()}.xlsx`);
  };

  const handleScan = async (e) => {
    if (e.key === 'Enter') { 
      e.preventDefault(); 
      const code = scanInput.trim(); 
      if (!code || !tenantId) return;
      
      const q = query(
        getTenantCollection("productos"), 
        where("codigoDeBarras", "==", code), 
        limit(1)
      ); 
      const s = await getDocs(q);
      if (!s.empty) openModalForEdit({ id: s.docs[0].id, ...s.docs[0].data() }); 
      else { openModalForAdd(); setFormData(prev => ({ ...prev, codigoDeBarras: code })); }
      setIsScanning(false); setScanInput('');
    }
  };

  const filteredProducts = useMemo(() => products.filter(p => {
      const mCat = selectedCategory ? p.categoriaId === selectedCategory : true;
      const mSearch = searchTerm ? (p.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) : true;
      const mProv = selectedProvider ? p.proveedorId === selectedProvider : true;
      return mCat && mSearch && mProv;
  }), [products, searchTerm, selectedCategory, selectedProvider]);
  
  const paginatedProducts = useMemo(() => filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredProducts, currentPage, itemsPerPage]);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // --- FUNCIONES DE CIERRE DE MODAL (UX) ---
  const handleBackdropClick = (e, setModalState) => {
      if (e.target === e.currentTarget) setModalState(false);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in bg-slate-50/30 min-h-screen">
      {/* Input oculto para carga rápida */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.[0] && hoveredProductId) {
            handleQuickImageUpload(e.target.files[0], hoveredProductId);
          }
          e.target.value = ''; // Limpiar para permitir repetir mismo archivo
        }}
      />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div><h2 className="text-3xl font-bold text-slate-900 tracking-tight">Inventario</h2><p className="text-slate-500 mt-1 font-medium">Gestión de stock, precios y productos SaaS</p></div>
        <div className="flex flex-wrap gap-3">
            <button onClick={() => setIsScanning(!isScanning)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm border ${isScanning ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}><BarcodeIcon className="w-5 h-5" /> {isScanning ? 'Cancelar' : 'Escanear'}</button>
            <button onClick={() => setIsListManagerOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all"><ListIcon className="w-5 h-5"/> Listas</button>
            
            {/* ✅ BOTÓN MARCAS */}
            <button onClick={() => setIsBrandManagerOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all"><TagIcon className="w-5 h-5"/> Marcas</button>
            
            {/* ✅ BOTÓN EXCEL */}
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-xl shadow-sm hover:bg-emerald-100 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> Excel</button>
            
            <button onClick={() => setIsMassUpdateOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 hover:from-amber-600 hover:to-orange-700 transition-all transform hover:-translate-y-0.5"><TrendingUpIcon className="w-5 h-5"/> Aumento Masivo</button>
            <Button onClick={openModalForAdd} icon={<PlusIcon className="w-5 h-5"/>}>Nuevo</Button>
        </div>
      </div>
      
      {isScanning && <div className="mb-6 animate-fade-in"><div className="relative"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><BarcodeIcon className="w-6 h-6 text-indigo-500 animate-pulse"/></div><input ref={scanInputRef} type="text" placeholder="Escanea el código de barras aquí..." className="w-full pl-12 pr-4 py-4 text-xl font-mono bg-white border-2 border-indigo-500 rounded-2xl shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all" value={scanInput} onChange={(e) => setScanInput(e.target.value)} onKeyDown={handleScan} /></div></div>}

      {/* FILTROS */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-12 gap-2">
        <div className="md:col-span-4 relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><SearchIcon /></span><input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" /></div>
        <div className="md:col-span-3"><select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full py-2.5 px-4 bg-slate-50 border-transparent rounded-xl text-sm font-medium text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"><option value="">Todas las Categorías</option>{categories.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}</select></div>
        <div className="md:col-span-3"><select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)} className="w-full py-2.5 px-4 bg-slate-50 border-transparent rounded-xl text-sm font-medium text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"><option value="">Todos los Proveedores</option>{proveedores.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}</select></div>
        <div className="md:col-span-2"><select value={selectedPriceList} onChange={(e) => setSelectedPriceList(e.target.value)} className="w-full py-2.5 px-4 bg-amber-50 text-amber-700 border-transparent rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"><option value="">Lista: Base</option>{globalPriceLists.map(list => (<option key={list.id} value={list.nombre}>{list.nombre}</option>))}</select></div>
      </div>
      
      {error && <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">⚠️ {error}</div>}

      {/* TABLA */}
      <div className="overflow-hidden rounded-2xl shadow-sm bg-transparent"> 
        <table className="min-w-full whitespace-nowrap border-separate border-spacing-y-0">
            <thead><tr className="bg-slate-100 border-t border-x border-slate-200"><th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-l border-t border-slate-200 rounded-tl-2xl">Producto</th><th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-t border-slate-200">Tipo / Marca</th><th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-t border-slate-200">{selectedPriceList ? <span className="text-amber-600">Precio ({selectedPriceList})</span> : 'Precio Venta'}</th><th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-t border-slate-200">Stock</th><th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-r border-t border-slate-200 rounded-tr-2xl">Acciones</th></tr></thead>
            <tbody>
                {paginatedProducts.map((product, index) => {
                    const displayedPrice = getDisplayPrice(product);
                    const isSpecialPrice = selectedPriceList && product.preciosExtra && product.preciosExtra[selectedPriceList];
                    const isLast = index === paginatedProducts.length - 1;
                    const isService = product.tipo === 'servicio';
                    return (
                    <tr 
                        key={product.id} 
                        className={`group transition-colors ${hoveredProductId === product.id ? 'bg-indigo-50/30' : ''}`}
                        onMouseEnter={() => setHoveredProductId(product.id)}
                        onMouseLeave={() => setHoveredProductId(null)}
                    >
                        <td className={`px-6 py-4 transition-colors border-b border-l border-slate-200 ${isLast ? 'rounded-bl-2xl' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div 
                                    className="h-14 w-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 relative group/img cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-95"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Haz clic para subir o pega con Ctrl+V aquí"
                                >
                                    {(product.imgThumb || product.img) ? (
                                        <img src={product.imgThumb || product.img} className="h-full w-full object-cover transition-transform group-hover/img:scale-110" alt="" />
                                    ) : (
                                        <ImageIcon className="w-6 h-6 text-slate-300"/>
                                    )}
                                    {/* Overlay de carga rápida */}
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                        <svg className="w-6 h-6 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                    </div>
                                    {isProcessingQuick && hoveredProductId === product.id && (
                                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-slate-900 truncate">{product.nombre}</div>
                                        {isService && <div title="Servicio Matafuego" className="text-orange-500"><FireIcon className="w-4 h-4"/></div>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {product.codigoDeBarras && <div className="text-[10px] text-slate-400 font-mono">{product.codigoDeBarras}</div>}
                                        {product.numeroSerie && <div className="text-[10px] text-indigo-500 font-bold uppercase">S/N: {product.numeroSerie}</div>}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 bg-white group-hover:bg-indigo-50/60 transition-colors border-b border-slate-200"><div className="flex flex-col items-start gap-1"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${isService ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>{isService ? 'SERVICIO' : (categories.find(c=>c.id===product.categoriaId)?.nombre || 'Sin cat.')}</span><div className="flex flex-wrap gap-1 mt-1">{product.marca && <span className="text-[9px] font-black bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wider">{product.marca}</span>}{product.proveedorId && <span className="text-[9px] font-black bg-indigo-50 border border-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded uppercase tracking-wider">{proveedores.find(pr => pr.id === product.proveedorId)?.nombre || 'Prov. Desconocido'}</span>}</div></div></td>
                        <td className="px-6 py-4 bg-white group-hover:bg-indigo-50/60 transition-colors border-b border-slate-200"><div className="flex flex-col"><span className={`text-sm font-bold ${isSpecialPrice ? 'text-amber-600' : 'text-slate-700'}`}>${displayedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>{selectedPriceList && !isSpecialPrice && <span className="text-[10px] text-slate-400 uppercase font-bold">Base</span>}</div></td>
                        <td className="px-6 py-4 bg-white group-hover:bg-indigo-50/60 transition-colors border-b border-slate-200"><div className="flex items-center"><span className={`text-sm font-bold ${product.stock < 10 ? 'text-red-600' : 'text-slate-700'}`}>{product.stock} u.</span>{product.stock < 10 && <span className="ml-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}</div></td>
                        <td className={`px-6 py-4 text-right bg-white group-hover:bg-indigo-50/60 transition-colors border-b border-r border-slate-200 ${isLast ? 'rounded-br-2xl' : ''}`}><div className="flex items-center justify-end gap-2"><button onClick={() => openModalForEdit(product)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"><EditIcon /></button>{isAdmin && <button onClick={() => handleDelete(product.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><DeleteIcon /></button>}</div></td>
                    </tr>
                    )
                })}
            </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">Anterior</button>
            <span className="px-4 py-2 bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-lg shadow-sm">{currentPage} de {totalPages}</span>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors">Siguiente</button>
        </div>
      )}

      {/* --- MODAL GESTOR DE LISTAS --- */}
      {isListManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => handleBackdropClick(e, setIsListManagerOpen)}>
            <div className="bg-slate-50 p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-slate-800">Listas de Precios</h3><button onClick={() => setIsListManagerOpen(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400"><XIcon className="w-5 h-5"/></button></div>
                <div className="flex gap-2 mb-6"><input type="text" placeholder="Ej: Mayorista..." className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={newGlobalListName} onChange={(e) => setNewGlobalListName(e.target.value)} /><button onClick={handleCreateGlobalList} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200"><PlusIcon /></button></div>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">{globalPriceLists.map(list => (<div key={list.id} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-indigo-200 transition-colors"><span className="font-semibold text-slate-700 text-sm">{list.nombre}</span><button onClick={() => handleDeleteGlobalList(list.id)} className="text-slate-300 hover:text-red-500 transition-colors"><DeleteIcon className="w-4 h-4"/></button></div>))}</div>
            </div>
        </div>
      )}

      {/* --- MODAL GESTOR DE MARCAS (NUEVO) --- */}
      {isBrandManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => handleBackdropClick(e, setIsBrandManagerOpen)}>
            <div className="bg-slate-50 p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-slate-800">Gestión de Marcas</h3><button onClick={() => setIsBrandManagerOpen(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-400"><XIcon className="w-5 h-5"/></button></div>
                <div className="flex gap-2 mb-6"><input type="text" placeholder="Ej: Coca Cola..." className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} /><button onClick={handleCreateBrand} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200"><PlusIcon /></button></div>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">{marcas.map(m => (<div key={m.id} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-indigo-200 transition-colors"><span className="font-semibold text-slate-700 text-sm">{m.nombre}</span><button onClick={() => handleDeleteBrand(m.id)} className="text-slate-300 hover:text-red-500 transition-colors"><DeleteIcon className="w-4 h-4"/></button></div>))}</div>
            </div>
        </div>
      )}

      {/* --- MODAL AUMENTO MASIVO (MEJORADO) --- */}
      {isMassUpdateOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in" onClick={(e) => handleBackdropClick(e, setIsMassUpdateOpen)}>
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"><div><h3 className="text-2xl font-black text-slate-800 tracking-tight">Actualización Masiva</h3><p className="text-sm text-slate-500 font-medium">Ajusta costos y precios por lote</p></div><button onClick={() => setIsMassUpdateOpen(false)} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"><XIcon className="w-6 h-6"/></button></div>
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <div className="flex p-1 bg-slate-100 rounded-xl mb-8">{['marca', 'categoria', 'manual'].map(mode => (<button key={mode} onClick={() => setMassUpdateMode(mode)} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${massUpdateMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{mode === 'marca' ? 'Por Marca' : mode === 'categoria' ? 'Por Categoría' : 'Manual'}</button>))}</div>
                    <div className="mb-6">
                        {massUpdateMode === 'marca' && (<select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" value={selectedBrandForUpdate} onChange={e => setSelectedBrandForUpdate(e.target.value)}><option value="">-- Elegir Marca --</option>{marcas.map(b => <option key={b.id} value={b.nombre}>{b.nombre}</option>)}</select>)}
                        {massUpdateMode === 'categoria' && (<select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" value={selectedCategoryForUpdate} onChange={e => setSelectedCategoryForUpdate(e.target.value)}><option value="">-- Elegir Categoría --</option>{categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>)}
                        {massUpdateMode === 'manual' && (<div className="relative mb-3"><span className="absolute left-3 top-3 text-slate-400"><SearchIcon className="w-5 h-5"/></span><input type="text" placeholder="Buscar para añadir..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none" value={manualSearchTerm} onChange={e => setManualSearchTerm(e.target.value)} /></div>)}
                    </div>
                    <div className="mb-8"><div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-slate-400 uppercase">Productos Afectados ({selectedProductsForUpdate.length})</label>{selectedProductsForUpdate.length > 0 && <button onClick={() => setSelectedProductsForUpdate([])} className="text-xs text-red-500 hover:underline">Limpiar todo</button>}</div>
                        <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 custom-scrollbar">
                            {massUpdateMode === 'manual' ? products.filter(p => p.nombre.toLowerCase().includes(manualSearchTerm.toLowerCase())).map(p => (<div key={p.id} onClick={() => toggleProductSelection(p.id)} className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer mb-1 transition-all ${selectedProductsForUpdate.includes(p.id) ? 'bg-indigo-100 border border-indigo-200 shadow-sm' : 'hover:bg-white border border-transparent'}`}><span className="text-sm font-medium text-slate-700">{p.nombre}</span>{selectedProductsForUpdate.includes(p.id) && <CheckIcon className="w-5 h-5 text-indigo-600"/>}</div>))
                            : products.filter(p => selectedProductsForUpdate.includes(p.id)).map(p => (<div key={p.id} onClick={() => toggleProductSelection(p.id)} className="p-2.5 rounded-lg flex items-center justify-between cursor-pointer mb-1 bg-indigo-50 border border-indigo-100 hover:bg-red-50 hover:border-red-100 transition-all group"><span className="text-sm font-medium text-indigo-900 group-hover:text-red-700">{p.nombre}</span><div className="flex items-center gap-2"><CheckIcon className="w-5 h-5 text-indigo-600 group-hover:hidden"/><XIcon className="w-4 h-4 text-red-500 hidden group-hover:block"/></div></div>))}
                        </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mb-6"><h4 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-4 flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div> Configuración de Impacto</h4><div className="grid grid-cols-2 gap-6"><div><label className="block text-xs font-bold text-slate-500 mb-1.5">Aumento Costo (%)</label><div className="relative"><input type="number" placeholder="0" className="w-full pl-4 pr-8 py-3 bg-white border border-amber-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none" value={percentCost} onChange={e => setPercentCost(e.target.value)}/><span className="absolute right-4 top-3 text-slate-400 font-bold">%</span></div></div><div><label className="block text-xs font-bold text-slate-500 mb-1.5">Aumento Venta (%)</label><div className="relative"><input type="number" placeholder="0" className="w-full pl-4 pr-8 py-3 bg-white border border-amber-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none" value={percentPrice} onChange={e => setPercentPrice(e.target.value)}/><span className="absolute right-4 top-3 text-slate-400 font-bold">%</span></div></div></div><p className="text-[10px] text-amber-700/70 mt-3 leading-relaxed"><strong>Nota:</strong> El porcentaje de venta se aplicará también a todas las listas de precios adicionales configuradas en cada producto.</p></div>
                    <button onClick={handleMassUpdate} disabled={isUpdatingMassive || selectedProductsForUpdate.length === 0} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-xl hover:bg-black transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-3">{isUpdatingMassive ? 'Procesando...' : `Confirmar Aumento (${selectedProductsForUpdate.length} productos)`}</button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL ADD/EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => handleBackdropClick(e, setIsModalOpen)}>
          <div className="bg-slate-50 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 z-10"><h3 className="text-xl font-bold text-slate-800">{editingProductId ? 'Editar Producto / Servicio' : 'Nuevo Producto / Servicio'}</h3><button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"><XIcon/></button></div>
            <div className="overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                <form onSubmit={handleSave} className="space-y-8">
                    
                    {/* TIPO DE PRODUCTO (NUEVO) */}
                    <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
                        {['producto', 'servicio'].map(type => (
                            <button 
                                key={type} 
                                type="button" 
                                onClick={() => setFormData({ ...formData, tipo: type })} 
                                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${formData.tipo === type ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {type === 'servicio' && <FireIcon className="w-4 h-4"/>}
                                {type.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Imagen</label><div className="aspect-square bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-300 transition-colors cursor-pointer shadow-sm">{imageFile ? <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover"/> : formData.img ? <img src={formData.img} className="w-full h-full object-cover"/> : <div className="text-center p-4"><CloudUploadIcon className="w-8 h-8 text-slate-300 mx-auto mb-2"/><span className="text-xs text-slate-400 font-medium">Subir foto</span></div>}<input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer"/></div></div>
                        <div className="md:col-span-2 space-y-5">
                            <div><label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre {formData.tipo === 'servicio' ? 'del Servicio' : 'del Producto'} *</label><input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" required/></div>
                            <div className="grid grid-cols-2 gap-4">
                                {formData.tipo === 'producto' ? (
                                    <>
                                        <div><label className="block text-sm font-bold text-slate-700 mb-1.5">Categoría *</label><select value={formData.categoriaId} onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" required><option value="" disabled>Seleccionar...</option>{categories.map(c => (<option key={c.id} value={c.id}>{c.nombre}</option>))}</select></div>
                                        <div><label className="block text-sm font-bold text-slate-700 mb-1.5">Marca</label><select value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">-- Sin Marca --</option>{marcas.map(m => (<option key={m.id} value={m.nombre}>{m.nombre}</option>))}</select></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="col-span-2"><label className="block text-sm font-bold text-slate-700 mb-1.5 font-black text-orange-600">Número de Serie (Matafuegos)</label><input type="text" value={formData.numeroSerie} onChange={(e) => setFormData({ ...formData, numeroSerie: e.target.value })} placeholder="Ej: SN-2024-001" className="w-full px-4 py-2.5 bg-white border border-orange-200 rounded-xl text-slate-800 font-bold shadow-sm focus:ring-2 focus:ring-orange-500 outline-none" /></div>
                                    </>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div><label className="block text-sm font-bold text-slate-700 mb-1.5">Cód. Barras</label><input type="text" value={formData.codigoDeBarras} onChange={(e) => setFormData({ ...formData, codigoDeBarras: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" /></div>
                                
                                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-slate-700">Catálogo Web</label>
                                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Visibilidad pública</p>
                                    </div>
                                    <button type="button" onClick={() => setFormData({...formData, visibleEnCatalogo: !formData.visibleEnCatalogo})} className={`w-12 h-6 rounded-full relative transition-all ${formData.visibleEnCatalogo ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.visibleEnCatalogo ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <hr className="border-slate-200" />
                    
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><span className="w-1 h-4 bg-indigo-500 rounded-full"></span> Precios y Costos</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-6">
                            <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">IVA (%)</label><select value={formData.ivaAlicuota} onChange={(e) => setFormData({ ...formData, ivaAlicuota: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold outline-none"><option value={21}>21%</option><option value={10.5}>10.5%</option><option value={0}>0%</option><option value={27}>27%</option></select></div>
                            <div className="flex flex-col justify-center items-center p-3 bg-slate-100 rounded-2xl md:col-span-1"><label className="text-[9px] font-black text-slate-500 uppercase mb-2">¿Costo con IVA?</label><div className="flex items-center gap-3"><span className={`text-[10px] font-bold ${!formData.costoIncluyeIva ? 'text-indigo-600' : 'text-slate-400'}`}>Neto</span><button type="button" onClick={() => setFormData({...formData, costoIncluyeIva: !formData.costoIncluyeIva})} className={`w-12 h-6 rounded-full relative transition-all ${formData.costoIncluyeIva ? 'bg-indigo-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.costoIncluyeIva ? 'left-7' : 'left-1'}`}></div></button><span className={`text-[10px] font-bold ${formData.costoIncluyeIva ? 'text-indigo-600' : 'text-slate-400'}`}>Bruto</span></div></div>
                            <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Costo Unitario</label><div className="relative"><span className="absolute left-4 top-2.5 text-slate-400 font-bold">$</span><input type="number" step="0.01" value={formData.costo} onChange={(e) => setFormData({ ...formData, costo: e.target.value })} className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" required/></div></div>
                            <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Venta Base</label><div className="relative"><span className="absolute left-4 top-2.5 text-slate-400 font-bold">$</span><input type="number" step="0.01" value={formData.precio} onChange={(e) => setFormData({ ...formData, precio: e.target.value })} className="w-full pl-8 pr-4 py-2.5 bg-white border border-green-200 rounded-xl text-green-700 font-bold shadow-sm focus:ring-2 focus:ring-green-500 outline-none" required/></div></div>
                            <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Comisión %</label><div className="relative"><span className="absolute right-4 top-2.5 text-indigo-400 font-bold">%</span><input type="number" step="0.1" value={formData.comisionEspecifica} onChange={(e) => setFormData({ ...formData, comisionEspecifica: e.target.value })} className="w-full pl-4 pr-8 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Cat."/></div></div>
                        </div>
                        
                        <div className="mb-6"><label className="block text-sm font-bold text-slate-700 mb-1.5">Proveedor Asignado</label><select value={formData.proveedorId} onChange={(e) => setFormData({ ...formData, proveedorId: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"><option value="">-- Sin Proveedor --</option>{proveedores.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}</select></div>
                        <div className="bg-white border border-amber-100 rounded-xl p-5 shadow-sm">
                            <label className="block text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">Listas de Precios Adicionales</label>
                            <div className="flex gap-3 mb-4">
                                <select value={selectedListToAdd} onChange={(e) => setSelectedListToAdd(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 border border-amber-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none"><option value="">-- Seleccionar Lista --</option>{globalPriceLists.map(l => (<option key={l.id} value={l.nombre}>{l.nombre}</option>))}</select>
                                <div className="relative w-32"><span className="absolute left-3 top-2 text-amber-400 font-bold text-xs">$</span><input type="number" placeholder="0.00" className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-amber-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500" value={nuevoPrecioLista} onChange={(e) => setNuevoPrecioLista(e.target.value)}/></div>
                                <button type="button" onClick={handleAddPrecioExtra} className="bg-amber-500 text-white px-4 rounded-lg font-bold hover:bg-amber-600 shadow-sm transition-colors">+</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(formData.preciosExtra || {}).map(([nombre, valor]) => (
                                    <div key={nombre} className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-sm"><span className="font-bold text-slate-600">{nombre}</span><span className="text-amber-600 font-bold bg-white px-1.5 rounded border border-amber-100">${valor}</span><button type="button" onClick={() => handleRemovePrecioExtra(nombre)} className="text-slate-400 hover:text-red-500 font-bold text-lg leading-none ml-1">×</button></div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-200" />
                    
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><span className="w-1 h-4 bg-blue-500 rounded-full"></span> {formData.tipo === 'servicio' ? 'Programación de Servicio' : 'Gestión de Stock'}</h4>
                        <div className="grid grid-cols-2 gap-6">
                            {editingProductId ? (
                                <div><label className="block text-xs font-bold text-slate-500 mb-1.5">Agregar {formData.tipo === 'servicio' ? 'Unidades' : 'Stock'} (+)</label><input type="number" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-blue-600 outline-none" placeholder="0" value={formData.stockToAdd} onChange={(e) => setFormData({...formData, stockToAdd: e.target.value})}/></div>
                            ) : (
                                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{formData.tipo === 'servicio' ? 'Cantidad Inicial' : 'Stock Inicial'}</label><input type="number" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none" placeholder="0" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})}/></div>
                            )}
                            
                            {formData.tipo === 'producto' ? (
                                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vencimiento del Lote</label><input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-600 outline-none" value={formData.fechaVencimientoInput} onChange={(e) => setFormData({...formData, fechaVencimientoInput: e.target.value})}/></div>
                            ) : (
                                <div><label className="block text-xs font-bold text-orange-600 uppercase tracking-wider mb-1.5">Vencimiento de Carga / Service</label><input type="date" className="w-full px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl font-black text-orange-700 outline-none" value={formData.fechaServicio} onChange={(e) => setFormData({...formData, fechaServicio: e.target.value})}/></div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-200"><button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors">Cancelar</button><button type="submit" disabled={isUploading} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg disabled:opacity-70">{isUploading ? 'Guardando...' : 'Guardar Producto'}</button></div>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;