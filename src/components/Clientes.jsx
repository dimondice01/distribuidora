// En: src/components/Clientes.jsx

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

// --- ¡CAMBIO 1: Aceptamos la prop 'onViewDetail' ---
function Clientes({ onViewDetail }) {
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [rubros, setRubros] = useState([]);
  
  // --- ¡ACTUALIZADO! Añadimos barrio y localidad ---
  const [newCliente, setNewCliente] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    // ¡NUEVOS CAMPOS!
    barrio: '',
    localidad: '',
    dni: '',
    email: '',
    rubroId: '' 
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false); 
  const [editingCliente, setEditingCliente] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const clientesCollectionRef = collection(db, 'clientes');

  // Cargar Rubros (sin cambios)
  useEffect(() => {
    const rubrosCollectionRef = collection(db, 'rubros');
    const unsubscribe = onSnapshot(rubrosCollectionRef, (snapshot) => {
      const rubrosList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setRubros(rubrosList);
    });
    return () => unsubscribe();
  }, []);

  // Cargar Clientes (sin cambios)
  useEffect(() => {
    const unsubscribe = onSnapshot(clientesCollectionRef, (snapshot) => {
      const clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClientes(clientesData);
      setFilteredClientes(clientesData);
    });
    return () => unsubscribe();
  }, []);
  
  // --- ¡ACTUALIZADO! Filtro ahora incluye barrio y localidad ---
  useEffect(() => {
    const searchTermLower = searchTerm.toLowerCase();
    const results = clientes.filter(cliente =>
      (cliente.nombre && cliente.nombre.toLowerCase().includes(searchTermLower)) ||
      (cliente.direccion && cliente.direccion.toLowerCase().includes(searchTermLower)) ||
      (cliente.dni && cliente.dni.includes(searchTerm)) ||
      // ¡NUEVO!
      (cliente.barrio && cliente.barrio.toLowerCase().includes(searchTermLower)) ||
      (cliente.localidad && cliente.localidad.toLowerCase().includes(searchTermLower))
    );
    setFilteredClientes(results);
    setCurrentPage(1);
  }, [searchTerm, clientes]);

  // Helper para el nombre del rubro (sin cambios)
  const rubroMap = new Map(rubros.map(r => [r.id, r.nombre]));
  const getRubroNombre = (rubroId) => {
    return rubroMap.get(rubroId) || <span className="text-gray-400">Sin Rubro</span>;
  };

  // Lógica de Paginación (sin cambios)
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const indexOfLastCliente = currentPage * itemsPerPage;
  const indexOfFirstCliente = indexOfLastCliente - itemsPerPage;
  const currentClientes = filteredClientes.slice(indexOfFirstCliente, indexOfLastCliente);
  const nextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const prevPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };


  // --- Funciones de Modales ---
  const openNewModal = () => setIsNewModalOpen(true);
  const closeNewModal = () => {
    setIsNewModalOpen(false);
    // ¡ACTUALIZADO! Reseteamos los nuevos campos
    setNewCliente({
      nombre: '', telefono: '', direccion: '', barrio: '', localidad: '', dni: '', email: '', rubroId: ''
    });
  };
  const handleNewClienteChange = (e) => {
    setNewCliente({ ...newCliente, [e.target.name]: e.target.value });
  };
  const handleAddCliente = async (e) => {
    e.preventDefault();
    if (newCliente.nombre.trim() === '' || newCliente.direccion.trim() === '') {
      toast.error('Nombre y Dirección son obligatorios.');
      return;
    }
    try {
      await addDoc(clientesCollectionRef, newCliente);
      toast.success('¡Cliente agregado con éxito!');
      closeNewModal();
    } catch (error) {
      console.error("Error al agregar cliente: ", error);
      toast.error('Error al agregar el cliente.');
    }
  };
  const handleDeleteCliente = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      try {
        const clienteDoc = doc(db, 'clientes', id);
        await deleteDoc(clienteDoc);
        toast.success('Cliente eliminado.');
      } catch (error) {
        console.error("Error al eliminar cliente: ", error);
        toast.error('Error al eliminar el cliente.');
      }
    }
  };
  
  // ¡ACTUALIZADO! openEditModal
  const openEditModal = (cliente) => {
    setEditingCliente({
      ...cliente,
      rubroId: cliente.rubroId || '',
      // ¡NUEVO! Aseguramos que existan
      barrio: cliente.barrio || '',
      localidad: cliente.localidad || ''
    });
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCliente(null);
  };
  const handleEditChange = (e) => {
    setEditingCliente({ ...editingCliente, [e.target.name]: e.target.value });
  };
  const handleUpdateCliente = async (e) => {
    e.preventDefault();
    if (!editingCliente || editingCliente.nombre.trim() === '' || editingCliente.direccion.trim() === '') {
      toast.error('Nombre y Dirección son obligatorios.');
      return;
    }
    try {
      const clienteDoc = doc(db, 'clientes', editingCliente.id);
      const { id, ...dataToUpdate } = editingCliente;
      await updateDoc(clienteDoc, dataToUpdate);
      toast.success('¡Cliente actualizado con éxito!');
      closeEditModal();
    } catch (error) {
      console.error("Error al actualizar cliente: ", error);
      toast.error('Error al actualizar el cliente.');
    }
  };


  return (
    <div className="p-6 h-full overflow-y-auto">
      
      {/* Encabezado (sin cambios) */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Gestión de Clientes</h2>
        <button
          onClick={openNewModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition duration-200"
        >
          Agregar Cliente
        </button>
      </div>
      
      {/* Búsqueda y Lista de Clientes */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Lista de Clientes</h3>
        {/* ¡ACTUALIZADO! Placeholder del buscador */}
        <input
          type="text"
          placeholder="Buscar cliente por nombre, dirección, barrio, localidad o DNI..."
          className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            {/* ¡ACTUALIZADO! Cabecera de la tabla */}
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold">Dirección</th>
                {/* ¡NUEVOS! */}
                <th className="p-4 font-semibold">Barrio</th>
                <th className="p-4 font-semibold">Localidad</th>
                <th className="p-4 font-semibold">Rubro</th>
                <th className="p-4 font-semibold">Teléfono</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentClientes.length === 0 ? (
                <tr>
                  {/* --- ¡BUG FIX! Colspan era 8 y debía ser 7 --- */}
                  <td colSpan="7" className="p-4 text-center text-gray-500">
                    {clientes.length === 0 ? 'No hay clientes cargados.' : 'No se encontraron clientes.'}
                  </td>
                </tr>
              ) : (
                currentClientes.map((cliente) => (
                  // ¡ACTUALIZADO! Fila de la tabla
                  <tr key={cliente.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{cliente.nombre}</td>
                    <td className="p-4">{cliente.direccion}</td>
                    {/* ¡NUEVOS! */}
                    <td className="p-4">{cliente.barrio}</td>
                    <td className="p-4">{cliente.localidad}</td>
                    <td className="p-4">{getRubroNombre(cliente.rubroId)}</td>
                    <td className="p-4">{cliente.telefono}</td>
                    {/* --- ¡CAMBIO 2: AÑADIMOS BOTÓN 'DETALLE'! --- */}
                    <td className="p-4 flex justify-end space-x-2">
                      <button 
                        onClick={() => onViewDetail(cliente.id)} 
                        className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition"
                      >
                        Detalle
                      </button>
                      <button onClick={() => openEditModal(cliente)} className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 transition">
                        Editar
                      </button>
                      <button onClick={() => handleDeleteCliente(cliente.id)} className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginación (sin cambios) */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md font-semibold hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-gray-700">
            Página {totalPages === 0 ? 0 : currentPage} de {totalPages}
          </span>
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages || totalPages === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* --- Modal de CREACIÓN de Cliente (sin cambios) --- */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl"> 
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Nuevo Cliente</h3>
              <button onClick={closeNewModal} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleAddCliente}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fila 1 */}
                <div>
                  <label htmlFor="newClienteNombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input id="newClienteNombre" type="text" name="nombre" placeholder="Nombre completo" value={newCliente.nombre} onChange={handleNewClienteChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label htmlFor="newClienteTel" className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input id="newClienteTel" type="text" name="telefono" placeholder="Teléfono" value={newCliente.telefono} onChange={handleNewClienteChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label htmlFor="newClienteDNI" className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                  <input id="newClienteDNI" type="text" name="dni" placeholder="DNI" value={newCliente.dni} onChange={handleNewClienteChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>

                {/* Fila 2 - ¡Nuevos campos! */}
                <div>
                  <label htmlFor="newClienteDir" className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input id="newClienteDir" type="text" name="direccion" placeholder="Calle y número" value={newCliente.direccion} onChange={handleNewClienteChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label htmlFor="newClienteBarrio" className="block text-sm font-medium text-gray-700 mb-1">Barrio</label>
                  <input id="newClienteBarrio" type="text" name="barrio" placeholder="Barrio" value={newCliente.barrio} onChange={handleNewClienteChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label htmlFor="newClienteLocalidad" className="block text-sm font-medium text-gray-700 mb-1">Localidad</label>
                  <input id="newClienteLocalidad" type="text" name="localidad" placeholder="Localidad" value={newCliente.localidad} onChange={handleNewClienteChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>

                {/* Fila 3 */}
                <div>
                  <label htmlFor="newClienteEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input id="newClienteEmail" type="email" name="email" placeholder="Email (opcional)" value={newCliente.email} onChange={handleNewClienteChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label htmlFor="newClienteRubro" className="block text-sm font-medium text-gray-700 mb-1">
                    Rubro
                  </label>
                  <select
                    id="newClienteRubro"
                    name="rubroId"
                    value={newCliente.rubroId}
                    onChange={handleNewClienteChange}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="">-- Seleccionar Rubro --</option>
                    {rubros.map(rubro => (
                      <option key={rubro.id} value={rubro.id}>
                        {rubro.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={closeNewModal} className="bg-gray-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-600 transition">
                  Cancelar
                </button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition">
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal de EDICIÓN de Cliente (sin cambios) --- */}
      {isEditModalOpen && editingCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl"> 
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Editando Cliente: {editingCliente.nombre}</h3>
              <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleUpdateCliente}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Fila 1 */}
                <div>
                  <label htmlFor="editNombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input id="editNombre" type="text" name="nombre" value={editingCliente.nombre} onChange={handleEditChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label htmlFor="editTelefono" className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input id="editTelefono" type="text" name="telefono" value={editingCliente.telefono} onChange={handleEditChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label htmlFor="editDNI" className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                  <input id="editDNI" type="text" name="dni" value={editingCliente.dni} onChange={handleEditChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                
                {/* Fila 2 - ¡Nuevos campos! */}
                <div>
                  <label htmlFor="editDireccion" className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input id="editDireccion" type="text" name="direccion" value={editingCliente.direccion} onChange={handleEditChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label htmlFor="editBarrio" className="block text-sm font-medium text-gray-700 mb-1">Barrio</label>
                  <input id="editBarrio" type="text" name="barrio" value={editingCliente.barrio} onChange={handleEditChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label htmlFor="editLocalidad" className="block text-sm font-medium text-gray-700 mb-1">Localidad</label>
                  <input id="editLocalidad" type="text" name="localidad" value={editingCliente.localidad} onChange={handleEditChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>

                {/* Fila 3 */}
                <div>
                  <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input id="editEmail" type="email" name="email" value={editingCliente.email} onChange={handleEditChange} className="w-full p-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label htmlFor="editRubro" className="block text-sm font-medium text-gray-700 mb-1">
                    Rubro
                  </label>
                  <select
                    id="editRubro"
                    name="rubroId"
                    value={editingCliente.rubroId}
                    onChange={handleEditChange}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="">-- Seleccionar Rubro --</option>
                    {rubros.map(rubro => (
                      <option key={rubro.id} value={rubro.id}>
                        {rubro.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={closeEditModal} className="bg-gray-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-600 transition">
                  Cancelar
                </button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition">
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;