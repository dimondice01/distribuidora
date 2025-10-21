import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// Iconos SVG
const EditIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const DeleteIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

function Categories() {
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', comisionGeneral: '' });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'categorias'), (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(categoriesData);
    });
    return () => unsubscribe();
  }, []);

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
      nombre: formData.nombre,
      comisionGeneral: Number(formData.comisionGeneral) || 0
    };

    try {
      if (editingCategoryId) {
        await updateDoc(doc(db, 'categorias', editingCategoryId), categoryData);
      } else {
        await addDoc(collection(db, 'categorias'), categoryData);
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
        await deleteDoc(doc(db, 'categorias', id));
      } catch (error) {
        console.error("Error al eliminar la categoría:", error);
      }
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg min-h-[60vh]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Gestión de Categorías</h2>
        <button onClick={openModalForAdd} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all">
          Agregar Categoría
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Nombre</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Comisión General (%)</th>
              <th className="px-6 py-3 font-semibold text-center text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-800 whitespace-nowrap">{category.nombre}</td>
                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{category.comisionGeneral || 0}%</td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  <div className="flex justify-center space-x-4">
                    <button onClick={() => openModalForEdit(category)} className="text-blue-500 hover:text-blue-700"><EditIcon /></button>
                    <button onClick={() => handleDelete(category.id)} className="text-red-500 hover:text-red-700"><DeleteIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
            <h3 className="text-lg font-medium leading-6 text-gray-900">{editingCategoryId ? 'Editar Categoría' : 'Agregar Nueva Categoría'}</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Categoría</label>
                <input id="categoryName" type="text" placeholder="Ej: Lácteos" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="categoryCommission" className="block text-sm font-medium text-gray-700 mb-1">Comisión General (%)</label>
                <input id="categoryCommission" type="number" placeholder="Ej: 5" value={formData.comisionGeneral} onChange={(e) => setFormData({ ...formData, comisionGeneral: e.target.value })} className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end pt-4 space-x-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Categories;

