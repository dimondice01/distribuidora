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

// --- CONSTANTES AFIP ---
const DOCUMENT_TYPES = [
    { id: 'SC', nombre: 'Consumidor Final (SC)' },
    { id: 'DNI', nombre: 'DNI' },
    { id: 'CUIT', nombre: 'CUIT' },
    { id: 'CUIL', nombre: 'CUIL' },
    { id: 'PAS', nombre: 'Pasaporte' },
];

function Clientes({ onViewDetail }) {
  // --- ESTADOS DE DATOS ---
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [rubros, setRubros] = useState([]);
  const [zonas, setZonas] = useState([]); 
  const [priceLists, setPriceLists] = useState([]);
  const [vendedores, setVendedores] = useState([]); // ✅ NUEVO: Lista de Vendedores
  
  // --- ESTADO CLIENTE ---
  const initialClientState = {
    nombre: '',
    telefono: '',
    direccion: '',
    barrio: '',
    localidad: '',
    email: '',
    rubroId: '',
    zonaId: '',
    listaPreciosAsignada: '',
    vendedorAsignadoId: '', // ✅ NUEVO: ID del Vendedor Asignado
    
    // --- CAMPOS AFIP ---
    requiereFacturaAfip: false,
    tipoDocumento: 'SC',
    numeroDocumento: '',
    dni: '' 
  };

  const [newCliente, setNewCliente] = useState(initialClientState);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false); 
  const [editingCliente, setEditingCliente] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const clientesCollectionRef = collection(db, 'clientes');

  // 1. CARGA DE DATOS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'rubros'), (s) => setRubros(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'zonas'), (s) => setZonas(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'listas_precios'), (s) => setPriceLists(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  // ✅ NUEVO: Cargar Vendedores para el selector
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vendedores'), (s) => setVendedores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(clientesCollectionRef, (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setClientes(data);
      setFilteredClientes(data);
    });
    return () => unsub();
  }, []);
  
  // 2. FILTROS
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const results = clientes.filter(c =>
      (c.nombre && c.nombre.toLowerCase().includes(lower)) ||
      (c.direccion && c.direccion.toLowerCase().includes(lower)) ||
      (c.numeroDocumento && c.numeroDocumento.includes(searchTerm)) ||
      (c.barrio && c.barrio.toLowerCase().includes(lower))
    );
    setFilteredClientes(results);
    setCurrentPage(1);
  }, [searchTerm, clientes]);

  // Helpers de Nombre
  const getRubroNombre = (id) => rubros.find(r => r.id === id)?.nombre || <span className="text-gray-400">-</span>;
  const getZonaNombre = (id) => zonas.find(z => z.id === id)?.nombre || <span className="text-red-400 font-bold">Sin Zona</span>;
  const getVendedorNombre = (id) => vendedores.find(v => v.id === id)?.nombreCompleto || <span className="text-gray-400 text-xs">Sin Asignar</span>;

  // Paginación
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const currentClientes = filteredClientes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- HANDLERS MODALES ---
  const openNewModal = () => setIsNewModalOpen(true);
  const closeNewModal = () => {
    setIsNewModalOpen(false);
    setNewCliente(initialClientState);
  };
  
  const handleNewClienteChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewCliente({ ...newCliente, [name]: type === 'checkbox' ? checked : value });
  };
  
  const handleAddCliente = async (e) => {
    e.preventDefault();
    if (!newCliente.nombre.trim() || !newCliente.zonaId) {
      toast.error('Nombre y Zona son obligatorios.');
      return;
    }
    if (newCliente.requiereFacturaAfip && (!newCliente.numeroDocumento || newCliente.tipoDocumento === 'SC')) {
        toast.error('Para factura AFIP, complete Tipo y Número de Documento.');
        return;
    }

    try {
      await addDoc(clientesCollectionRef, {
          ...newCliente,
          fechaCreacion: new Date() 
      });
      toast.success('¡Cliente agregado con éxito!');
      closeNewModal();
    } catch (error) {
      console.error("Error:", error);
      toast.error('Error al agregar.');
    }
  };

  const handleDeleteCliente = async (id) => {
    if (window.confirm('¿Eliminar cliente?')) {
      try { await deleteDoc(doc(db, 'clientes', id)); toast.success('Eliminado.'); } 
      catch (error) { toast.error('Error al eliminar.'); }
    }
  };
  
  const openEditModal = (cliente) => {
    setEditingCliente({
      ...initialClientState, 
      ...cliente, 
      zonaId: cliente.zonaId || '',
      listaPreciosAsignada: cliente.listaPreciosAsignada || '',
      vendedorAsignadoId: cliente.vendedorAsignadoId || '', // ✅ Cargar vendedor
      requiereFacturaAfip: cliente.requiereFacturaAfip || false,
      tipoDocumento: cliente.tipoDocumento || 'SC',
      numeroDocumento: cliente.numeroDocumento || ''
    });
    setIsEditModalOpen(true);
  };
  
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingCliente({ ...editingCliente, [name]: type === 'checkbox' ? checked : value });
  };
  
  const handleUpdateCliente = async (e) => {
    e.preventDefault();
    if (!editingCliente.nombre.trim() || !editingCliente.zonaId) {
      toast.error('Nombre y Zona son obligatorios.');
      return;
    }
    try {
      const { id, ...data } = editingCliente;
      await updateDoc(doc(db, 'clientes', id), data);
      toast.success('¡Actualizado!');
      setIsEditModalOpen(false);
      setEditingCliente(null);
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar.');
    }
  };

  // --- RENDERIZADO DEL FORMULARIO ---
  const renderFormFields = (data, handleChange) => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DATOS BÁSICOS */}
        <div className="md:col-span-2 bg-gray-50 p-3 rounded border">
            <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase">Datos Personales</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold mb-1">Nombre *</label><input type="text" name="nombre" value={data.nombre} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-xs font-bold mb-1">Teléfono</label><input type="text" name="telefono" value={data.telefono} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-xs font-bold mb-1">Email</label><input type="email" name="email" value={data.email} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-blue-600">Zona (Logística) *</label>
                    <select name="zonaId" value={data.zonaId} onChange={handleChange} className="w-full p-2 border border-blue-300 rounded bg-blue-50">
                        <option value="">-- Seleccionar Zona --</option>
                        {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                    </select>
                </div>
            </div>
        </div>

        {/* UBICACIÓN */}
        <div className="md:col-span-2 bg-gray-50 p-3 rounded border">
             <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase">Ubicación</h4>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1"><label className="block text-xs font-bold mb-1">Dirección</label><input type="text" name="direccion" value={data.direccion} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-xs font-bold mb-1">Barrio</label><input type="text" name="barrio" value={data.barrio} onChange={handleChange} className="w-full p-2 border rounded" /></div>
                <div><label className="block text-xs font-bold mb-1">Localidad</label><input type="text" name="localidad" value={data.localidad} onChange={handleChange} className="w-full p-2 border rounded" /></div>
             </div>
        </div>

        {/* DATOS COMERCIALES */}
        <div className="bg-gray-50 p-3 rounded border">
            <h4 className="text-sm font-bold text-gray-500 mb-2 uppercase">Comercial</h4>
            <div className="space-y-3">
                <div>
                    <label className="block text-xs font-bold mb-1">Rubro</label>
                    <select name="rubroId" value={data.rubroId} onChange={handleChange} className="w-full p-2 border rounded">
                        <option value="">-- Seleccionar --</option>
                        {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-purple-600">Lista de Precios</label>
                    <select name="listaPreciosAsignada" value={data.listaPreciosAsignada} onChange={handleChange} className="w-full p-2 border border-purple-300 bg-purple-50 rounded">
                        <option value="">Precio Base (General)</option>
                        {priceLists.map(l => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                    </select>
                </div>
                {/* ✅ NUEVO SELECTOR VENDEDOR */}
                <div>
                    <label className="block text-xs font-bold mb-1 text-green-600">Vendedor Asignado</label>
                    <select name="vendedorAsignadoId" value={data.vendedorAsignadoId} onChange={handleChange} className="w-full p-2 border border-green-300 bg-green-50 rounded">
                        <option value="">-- Sin Asignar (Visible para todos/admin) --</option>
                        {vendedores.map(v => (
                            <option key={v.id} value={v.id}>{v.nombreCompleto} ({v.username})</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {/* SECCIÓN AFIP */}
        <div className={`p-3 rounded border ${data.requiereFacturaAfip ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50'}`}>
            <div className="flex justify-between items-center mb-2">
                <h4 className={`text-sm font-bold uppercase ${data.requiereFacturaAfip ? 'text-indigo-700' : 'text-gray-500'}`}>Datos Fiscales (AFIP)</h4>
                <div className="flex items-center">
                    <input type="checkbox" id="afipCheck" name="requiereFacturaAfip" checked={data.requiereFacturaAfip} onChange={handleChange} className="w-4 h-4 text-indigo-600" />
                    <label htmlFor="afipCheck" className="ml-2 text-xs font-bold cursor-pointer">Requiere Factura A</label>
                </div>
            </div>

            {data.requiereFacturaAfip ? (
                <div className="grid grid-cols-2 gap-2 animate-fade-in">
                    <div>
                        <label className="block text-xs font-bold mb-1">Tipo Doc *</label>
                        <select name="tipoDocumento" value={data.tipoDocumento} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                            {DOCUMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1">Número / CUIT *</label>
                        <input type="text" name="numeroDocumento" value={data.numeroDocumento} onChange={handleChange} className="w-full p-2 border rounded bg-white" placeholder="Sin guiones" />
                    </div>
                </div>
            ) : (
                <div className="opacity-50">
                    <label className="block text-xs font-bold mb-1">DNI (Opcional interno)</label>
                    <input type="text" name="dni" value={data.dni} onChange={handleChange} className="w-full p-2 border rounded" disabled={data.requiereFacturaAfip} />
                </div>
            )}
        </div>
      </div>
  );

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-100">
      
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Clientes</h2>
        <button onClick={openNewModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 font-semibold flex items-center">
          + Nuevo Cliente
        </button>
      </div>
      
      {/* Tabla y Filtros */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <input
          type="text"
          placeholder="Buscar por nombre, dirección, barrio, documento..."
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 font-semibold text-gray-600">Nombre</th>
                <th className="p-3 font-semibold text-gray-600">Zona</th>
                <th className="p-3 font-semibold text-gray-600">Dirección</th>
                <th className="p-3 font-semibold text-gray-600">Localidad/Barrio</th>
                <th className="p-3 font-semibold text-gray-600">Vendedor</th> {/* ✅ Nueva Columna */}
                <th className="p-3 font-semibold text-gray-600">Fiscal</th>
                <th className="p-3 font-semibold text-gray-600">Lista Precios</th>
                <th className="p-3 font-semibold text-right text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentClientes.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-gray-400 italic">No se encontraron clientes.</td></tr>
              ) : (
                currentClientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-blue-50 transition-colors">
                    <td className="p-3 font-medium text-gray-800">{cliente.nombre}</td>
                    <td className="p-3">{getZonaNombre(cliente.zonaId)}</td>
                    <td className="p-3 text-gray-600">{cliente.direccion}</td>
                    <td className="p-3 text-gray-500">{cliente.localidad} {cliente.barrio ? `(${cliente.barrio})` : ''}</td>
                    
                    {/* ✅ Columna Vendedor */}
                    <td className="p-3 font-medium text-green-700">
                        {getVendedorNombre(cliente.vendedorAsignadoId)}
                    </td>

                    {/* Columna Fiscal */}
                    <td className="p-3">
                        {cliente.requiereFacturaAfip ? (
                            <div>
                                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800 mb-1">Factura A</span>
                                <div className="text-xs text-gray-500">{cliente.tipoDocumento}: {cliente.numeroDocumento}</div>
                            </div>
                        ) : (
                            <span className="text-xs text-gray-400">Cons. Final</span>
                        )}
                    </td>

                    {/* Columna Lista Precios */}
                    <td className="p-3">
                        {cliente.listaPreciosAsignada ? (
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded font-bold border border-purple-200">
                                {cliente.listaPreciosAsignada}
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400 border border-gray-200 px-2 py-1 rounded">Base</span>
                        )}
                    </td>

                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => onViewDetail(cliente.id)} className="text-blue-600 hover:text-blue-800 font-medium text-xs uppercase">Ver</button>
                      <button onClick={() => openEditModal(cliente)} className="text-yellow-600 hover:text-yellow-800 font-medium text-xs uppercase">Editar</button>
                      <button onClick={() => handleDeleteCliente(cliente.id)} className="text-red-600 hover:text-red-800 font-medium text-xs uppercase">Borrar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginación */}
        <div className="flex justify-center items-center mt-6 space-x-4">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">Anterior</button>
          <span className="text-sm text-gray-600">Página {currentPage} de {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Siguiente</button>
        </div>
      </div>

      {/* --- Modal CREACIÓN --- */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"> 
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h3 className="text-xl font-bold text-gray-800">Nuevo Cliente</h3>
              <button onClick={closeNewModal} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddCliente}>
              {renderFormFields(newCliente, handleNewClienteChange)}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onClick={closeNewModal} className="px-5 py-2 rounded border text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-bold shadow">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal EDICIÓN --- */}
      {isEditModalOpen && editingCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"> 
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h3 className="text-xl font-bold text-gray-800">Editar Cliente</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleUpdateCliente}>
              {renderFormFields(editingCliente, handleEditChange)}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 rounded border text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600 font-bold shadow">Actualizar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;