import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js'; 
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';

// --- Iconos SVG ---
const PlusIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
const EditIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const DeleteIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const SearchIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;


function Clientes() {
    const [clientes, setClientes] = useState([]);
    const [zonas, setZonas] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // --- MEJORA: Añadimos barrio y localidad al estado del formulario ---
    const [formData, setFormData] = useState({ nombre: '', dni: '', cuit: '', telefono: '', email: '', direccion: '', barrio: '', localidad: '', zonaId: '', vendedorAsignadoId: '' });
    const [editingClientId, setEditingClientId] = useState(null);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15); 
    const [clientToDelete, setClientToDelete] = useState(null);

    useEffect(() => {
        // --- CORRECCIÓN: Ordenamos por 'nombre' ---
        const unsubscribeClientes = onSnapshot(query(collection(db, 'clientes'), orderBy('nombre')), (snapshot) => {
            setClientes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setCurrentPage(1);
        }, (err) => console.error("Error al cargar clientes:", err));

        const unsubscribeZonas = onSnapshot(collection(db, 'zonas'), (snapshot) => {
            setZonas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubscribeVendedores = onSnapshot(collection(db, 'vendedores'), (snapshot) => {
            setVendedores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeClientes();
            unsubscribeZonas();
            unsubscribeVendedores();
        };
    }, []);

    const openModal = (client = null) => {
        if (client) {
            setEditingClientId(client.id);
            // --- CORRECCIÓN: Leemos 'nombre' y los nuevos campos ---
            setFormData({ 
                nombre: client.nombre || client.nombreCompleto || '',
                dni: client.dni || '',
                cuit: client.cuit || '',
                telefono: client.telefono || '',
                email: client.email || '',
                direccion: client.direccion || '',
                barrio: client.barrio || '', 
                localidad: client.localidad || '',
                zonaId: client.zonaId || '',
                vendedorAsignadoId: client.vendedorAsignadoId || '',
             });
        } else {
            setEditingClientId(null);
            // --- CORRECCIÓN: Usamos 'nombre' ---
            setFormData({ nombre: '', dni: '', cuit: '', telefono: '', email: '', direccion: '', barrio: '', localidad: '', zonaId: '', vendedorAsignadoId: '' });
        }
        setError('');
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.nombre || !formData.direccion || !formData.zonaId || !formData.vendedorAsignadoId) {
            setError("Por favor, completa los campos obligatorios (*).");
            return;
        }

        const clientData = {
            // --- CORRECCIÓN: Guardamos como 'nombre' ---
            nombre: formData.nombre.trim(),
            dni: formData.dni.trim(),
            cuit: formData.cuit.trim(),
            telefono: formData.telefono.trim(),
            email: formData.email.trim(),
            direccion: formData.direccion.trim(),
            barrio: formData.barrio.trim(),
            localidad: formData.localidad.trim(),
            zonaId: formData.zonaId,
            vendedorAsignadoId: formData.vendedorAsignadoId,
            fechaAlta: editingClientId && formData.fechaAlta ? formData.fechaAlta : Timestamp.now() 
        };
        
        try {
            if (editingClientId) {
                await updateDoc(doc(db, 'clientes', editingClientId), clientData);
            } else {
                const existingDni = clientes.some(c => c.dni && c.dni === clientData.dni);
                const existingCuit = clientes.some(c => c.cuit && c.cuit === clientData.cuit);
                
                if (existingDni || existingCuit) {
                    setError("Ya existe un cliente con este DNI o CUIT.");
                    return;
                }
                
                await addDoc(collection(db, 'clientes'), clientData);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error("Error al guardar cliente:", err);
            setError("No se pudo guardar el cliente.");
        }
    };

    const handleDelete = async () => {
        if (!clientToDelete) return;
        try {
            await deleteDoc(doc(db, 'clientes', clientToDelete.id));
            setClientToDelete(null);
        } catch (error) {
            console.error("Error al eliminar cliente:", error);
            setError("Error al eliminar cliente.");
            setClientToDelete(null);
        }
    };
    
    const filteredClients = useMemo(() => {
        const term = searchTerm.toLowerCase();
        // --- CORRECCIÓN: Filtramos por 'nombre' y 'nombreCompleto' ---
        return clientes.filter(client => 
            (client.nombre || '').toLowerCase().includes(term) ||
            (client.nombreCompleto || '').toLowerCase().includes(term) ||
            (client.dni || '').includes(term) ||
            (client.cuit || '').includes(term)
        );
    }, [clientes, searchTerm]);
    
    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    
    const paginatedClients = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredClients.slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredClients, currentPage, itemsPerPage]);

    const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const getZonaNombre = (zonaId) => zonas.find(z => z.id === zonaId)?.nombre || 'N/A';
    const getVendedorNombre = (vendedorId) => vendedores.find(v => v.id === vendedorId)?.nombreCompleto || 'N/A';

    return (
        <div className="p-4 bg-gray-50 rounded-lg min-h-[60vh]">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Gestión de Clientes</h2>
                <button onClick={() => openModal()} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all flex items-center">
                    <PlusIcon className="w-4 h-4 mr-1"/>
                    Agregar Cliente
                </button>
            </div>
            
            <div className="flex items-center space-x-4 mb-4">
                <div className="relative flex-grow">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon /></span>
                    <input type="text" placeholder="Buscar por Nombre, DNI o CUIT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
                </div>
            </div>
            
            {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md mb-4">{error}</p>}

            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Nombre</th>
                            <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Ubicación</th>
                            <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Teléfono / Email</th>
                            <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Zona</th>
                            <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Vendedor</th>
                            <th className="px-6 py-3 font-semibold text-center text-gray-600 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedClients.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500 italic">No se encontraron clientes.</td></tr>
                        ) : (
                            paginatedClients.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-800 font-medium whitespace-nowrap">{client.nombre || client.nombreCompleto}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <p>{client.direccion}</p>
                                        <p className="text-xs text-gray-400">{[client.barrio, client.localidad].filter(Boolean).join(', ')}</p>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <p>{client.telefono}</p>
                                        <p className="text-xs text-gray-400 truncate">{client.email}</p>
                                    </td>
                                    <td className="px-6 py-4 text-indigo-600 font-medium">{getZonaNombre(client.zonaId)}</td>
                                    <td className="px-6 py-4 text-blue-600">{getVendedorNombre(client.vendedorAsignadoId)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center space-x-4">
                                            <button onClick={() => openModal(client)} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 transition-colors"><EditIcon /></button>
                                            <button onClick={() => setClientToDelete(client)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"><DeleteIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center items-center mt-4 space-x-4">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">&larr; Anterior</button>
                    <span className="text-sm text-gray-700">Página {currentPage} de {totalPages}</span>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Siguiente &rarr;</button>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in-scale">
                    <div className="w-full max-w-2xl p-6 bg-white rounded-xl shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">{editingClientId ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Dirección (Calle y N°) *</label><input type="text" value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Barrio</label><input type="text" value={formData.barrio} onChange={(e) => setFormData({ ...formData, barrio: e.target.value })} className="w-full px-3 py-2 border rounded-md"/></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Localidad</label><input type="text" value={formData.localidad} onChange={(e) => setFormData({ ...formData, localidad: e.target.value })} className="w-full px-3 py-2 border rounded-md"/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">DNI</label><input type="text" value={formData.dni} onChange={(e) => setFormData({ ...formData, dni: e.target.value })} className="w-full px-3 py-2 border rounded-md"/></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label><input type="text" value={formData.cuit} onChange={(e) => setFormData({ ...formData, cuit: e.target.value })} className="w-full px-3 py-2 border rounded-md"/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="tel" value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="w-full px-3 py-2 border rounded-md"/></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border rounded-md"/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Zona Asignada *</label><select value={formData.zonaId} onChange={(e) => setFormData({ ...formData, zonaId: e.target.value })} className="w-full px-3 py-2 border rounded-md" required><option value="" disabled>Selecciona zona</option>{zonas.map(z => (<option key={z.id} value={z.id}>{z.nombre}</option>))}</select></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">Vendedor Principal *</label><select value={formData.vendedorAsignadoId} onChange={(e) => setFormData({ ...formData, vendedorAsignadoId: e.target.value })} className="w-full px-3 py-2 border rounded-md" required><option value="" disabled>Selecciona vendedor</option>{vendedores.map(v => (<option key={v.id} value={v.id}>{v.nombreCompleto}</option>))}</select></div>
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
            
            {clientToDelete && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
                        <p className="mt-2 text-sm text-gray-600">¿Estás seguro de que quieres eliminar al cliente <strong>{clientToDelete.nombre || clientToDelete.nombreCompleto}</strong>? Esta acción no se puede deshacer.</p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button type="button" onClick={() => setClientToDelete(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                            <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700">Eliminar Definitivamente</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Clientes;

