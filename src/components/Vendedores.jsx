import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase.js';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'; 
import { initializeApp, deleteApp } from 'firebase/app'; 
import Button from './Button'; 
import { useFirestore } from '../hooks/useFirestore';

// --- CONFIGURACIÓN DE APP SECUNDARIA ---
const secondaryFirebaseConfig = {
  apiKey: "AIzaSyC0JqOWRdkmFjBoAQN7igM_a2qKysYW2Kk",
  authDomain: "noarerp.firebaseapp.com",
  projectId: "noarerp",
  storageBucket: "noarerp.firebasestorage.app",
  messagingSenderId: "249887928589",
  appId: "1:249887928589:web:52105c219280985b4d0044",
};

// --- Iconos SVG ---
const EditIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const DeleteIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PlusIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
const PhoneIcon = () => <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;

const ROLES = {
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  REPARTO: 'Reparto',
};

function Vendedores() {
  const [vendedores, setVendedores] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombreCompleto: '', username: '', email: '', password: '', telefono: '', rango: ROLES.VENDEDOR, zonasAsignadas: [] });
  const [editingVendedorId, setEditingVendedorId] = useState(null);
  const [error, setError] = useState('');
  const [vendedorToDelete, setVendedorToDelete] = useState(null);

  // --- Paginación ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');

  const { tenantId, onTenantSnapshot, updateTenantDoc, getTenantDoc, deleteTenantDoc } = useFirestore();

  useEffect(() => {
    if (!tenantId) return;

    const unsubscribeVendedores = onTenantSnapshot('vendedores', (snapshot) => {
      setVendedores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCurrentPage(1);
    }, [{ field: 'nombreCompleto', direction: 'asc' }]);
    
    const unsubscribeZonas = onTenantSnapshot('zonas', (snapshot) => {
        setZonas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, [{ field: 'nombre', direction: 'asc' }]);

    return () => {
        unsubscribeVendedores();
        unsubscribeZonas();
    };
  }, [tenantId]);

  const openModalForAdd = () => {
    setEditingVendedorId(null);
    setFormData({ nombreCompleto: '', username: '', email: '', password: '', telefono: '', rango: ROLES.VENDEDOR, zonasAsignadas: [] });
    setError('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (vendedor) => {
    setEditingVendedorId(vendedor.id);
    setFormData({
      nombreCompleto: vendedor.nombreCompleto,
      username: vendedor.username,
      email: vendedor.email,
      password: '',
      telefono: vendedor.telefono || '', 
      rango: vendedor.rango || ROLES.VENDEDOR,
      zonasAsignadas: vendedor.zonasAsignadas || []
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleZoneChange = (zoneId) => {
    setFormData(prev => {
        const zonasAsignadas = (prev.zonasAsignadas || []).includes(zoneId)
            ? prev.zonasAsignadas.filter(id => id !== zoneId)
            : [...(prev.zonasAsignadas || []), zoneId];
        return { ...prev, zonasAsignadas };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nombreCompleto || !formData.username || !formData.email || !formData.rango) {
      setError("Por favor, completa todos los campos obligatorios.");
      return;
    }
    
    const currentAdminTenantId = tenantId; 
    if (!currentAdminTenantId) {
        setError("Error de sesión: No se detectó compañía activa del administrador.");
        return;
    }

    let secondaryApp = null;
    
    try {
      if (editingVendedorId) {
        // 1. Actualizar en la subcolección de la compañía
        await updateTenantDoc('vendedores', editingVendedorId, {
          nombreCompleto: formData.nombreCompleto,
          username: formData.username,
          telefono: formData.telefono,
          rango: formData.rango,
          zonasAsignadas: formData.zonasAsignadas
        });

        // 2. Sincronizar con la colección raíz 'users' para la App Móvil
        const vendedorDoc = vendedores.find(v => v.id === editingVendedorId);
        if (vendedorDoc?.firebaseAuthUid) {
            const roleForApp = formData.rango === ROLES.REPARTO ? 'repartidor' : formData.rango.toLowerCase();
            await updateDoc(doc(db, 'users', vendedorDoc.firebaseAuthUid), {
                role: roleForApp,
                companyId: currentAdminTenantId,
                zonasAsignadas: formData.zonasAsignadas // Sincronizamos zonas
            });
            console.log(`✅ Rol actualizado en users/${vendedorDoc.firebaseAuthUid} a: ${roleForApp}`);
        }
      } else {
        if (!formData.password || formData.password.length < 6) {
          setError("La contraseña es obligatoria y debe tener al menos 6 caracteres.");
          return;
        }

        secondaryApp = initializeApp(secondaryFirebaseConfig, "SecondaryRegistrationApp");
        const secondaryAuth = getAuth(secondaryApp);

        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        const newUser = userCredential.user;

        // 3. Crear el perfil en 'vendedores' (DENTRO de la subcolección privada de la empresa)
        await setDoc(getTenantDoc('vendedores', newUser.uid), {
          companyId: currentAdminTenantId,
          nombreCompleto: formData.nombreCompleto,
          username: formData.username,
          email: formData.email,
          telefono: formData.telefono,
          rango: formData.rango,
          zonasAsignadas: formData.zonasAsignadas,
          firebaseAuthUid: newUser.uid,
          createdAt: serverTimestamp()
        });

        // 4. Sincronizar con la colección raíz 'users' para la App Móvil
        const roleForApp = formData.rango === ROLES.REPARTO ? 'repartidor' : formData.rango.toLowerCase();
        await setDoc(doc(db, 'users', newUser.uid), {
            email: formData.email.toLowerCase().trim(),
            companyId: currentAdminTenantId,
            role: roleForApp,
            zonasAsignadas: formData.zonasAsignadas, // Sincronizamos zonas al crear
            createdAt: serverTimestamp()
        });

        await signOut(secondaryAuth);
        console.log("✅ Usuario creado exitosamente sin perder sesión administrativa.");
      }
      setIsModalOpen(false);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError("Este correo electrónico ya está registrado.");
      } else {
        setError("No se pudo guardar el vendedor. Revisa los datos.");
      }
      console.error("Error al guardar vendedor:", err);
    } finally {
        if (secondaryApp) {
            await deleteApp(secondaryApp);
        }
    }
  };

  const handleDelete = async () => {
    const id = vendedorToDelete.id;
    setVendedorToDelete(null);
    try {
        await deleteTenantDoc('vendedores', id);
    } catch (error) {
      console.error("Error al eliminar vendedor:", error);
      setError("No se pudo eliminar el vendedor.");
    }
  };
    
    const filteredVendedores = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return vendedores.filter(vendedor => {
            return (vendedor.nombreCompleto || '').toLowerCase().includes(term) ||
                   (vendedor.email || '').toLowerCase().includes(term);
        });
    }, [vendedores, searchTerm]);

    const totalPages = Math.ceil(filteredVendedores.length / itemsPerPage);
    
    const paginatedVendedores = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredVendedores.slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredVendedores, currentPage, itemsPerPage]);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

  const getRoleBadge = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">{role}</span>;
      case ROLES.VENDEDOR:
        return <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full">{role}</span>;
      case ROLES.REPARTO:
        return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">{role}</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">Sin Rol</span>;
    }
  };

  const getZonasNombres = (zonasIds = []) => {
    if (zonasIds.length === 0) return 'Ninguna';
    return zonasIds.map(id => {
        const zona = zonas.find(z => z.id === id);
        return zona ? zona.nombre : '';
    }).filter(Boolean).join(', ');
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg min-h-[60vh]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-700">Gestión de Vendedores</h2>
        <Button onClick={openModalForAdd} icon={<PlusIcon className="w-5 h-5"/>}>
            Agregar Vendedor
        </Button>
      </div>
      
      <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-grow">
                <input type="text" placeholder="Buscar por nombre o email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
            </div>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md mb-4">{error}</p>}

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Nombre Completo</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Contacto (Email / Tel)</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Rango</th>
              <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Zonas Asignadas</th>
              <th className="px-6 py-3 font-semibold text-center text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
                {paginatedVendedores.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500 italic">No se encontraron vendedores.</td>
                    </tr>
                ) : (
                    paginatedVendedores.map((vendedor) => (
                        <tr key={vendedor.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-gray-800 font-medium">{vendedor.nombreCompleto}</td>
                            <td className="px-6 py-4 text-gray-600">
                                <p>{vendedor.email}</p>
                                <p className="text-xs text-gray-400 flex items-center mt-1">
                                    <PhoneIcon /> {vendedor.telefono || 'Sin teléfono'}
                                </p>
                                <p className="text-xs text-gray-400">@{vendedor.username}</p>
                            </td>
                            <td className="px-6 py-4">{getRoleBadge(vendedor.rango)}</td>
                            <td className="px-6 py-4 text-gray-500">{getZonasNombres(vendedor.zonasAsignadas)}</td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex justify-center space-x-4">
                                    <button onClick={() => openModalForEdit(vendedor)} className="text-blue-500 hover:text-blue-700"><EditIcon /></button>
                                    <button onClick={() => setVendedorToDelete(vendedor)} className="text-red-500 hover:text-red-700"><DeleteIcon /></button>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
          <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
            <h3 className="text-lg font-medium">{editingVendedorId ? 'Editar Vendedor' : 'Agregar Nuevo Vendedor'}</h3>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                  <input type="text" value={formData.nombreCompleto} onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rango</label>
                  <select value={formData.rango} onChange={(e) => setFormData({ ...formData, rango: e.target.value })} className="w-full px-3 py-2 border rounded-md" required>
                    <option value={ROLES.VENDEDOR}>Vendedor</option>
                    <option value={ROLES.ADMIN}>Administrador</option>
                    <option value={ROLES.REPARTO}>Reparto</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border rounded-md" required disabled={!!editingVendedorId} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (WhatsApp)</label>
                  <input 
                    type="tel" 
                    placeholder="Ej: 5493804..."
                    value={formData.telefono} 
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-md bg-slate-50" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario</label>
                  <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/>
                </div>
                {!editingVendedorId && (
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                    <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border rounded-md" required/>
                    </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zonas Asignadas</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
                    {zonas.map(zona => (
                        <label key={zona.id} className="flex items-center space-x-2 text-sm">
                            <input 
                                type="checkbox"
                                checked={(formData.zonasAsignadas || []).includes(zona.id)}
                                onChange={() => handleZoneChange(zona.id)}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{zona.nombre}</span>
                        </label>
                    ))}
                </div>
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
      
      {vendedorToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
              <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
                  <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
                  <p className="mt-2 text-sm text-gray-600">
                      ¿Estás seguro de que quieres eliminar a <strong>{vendedorToDelete.nombreCompleto}</strong>? Esta acción no se puede deshacer.
                  </p>
                  <div className="mt-6 flex justify-end space-x-3">
                      <button type="button" onClick={() => setVendedorToDelete(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                          Cancelar
                      </button>
                      <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700">
                          Eliminar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default Vendedores;