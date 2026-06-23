import { useState, useEffect } from 'react';
import { db } from '../firebase.js';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import Button from './Button'; 
import { useFirestore } from '../hooks/useFirestore';

// --- ICONOS PREMIUM (Stroke 1.5, Rounded) ---
const Icono = ({ path, d2, className="w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
  </svg>
);

const EditIcon = () => <Icono path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />;
const DeleteIcon = () => <Icono path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456-1.278A11.862 11.862 0 0020.62 6m-14.456.374a11.862 11.862 0 00-.87 5.143" />;
const SearchIcon = () => <Icono path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />;
const PlusIcon = ({ className }) => <Icono className={className} path="M12 4.5v15m7.5-7.5h-15" />;
const UserIcon = () => <Icono path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A1.5 1.5 0 0118 21.75H6.001c-.621 0-1.125-.504-1.125-1.125a1.5 1.5 0 01.624-1.507z" />;
const EyeIcon = () => <Icono path="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" d2="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />;
const XIcon = () => <Icono path="M6 18L18 6M6 6l12 12" />;
const BankIcon = () => <Icono path="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />;
const CheckCircleIcon = () => <Icono path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
const UsersIcon = () => <Icono path="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />;

const formatCurrency = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n || 0);

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
  const [filterZona, setFilterZona] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });
  
  const [rubros, setRubros] = useState([]);
  const [zonas, setZonas] = useState([]); 
  const [priceLists, setPriceLists] = useState([]);
  const [vendedores, setVendedores] = useState([]); 
  
  // --- ESTADO CLIENTE ---
  const initialClientState = {
    nombre: '', telefono: '', direccion: '', barrio: '', localidad: '', email: '',
    rubroId: '', zonaId: '', listaPreciosAsignada: '', vendedorAsignadoId: '', 
    isArca: false, requiereFacturaAfip: false, condicionIva: 'CF', tipoDocumento: 'SC', numeroDocumento: '', dni: '',
    lat: '', lng: '' 
  };

  const [newCliente, setNewCliente] = useState(initialClientState);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deudaMap, setDeudaMap] = useState({});
  const [filterDeuda, setFilterDeuda] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { tenantId, onTenantSnapshot, addTenantDoc, updateTenantDoc, deleteTenantDoc, getTenantCollection } = useFirestore();

  // 1. CARGA DE DATOS (Filtrado por Tenant)
  useEffect(() => {
    if (!tenantId) return;

    const unsubRubros = onTenantSnapshot('rubros', (s) => setRubros(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubZonas = onTenantSnapshot('zonas', (s) => setZonas(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubListas = onTenantSnapshot('listas_precios', (s) => setPriceLists(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubVend = onTenantSnapshot('vendedores', (s) => setVendedores(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubClientes = onTenantSnapshot('clientes', (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.activo !== false);
      setClientes(data);
      setFilteredClientes(data);
    });

    const ventasRef = collection(db, 'companies', tenantId, 'ventas');
    const qDeuda = query(ventasRef, where('saldoPendiente', '>', 0));
    const unsubDeuda = onSnapshot(qDeuda, (snap) => {
      const deuda = {};
      snap.docs.forEach(d => {
        const v = d.data();
        if (v.estado !== 'Anulada' && v.clienteId) {
          deuda[v.clienteId] = (deuda[v.clienteId] || 0) + (v.saldoPendiente || 0);
        }
      });
      setDeudaMap(deuda);
    });

    return () => {
        unsubRubros(); unsubZonas(); unsubListas(); unsubVend(); unsubClientes(); unsubDeuda();
    };
  }, [tenantId]);
  
  // 2. FILTROS Y ORDENAMIENTO
  useEffect(() => {
    let results = clientes;

    if (filterZona) {
      results = results.filter(c => c.zonaId === filterZona);
    }

    if (filterDeuda) {
      results = results.filter(c => (deudaMap[c.id] || 0) > 0);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      results = results.filter(c =>
        (c.nombre && c.nombre.toLowerCase().includes(lower)) ||
        (c.direccion && c.direccion.toLowerCase().includes(lower)) ||
        (c.numeroDocumento && c.numeroDocumento.includes(searchTerm)) ||
        (c.barrio && c.barrio.toLowerCase().includes(lower))
      );
    }

    if (sortConfig.key) {
      results = [...results].sort((a, b) => {
        if (sortConfig.key === 'deuda') {
          const dA = deudaMap[a.id] || 0;
          const dB = deudaMap[b.id] || 0;
          return sortConfig.direction === 'asc' ? dA - dB : dB - dA;
        }

        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';

        if (sortConfig.key === 'zonaId') {
          valA = zonas.find(z => z.id === a.zonaId)?.nombre || '';
          valB = zonas.find(z => z.id === b.zonaId)?.nombre || '';
        } else if (sortConfig.key === 'vendedorAsignadoId') {
          valA = vendedores.find(v => v.id === a.vendedorAsignadoId)?.nombreCompleto || '';
          valB = vendedores.find(v => v.id === b.vendedorAsignadoId)?.nombreCompleto || '';
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredClientes(results);
    setCurrentPage(1);
  }, [searchTerm, filterZona, filterDeuda, sortConfig, clientes, zonas, vendedores, deudaMap]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Helpers de Nombre
  const getRubroNombre = (id) => rubros.find(r => r.id === id)?.nombre || <span className="text-slate-300">-</span>;
  const getZonaNombre = (id) => zonas.find(z => z.id === id)?.nombre || <span className="text-red-400 font-bold text-xs">Sin Zona</span>;
  const getVendedorNombre = (id) => vendedores.find(v => v.id === id)?.nombreCompleto || <span className="text-slate-300 text-xs italic">Libre</span>;

  // Paginación
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const currentClientes = filteredClientes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- HANDLERS MODALES ---
  const openNewModal = () => setIsNewModalOpen(true);
  const closeNewModal = () => { setIsNewModalOpen(false); setNewCliente(initialClientState); };
  
  const handleNewClienteChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewCliente(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  
  const handleCondicionFiscal = (condicion, setData) => {
    const map = {
      CF: { isArca: false, requiereFacturaAfip: false, condicionIva: 'CF', tipoDocumento: 'SC', numeroDocumento: '' },
      MT: { isArca: true,  requiereFacturaAfip: true,  condicionIva: 'MT', tipoDocumento: 'DNI', numeroDocumento: '' },
      RI: { isArca: true,  requiereFacturaAfip: true,  condicionIva: 'RI', tipoDocumento: 'CUIT', numeroDocumento: '' },
    };
    setData(prev => ({ ...prev, ...map[condicion] }));
  };

  const handleAddCliente = async (e) => {
    e.preventDefault();
    if (!newCliente.nombre.trim() || !newCliente.zonaId) { toast.error('Nombre y Zona son obligatorios.'); return; }
    if (newCliente.condicionIva === 'RI' && (!newCliente.numeroDocumento || newCliente.numeroDocumento.length !== 11)) {
        toast.error('Para Resp. Inscripto el CUIT es obligatorio (11 dígitos sin guiones).'); return;
    }
    setIsSaving(true);
    try {
      await addTenantDoc('clientes', {
        ...newCliente,
        condicionIva: newCliente.isArca ? newCliente.condicionIva : 'CF',
        requiereFacturaAfip: newCliente.requiereFacturaAfip ?? newCliente.isArca,
        activo: true,
        fechaCreacion: new Date()
      });
      toast.success('Cliente agregado'); closeNewModal();
    } catch (error) {
        console.error("Error add client:", error);
        toast.error('Error al agregar: ' + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteCliente = async (id) => {
    if (window.confirm('¿Eliminar cliente? El historial de ventas se conservará.')) {
      try {
        await updateTenantDoc('clientes', id, { activo: false, eliminadoEn: new Date() });
        toast.success('Cliente eliminado.');
      } catch (error) {
        console.error(error);
        toast.error('Error al eliminar.');
      }
    }
  };
  
  const openEditModal = (cliente) => {
    setEditingCliente({
      ...initialClientState, ...cliente, 
      zonaId: cliente.zonaId || '', listaPreciosAsignada: cliente.listaPreciosAsignada || '',
      vendedorAsignadoId: cliente.vendedorAsignadoId || '', isArca: cliente.isArca || false,
      requiereFacturaAfip: cliente.requiereFacturaAfip ?? cliente.isArca ?? false,
      tipoDocumento: cliente.tipoDocumento || 'SC', numeroDocumento: cliente.numeroDocumento || '',
      lat: cliente.lat || '', lng: cliente.lng || ''
    });
    setIsEditModalOpen(true);
  };
  
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingCliente(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  
  const handleUpdateCliente = async (e) => {
    e.preventDefault();
    if (!editingCliente.nombre.trim() || !editingCliente.zonaId) { toast.error('Faltan datos.'); return; }
    if (editingCliente.condicionIva === 'RI' && (!editingCliente.numeroDocumento || editingCliente.numeroDocumento.length !== 11)) {
        toast.error('Para Resp. Inscripto el CUIT es obligatorio (11 dígitos sin guiones).'); return;
    }
    setIsSaving(true);
    try {
      const { id, ...data } = editingCliente;
      await updateTenantDoc('clientes', id, { ...data, condicionIva: data.isArca ? data.condicionIva : 'CF', requiereFacturaAfip: data.requiereFacturaAfip ?? data.isArca });
      toast.success('Actualizado'); setIsEditModalOpen(false); setEditingCliente(null);
    } catch (error) {
      console.error(error); toast.error('Error al actualizar.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- RENDERIZADO DEL FORMULARIO (MODAL PREMIUM) ---
  const renderFormFields = (data, handleChange, setData) => (
      <div className="space-y-6">
        {/* SECCIÓN 1: DATOS PERSONALES & UBICACIÓN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* IZQUIERDA: IDENTIFICACIÓN */}
            <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Información General</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre del Cliente *</label>
                        <input 
                            type="text" name="nombre" value={data.nombre} onChange={handleChange} 
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-400" 
                            placeholder="Ej: Kiosco El Paso"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Teléfono</label>
                        <input 
                            type="text" name="telefono" value={data.telefono} onChange={handleChange} 
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
                        <input 
                            type="email" name="email" value={data.email} onChange={handleChange} 
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* DERECHA: LOGÍSTICA */}
            <div className="md:col-span-1 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4">Logística</h4>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-indigo-800 mb-1.5">Zona de Reparto *</label>
                        <select 
                            name="zonaId" value={data.zonaId} onChange={handleChange} 
                            className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-indigo-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer"
                        >
                            <option value="">-- Seleccionar --</option>
                            {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-indigo-800 mb-1.5">Vendedor Asignado</label>
                        <select 
                            name="vendedorAsignadoId" value={data.vendedorAsignadoId} onChange={handleChange} 
                            className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-indigo-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer"
                        >
                            <option value="">-- Libre (Todos) --</option>
                            {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombreCompleto}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        {/* SECCIÓN 2: DIRECCIÓN DETALLADA */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Dirección de Entrega</h4>
             <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Calle y Altura</label>
                    <input type="text" name="direccion" value={data.direccion} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Barrio</label>
                    <input type="text" name="barrio" value={data.barrio} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Localidad</label>
                    <input type="text" name="localidad" value={data.localidad} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                </div>
             </div>
        </div>

        {/* SECCIÓN 3: COMERCIAL Y FISCAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* COMERCIAL */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Condiciones Comerciales</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Rubro</label>
                        <select name="rubroId" value={data.rubroId} onChange={handleChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
                            <option value="">-- Seleccionar --</option>
                            {rubros.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-amber-600 mb-1.5">Lista de Precios</label>
                        <select name="listaPreciosAsignada" value={data.listaPreciosAsignada} onChange={handleChange} className="w-full px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-bold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none shadow-sm cursor-pointer">
                            <option value="">Base (General)</option>
                            {priceLists.map(l => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* FISCAL */}
            <div className="p-5 rounded-2xl border border-slate-100 shadow-sm bg-white">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Condición Fiscal (ARCA)</h4>

                {/* Pills de condición */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                        { id: 'CF', label: 'Consumidor Final', activeClass: 'border-slate-500 bg-slate-100 text-slate-700' },
                        { id: 'MT', label: 'Monotributo',      activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
                        { id: 'RI', label: 'Resp. Inscripto',  activeClass: 'border-indigo-500 bg-indigo-50 text-indigo-700' },
                    ].map(({ id, label, activeClass }) => {
                        const active = id === 'CF' ? !data.isArca : (data.isArca && data.condicionIva === id);
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => handleCondicionFiscal(id, setData)}
                                className={`py-2 px-2 rounded-xl text-xs font-bold border-2 transition-all text-center ${active ? activeClass : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-500'}`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Switch independiente de facturación ARCA */}
                <button
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, requiereFacturaAfip: !prev.requiereFacturaAfip }))}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all mb-3 ${
                        data.requiereFacturaAfip
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-5 rounded-full transition-all relative ${data.requiereFacturaAfip ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${data.requiereFacturaAfip ? 'left-5' : 'left-0.5'}`}/>
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-black uppercase tracking-wider leading-none">Facturación ARCA activa</p>
                            <p className="text-[10px] mt-0.5 font-medium">
                                {data.requiereFacturaAfip ? 'Se emitirán facturas fiscales para este cliente' : 'Sin fiscalización — ticket simplificado'}
                            </p>
                        </div>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${data.requiereFacturaAfip ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                        {data.requiereFacturaAfip ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                </button>

                {/* Aviso para condiciones no estándar (EX, NR) */}
                {data.isArca && !['RI', 'MT'].includes(data.condicionIva) && (
                    <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mb-3">
                        Condición actual: <span className="font-bold">{data.condicionIva}</span> — seleccioná una opción para cambiarla.
                    </p>
                )}

                {/* Campo de documento según condición */}
                {!data.isArca ? (
                    <div>
                        <p className="text-[10px] text-slate-400 italic mb-2">Facturación simplificada — sin datos ARCA.</p>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">DNI (uso interno, opcional)</label>
                        <input
                            type="text" name="dni" value={data.dni} onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-300 outline-none"
                            placeholder="Opcional"
                        />
                    </div>
                ) : data.condicionIva === 'RI' ? (
                    <div>
                        <label className="block text-[10px] font-bold text-indigo-700 mb-1 uppercase">CUIT *</label>
                        <input
                            type="text" name="numeroDocumento" value={data.numeroDocumento} onChange={handleChange}
                            maxLength={11}
                            className={`w-full px-3 py-2 border rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${data.numeroDocumento && data.numeroDocumento.length !== 11 ? 'border-red-300 bg-red-50' : 'border-indigo-200 bg-indigo-50'}`}
                            placeholder="Sin guiones (11 dígitos)"
                        />
                        {data.numeroDocumento && data.numeroDocumento.length !== 11 && (
                            <p className="text-[10px] text-red-500 mt-1">El CUIT debe tener exactamente 11 dígitos.</p>
                        )}
                        <p className="text-[10px] text-indigo-500 mt-1 font-semibold">Emite Factura A</p>
                    </div>
                ) : (
                    <div>
                        <label className="block text-[10px] font-bold text-emerald-700 mb-1 uppercase">DNI (opcional)</label>
                        <input
                            type="text" name="numeroDocumento" value={data.numeroDocumento} onChange={handleChange}
                            className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="DNI sin guiones"
                        />
                        <p className="text-[10px] text-emerald-600 mt-1 font-semibold">Emite Factura B</p>
                    </div>
                )}
            </div>
        </div>
      </div>
  );

  const clientesConDeuda = clientes.filter(c => (deudaMap[c.id] || 0) > 0).length;
  const totalDeudaGlobal = Object.values(deudaMap).reduce((sum, v) => sum + v, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Cartera de Clientes</h2>
            <p className="text-slate-500 mt-1 font-medium">Gestión comercial y fiscal</p>
        </div>
        <Button onClick={openNewModal} icon={<PlusIcon className="w-5 h-5"/>}>
            Nuevo Cliente
        </Button>
      </div>

      {/* MÉTRICAS RESUMEN */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500"><UsersIcon /></div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Clientes</p>
            <p className="text-2xl font-black text-slate-800">{clientes.length}</p>
          </div>
        </div>
        <button
          onClick={() => setFilterDeuda(f => !f)}
          className={`rounded-2xl border shadow-sm px-5 py-4 flex items-center gap-4 transition-all text-left w-full ${filterDeuda ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-red-200 hover:bg-red-50/30'}`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${filterDeuda ? 'bg-red-100 text-red-500' : 'bg-red-50 text-red-400'}`}><BankIcon /></div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Con Deuda {filterDeuda && <span className="text-red-500">• Filtrado</span>}</p>
            <p className={`text-2xl font-black ${clientesConDeuda > 0 ? 'text-red-600' : 'text-slate-800'}`}>{clientesConDeuda}</p>
          </div>
        </button>
        <div className={`rounded-2xl border shadow-sm px-5 py-4 flex items-center gap-4 ${totalDeudaGlobal > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${totalDeudaGlobal > 0 ? 'bg-red-100 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
            {totalDeudaGlobal > 0 ? <BankIcon /> : <CheckCircleIcon />}
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Deuda Total C.C.</p>
            <p className={`text-xl font-black ${totalDeudaGlobal > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(totalDeudaGlobal)}</p>
          </div>
        </div>
      </div>

      {/* SEARCH BAR PREMIUM & FILTROS */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex-1">
          <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400"><SearchIcon /></span>
              <input
                  type="text"
                  placeholder="Buscar por nombre, dirección, barrio..."
                  className="w-full pl-12 pr-4 py-3 bg-transparent border-none text-slate-700 font-medium placeholder-slate-400 focus:ring-0 outline-none text-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
        </div>

        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-full md:w-52 flex items-center relative">
            <select
               value={filterZona}
               onChange={(e) => setFilterZona(e.target.value)}
               className="w-full bg-transparent border-none text-slate-700 font-medium focus:ring-0 outline-none text-sm cursor-pointer py-3 pl-4 pr-10 appearance-none"
            >
               <option value="">Todas las Zonas</option>
               {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
            <div className="absolute right-4 pointer-events-none text-slate-400">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </div>
        </div>

        <button
          onClick={() => setFilterDeuda(f => !f)}
          className={`px-5 py-3 rounded-2xl shadow-sm border font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${filterDeuda ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600'}`}
        >
          <BankIcon />
          {filterDeuda ? 'Ver Todos' : 'Con Deuda'}
        </button>
      </div>

      {/* TABLA DE CLIENTES (TALLA GRANDE + ACCIONES VISIBLES) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full whitespace-nowrap border-separate border-spacing-y-0">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th 
                  className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 rounded-tl-2xl cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  onClick={() => handleSort('nombre')}
                >
                  <div className="flex items-center gap-2">
                    Nombre / Razón Social
                    {sortConfig.key === 'nombre' && <span className="text-indigo-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
                <th 
                  className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  onClick={() => handleSort('zonaId')}
                >
                  <div className="flex items-center gap-2">
                    Zona
                    {sortConfig.key === 'zonaId' && <span className="text-indigo-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
                <th 
                  className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  onClick={() => handleSort('direccion')}
                >
                  <div className="flex items-center gap-2">
                    Ubicación
                    {sortConfig.key === 'direccion' && <span className="text-indigo-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
                <th 
                  className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  onClick={() => handleSort('vendedorAsignadoId')}
                >
                  <div className="flex items-center gap-2">
                    Vendedor
                    {sortConfig.key === 'vendedorAsignadoId' && <span className="text-indigo-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
                <th 
                  className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  onClick={() => handleSort('condicionIva')}
                >
                  <div className="flex items-center gap-2">
                    Fiscal
                    {sortConfig.key === 'condicionIva' && <span className="text-indigo-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
                <th
                  className="px-6 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  onClick={() => handleSort('listaPreciosAsignada')}
                >
                  <div className="flex items-center gap-2">
                    Lista
                    {sortConfig.key === 'listaPreciosAsignada' && <span className="text-indigo-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
                <th
                  className="px-6 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  onClick={() => handleSort('deuda')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Saldo C.C.
                    {sortConfig.key === 'deuda' && <span className="text-red-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
                  </div>
                </th>
                <th className="px-6 py-5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 rounded-tr-2xl">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentClientes.length === 0 ? (
                <tr><td colSpan="8" className="p-10 text-center text-slate-400 italic">No se encontraron clientes.</td></tr>
              ) : (
                currentClientes.map((cliente, index) => {
                  const isLast = index === currentClientes.length - 1;
                  const saldoDeudor = deudaMap[cliente.id] || 0;
                  const tieneDeuda = saldoDeudor > 0;
                  const rowBg = tieneDeuda ? 'bg-red-50/30 group-hover:bg-red-50/60' : 'bg-white group-hover:bg-indigo-50/40';
                  return (
                  <tr key={cliente.id} className={`group transition-colors ${tieneDeuda ? 'border-l-4 border-l-red-400' : ''}`}>

                    {/* NOMBRE */}
                    <td className={`px-6 py-5 ${rowBg} transition-colors border-b border-l border-slate-200 ${isLast ? 'rounded-bl-2xl' : ''}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${tieneDeuda ? 'bg-red-100 border-red-300 text-red-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                {cliente.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <span className="block font-bold text-slate-800 text-sm">{cliente.nombre}</span>
                                <span className="text-xs text-slate-400">{cliente.email || 'Sin email'}</span>
                            </div>
                        </div>
                    </td>

                    <td className={`px-6 py-5 ${rowBg} transition-colors border-b border-slate-200`}>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                            {getZonaNombre(cliente.zonaId)}
                        </span>
                    </td>

                    <td className={`px-6 py-5 ${rowBg} transition-colors border-b border-slate-200`}>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-700 truncate max-w-[180px]">{cliente.direccion}</span>
                            <span className="text-xs text-slate-400 mt-0.5">{cliente.localidad}</span>
                        </div>
                    </td>

                    <td className={`px-6 py-5 ${rowBg} transition-colors border-b border-slate-200`}>
                        <span className={`text-xs font-medium ${cliente.vendedorAsignadoId ? 'text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100' : 'text-slate-400 italic'}`}>
                            {getVendedorNombre(cliente.vendedorAsignadoId)}
                        </span>
                    </td>

                    <td className={`px-6 py-5 ${rowBg} transition-colors border-b border-slate-200`}>
                        <div className="flex flex-col">
                            {(cliente.requiereFacturaAfip ?? cliente.isArca) ? (
                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full w-fit border border-indigo-200 mb-1 uppercase tracking-wider flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>ARCA ACTIVO
                                </span>
                            ) : (
                                <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full w-fit border border-slate-200 mb-1 uppercase tracking-wider flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"></span>SIN ARCA
                                </span>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                    cliente.condicionIva === 'RI' ? 'bg-amber-100 text-amber-700' :
                                    cliente.condicionIva === 'MT' ? 'bg-emerald-100 text-emerald-700' :
                                    cliente.condicionIva === 'EX' ? 'bg-blue-100 text-blue-700' :
                                    'bg-slate-100 text-slate-500'
                                }`}>
                                    {cliente.condicionIva || 'CF'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono font-bold tracking-tighter">{cliente.numeroDocumento || cliente.dni || 'S/D'}</span>
                            </div>
                        </div>
                    </td>

                    <td className={`px-6 py-5 ${rowBg} transition-colors border-b border-slate-200`}>
                        {cliente.listaPreciosAsignada ? (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">{cliente.listaPreciosAsignada}</span>
                        ) : (
                            <span className="text-xs text-slate-400 border border-slate-100 px-2 py-1 rounded">Base</span>
                        )}
                    </td>

                    {/* SALDO CUENTA CORRIENTE */}
                    <td className={`px-6 py-5 text-right ${rowBg} transition-colors border-b border-slate-200`}>
                        {tieneDeuda ? (
                            <button
                                onClick={() => onViewDetail(cliente.id)}
                                className="inline-flex flex-col items-end group/saldo"
                                title="Ver cuenta corriente"
                            >
                                <span className="text-sm font-black text-red-600 group-hover/saldo:underline">{formatCurrency(saldoDeudor)}</span>
                                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Adeuda</span>
                            </button>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                <CheckCircleIcon />
                                Al día
                            </span>
                        )}
                    </td>

                    {/* ACCIONES */}
                    <td className={`px-6 py-5 text-right ${rowBg} transition-colors border-b border-r border-slate-200 ${isLast ? 'rounded-br-2xl' : ''}`}>
                        <div className="flex items-center justify-end gap-2">
                            <button onClick={() => onViewDetail(cliente.id)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Ver Detalle">
                                <EyeIcon />
                            </button>
                            <button onClick={() => openEditModal(cliente)} className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all" title="Editar">
                                <EditIcon />
                            </button>
                            <button onClick={() => handleDeleteCliente(cliente.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Eliminar">
                                <DeleteIcon />
                            </button>
                        </div>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Paginación */}
      <div className="flex justify-center mt-8 gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm">Anterior</button>
          <span className="px-4 py-2 bg-white border border-slate-200 text-slate-800 text-sm font-bold rounded-lg shadow-sm flex items-center">{currentPage} / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm">Siguiente</button>
      </div>

      {/* --- Modal CREACIÓN (Fondo Slate-50 + Inputs White) --- */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-50 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-white z-10">
              <h3 className="text-xl font-bold text-slate-800">Nuevo Cliente</h3>
              <button onClick={closeNewModal} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"><XIcon/></button>
            </div>
            <div className="overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                <form onSubmit={handleAddCliente}>
                    {renderFormFields(newCliente, handleNewClienteChange, setNewCliente)}
                    <div className="pt-6 flex justify-end gap-3 border-t border-slate-200 mt-6">
                        {/* --- BOTONES ACTUALIZADOS --- */}
                        <Button variant="secondary" onClick={closeNewModal}>Cancelar</Button>
                        <Button type="submit">Guardar Cliente</Button>
                    </div>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal EDICIÓN --- */}
      {isEditModalOpen && editingCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-50 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            <div className="px-8 py-5 border-b border-slate-200 flex justify-between items-center bg-white z-10">
              <h3 className="text-xl font-bold text-slate-800">Editar Cliente</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"><XIcon/></button>
            </div>
            <div className="overflow-y-auto p-8 custom-scrollbar bg-slate-50">
                <form onSubmit={handleUpdateCliente}>
                    {renderFormFields(editingCliente, handleEditChange, setEditingCliente)}
                    <div className="pt-6 flex justify-end gap-3 border-t border-slate-200 mt-6">
                        {/* --- BOTONES ACTUALIZADOS --- */}
                        <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                        <Button type="submit">Guardar Cambios</Button>
                    </div>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;