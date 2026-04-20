import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import Button from './Button'; 
import { useFirestore } from '../hooks/useFirestore';
import { toast } from 'react-toastify';
// Iconos SVG
const EditIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const DeleteIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PlusIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const MagicIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
function Categories() {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', comisionGeneral: '' });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [error, setError] = useState('');

  // --- ESTADOS PARA ASIGNACIÓN MASIVA ---
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [targetCategoryId, setTargetCategoryId] = useState(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const { tenantId, onTenantSnapshot, addTenantDoc, updateTenantDoc, deleteTenantDoc, getTenantCollection, db } = useFirestore();

  useEffect(() => {
    if (!tenantId) return;
    const unsubscribe = onTenantSnapshot('categorias', (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(categoriesData);
    });
    return () => unsubscribe();
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onTenantSnapshot('proveedores', (snap) => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [tenantId]);

  const openModalForAdd = () => {
    setEditingCategoryId(null);
    setFormData({ nombre: '', comisionGeneral: '' });
    setError('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (category) => {
    setEditingCategoryId(category.id);
    setFormData({
      nombre: category.nombre,
      comisionGeneral: category.comisionGeneral || ''
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre) {
      setError("El nombre de la categoría es obligatorio.");
      return;
    }

    const categoryData = {
      companyId: tenantId, // Inyección de Multi-Tenancy
      nombre: formData.nombre,
      comisionGeneral: Number(formData.comisionGeneral) || 0
    };

    try {
      if (editingCategoryId) {
        await updateTenantDoc('categorias', editingCategoryId, categoryData);
      } else {
        await addTenantDoc('categorias', categoryData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error al guardar la categoría:", err);
      setError("No se pudo guardar la categoría.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta categoría?")) {
      try {
        await deleteTenantDoc('categorias', id);
      } catch (error) {
        console.error("Error al eliminar la categoría:", error);
      }
    }
  };

  const openBulkModal = (category) => {
    setTargetCategoryId(category.id);
    setSelectedSupplierId('');
    setIsBulkModalOpen(true);
  };

  const handleBulkAssign = async () => {
    if (!selectedSupplierId || !targetCategoryId) return;
    
    setIsBulkProcessing(true);
    try {
      const q = query(getTenantCollection('productos'), where('proveedorId', '==', selectedSupplierId));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast.info("No hay productos para este proveedor.");
        setIsBulkModalOpen(false);
        return;
      }

      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.update(d.ref, { categoriaId: targetCategoryId });
      });
      
      await batch.commit();
      toast.success(`Se han asignado ${snap.size} productos correctamente.`);
      setIsBulkModalOpen(false);
    } catch (err) {
      console.error("Error bulk assign:", err);
      toast.error("Error al asignar productos.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg min-h-[60vh]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Gestión de Categorías</h2>
        <Button onClick={openModalForAdd} icon={<PlusIcon />}>
    Agregar Categoría
</Button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Nombre</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Comisión (%)</th>
              <th className="px-6 py-3 font-semibold text-center text-gray-600 uppercase">Asignar por Prov.</th>
              <th className="px-6 py-3 font-semibold text-center text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800 whitespace-nowrap">{category.nombre}</td>
                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{category.comisionGeneral || 0}%</td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  <button 
                    onClick={() => openBulkModal(category)} 
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1 mx-auto"
                    title="Asignar todos los productos de un proveedor a esta categoría"
                  >
                    <MagicIcon />
                    <span className="text-[10px] font-bold uppercase">Asignar</span>
                  </button>
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  <div className="flex justify-center space-x-4">
                    <button onClick={() => openModalForEdit(category)} className="text-blue-500 hover:text-blue-700 transition-colors bg-blue-50 p-2 rounded-lg"><EditIcon /></button>
                    <button onClick={() => handleDelete(category.id)} className="text-red-500 hover:text-red-700 transition-colors bg-red-50 p-2 rounded-lg"><DeleteIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL ASIGNACIÓN MASIVA --- */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in p-4">
          <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-2xl border border-gray-100">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <MagicIcon /> Asignación Rápida
            </h3>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              Selecciona un proveedor. Todos sus productos se moverán a la categoría <span className="text-amber-600 font-bold">"{categories.find(c => c.id === targetCategoryId)?.nombre}"</span>.
            </p>
            
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Seleccionar Proveedor</label>
                <select 
                  value={selectedSupplierId} 
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer hover:bg-white transition-all"
                >
                  <option value="">-- Buscar Proveedor --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <button 
                  onClick={handleBulkAssign}
                  disabled={!selectedSupplierId || isBulkProcessing}
                  className="w-full py-3.5 bg-gray-900 text-white font-black rounded-xl shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {isBulkProcessing ? 'Procesando...' : 'Confirmar Asignación'}
                </button>
                <button 
                  onClick={() => setIsBulkModalOpen(false)}
                  className="w-full py-3.5 bg-white text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-all text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL EDITAR/AGREGAR --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in p-4">
          <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-2xl border border-gray-100">
            <h3 className="text-xl font-black text-gray-800 tracking-tight">
              {editingCategoryId ? '✏️ Editar Categoría' : '📂 Nueva Categoría'}
            </h3>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              Define el nombre y la comisión general para tus productos.
            </p>

            <form onSubmit={handleSave} className="mt-8 space-y-5">
              <div>
                <label htmlFor="categoryName" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre de la Categoría</label>
                <input 
                  id="categoryName" 
                  type="text" 
                  placeholder="Ej: Lácteos, Bebidas..." 
                  value={formData.nombre} 
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-white transition-all shadow-sm" 
                  required
                />
              </div>
              <div>
                <label htmlFor="categoryCommission" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Comisión General (%)</label>
                <div className="relative">
                  <input 
                    id="categoryCommission" 
                    type="number" 
                    placeholder="Ej: 5" 
                    value={formData.comisionGeneral} 
                    onChange={(e) => setFormData({ ...formData, comisionGeneral: e.target.value })} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-white transition-all shadow-sm" 
                  />
                  <span className="absolute right-4 top-3 text-gray-400 font-bold">%</span>
                </div>
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold flex items-center gap-2">
                  ⚠️ {error}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-4">
                <button 
                  type="submit" 
                  className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all transform active:scale-95"
                >
                  {editingCategoryId ? 'Actualizar Categoría' : 'Crear Categoría'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-full py-4 bg-white text-gray-500 font-bold rounded-xl hover:bg-gray-100 transition-all text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Categories;

