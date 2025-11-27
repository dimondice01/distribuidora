// En: src/components/Rubros.jsx

import { useState, useEffect } from 'react';
import { db } from '../firebase.js'; 
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { toast } from 'react-toastify'; 
import Button from './Button'; // Asegúrate de la ruta correcta
function Rubros() {
  const [rubros, setRubros] = useState([]);
  
  // --- Estado para el formulario de NUEVO rubro ---
  const [nombre, setNombre] = useState('');
  const [metaSemanal, setMetaSemanal] = useState('');

  // --- ¡NUEVO! Estado para el MODAL de EDICIÓN ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRubro, setEditingRubro] = useState(null); // Guarda el rubro que estamos editando
  const [editNombre, setEditNombre] = useState('');
  const [editMeta, setEditMeta] = useState('');

  const rubrosCollectionRef = collection(db, 'rubros');

  // Cargar rubros (sin cambios)
  useEffect(() => {
    const unsubscribe = onSnapshot(rubrosCollectionRef, (snapshot) => {
      const rubrosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRubros(rubrosData);
    });
    return () => unsubscribe();
  }, []);

  // Limpiar el formulario de NUEVO rubro
  const clearForm = () => {
    setNombre('');
    setMetaSemanal('');
  };

  // --- ¡ACTUALIZADO! handleSubmit ahora SOLO crea ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nombre.trim() === '' || Number(metaSemanal) <= 0) {
      toast.error('Por favor, completa el nombre y una meta válida.');
      return;
    }

    const data = {
      nombre,
      metaSemanal: Number(metaSemanal)
    };

    try {
      await addDoc(rubrosCollectionRef, data);
      toast.success('¡Rubro creado con éxito!');
      clearForm();
    } catch (error) {
      console.error("Error al crear rubro: ", error);
      toast.error('Error al crear el rubro.');
    }
  };

  // Borrar (sin cambios)
  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este rubro?')) {
      try {
        const rubroDoc = doc(db, 'rubros', id);
        await deleteDoc(rubroDoc);
        toast.success('Rubro eliminado.');
      } catch (error) {
        console.error("Error al eliminar rubro: ", error);
        toast.error('Error al eliminar el rubro.');
      }
    }
  };

  // --- ¡NUEVO! Funciones para controlar el MODAL ---

  // 1. Al hacer clic en "Editar"
  const handleEditClick = (rubro) => {
    setEditingRubro(rubro);
    setEditNombre(rubro.nombre);
    setEditMeta(rubro.metaSemanal.toString()); // Convertimos a string para el input
    setIsModalOpen(true);
  };

  // 2. Al cerrar el modal
  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRubro(null);
    setEditNombre('');
    setEditMeta('');
  };

  // 3. Al enviar el formulario del MODAL (Actualizar)
  const handleModalUpdate = async (e) => {
    e.preventDefault();
    if (editNombre.trim() === '' || Number(editMeta) <= 0) {
      toast.error('Por favor, completa el nombre y una meta válida.');
      return;
    }

    const data = {
      nombre: editNombre,
      metaSemanal: Number(editMeta)
    };

    try {
      const rubroDoc = doc(db, 'rubros', editingRubro.id);
      await updateDoc(rubroDoc, data);
      toast.success('¡Rubro actualizado con éxito!');
      handleModalClose(); // Cerramos el modal
    } catch (error) {
      console.error("Error al actualizar rubro: ", error);
      toast.error('Error al actualizar el rubro.');
    }
  };


  return (
    <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Gestión de Rubros de Clientes</h2>
      
      {/* Formulario de Creación (SOLO CREACIÓN) */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
        {/* Título ahora es fijo */}
        <h3 className="text-xl font-semibold mb-4">Nuevo Rubro</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> 
          
          {/* Campo Nombre */}
          <div>
            <label htmlFor="rubroNombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Rubro
            </label>
            <input
              id="rubroNombre"
              type="text"
              placeholder="Ej: Kiosco, Mayorista"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          {/* Campo Meta Semanal */}
          <div>
            <label htmlFor="metaSemanal" className="block text-sm font-medium text-gray-700 mb-1">
              Meta Semanal ($)
            </label>
            <input
              id="metaSemanal"
              type="number"
              placeholder="Ej: 15000"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={metaSemanal}
              onChange={(e) => setMetaSemanal(e.target.value)}
            />
          </div>

          {/* Botón (SOLO GUARDAR) */}
          <div className="flex space-x-2 self-end"> 
            <Button type="submit" className="w-full">
  Guardar
</Button>
          </div>
        </div>
      </form>

      {/* Lista de Rubros (Tabla) */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        {/* ... (h3 y table head sin cambios) ... */}
        <h3 className="text-xl font-semibold mb-4">Rubros Existentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold">Meta Semanal</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rubros.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-gray-500">No hay rubros creados.</td>
                </tr>
              ) : (
                rubros.map((rubro) => (
                  <tr key={rubro.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{rubro.nombre}</td>
                    <td className="p-4">${new Intl.NumberFormat('es-AR').format(rubro.metaSemanal)}</td>
                    <td className="p-4 flex justify-end space-x-2">
                      <button
                        // ¡ACTUALIZADO! Llama a la función del modal
                        onClick={() => handleEditClick(rubro)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(rubro.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ¡NUEVO! EL MODAL DE EDICIÓN --- */}
      {isModalOpen && editingRubro && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
            {/* Encabezado del Modal */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Editando Rubro</h3>
              <button onClick={handleModalClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            </div>

            {/* Formulario del Modal */}
            <form onSubmit={handleModalUpdate}>
              <div className="space-y-4">
                {/* Campo Nombre del Modal */}
                <div>
                  <label htmlFor="editRubroNombre" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Rubro
                  </label>
                  <input
                    id="editRubroNombre"
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                  />
                </div>
                
                {/* Campo Meta del Modal */}
                <div>
                  <label htmlFor="editMetaSemanal" className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Semanal ($)
                  </label>
                  <input
                    id="editMetaSemanal"
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editMeta}
                    onChange={(e) => setEditMeta(e.target.value)}
                  />
                </div>
              </div>

              {/* Botones del Modal */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- FIN DEL MODAL --- */}
    </div>
  );
}

export default Rubros;