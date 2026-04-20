import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '../hooks/useFirestore';
import { toast } from 'react-toastify';
import CompraForm from './CompraForm';
import ProveedorCtaCte from './ProveedorCtaCte';
import Button from './Button';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 

// --- Iconos SVG ---
const EditIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const DeleteIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PlusIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const ProviderIcon = () => <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;

const IVA_CONDITIONS = [
    'Responsable Inscripto',
    'Monotributista',
    'Exento',
    'Consumidor Final',
    'No Responsable'
];

function Proveedores({ onRegistrarCompra, onViewDashboard }) {
  const { tenantId, onTenantSnapshot, addTenantDoc, updateTenantDoc, deleteTenantDoc, getTenantCollection } = useFirestore();
  const [proveedores, setProveedores] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', cuit: '', condicionIva: IVA_CONDITIONS[0], email: '', telefono: '', direccion: '' });
  const [editingProviderId, setEditingProviderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingCtaCteProv, setViewingCtaCteProv] = useState(null);
  const [saldosPorProveedor, setSaldosPorProveedor] = useState({});

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onTenantSnapshot('proveedores', (snap) => {
        setProveedores(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, [{ field: 'nombre', direction: 'asc' }]);
    return () => unsub();
  }, [tenantId]);

  // CALCULO DE SALDOS EN TIEMPO REAL
  useEffect(() => {
    if (!tenantId) return;
    const q = getTenantCollection('compras');
    const unsub = onSnapshot(q, (snap) => {
        const saldos = {};
        snap.forEach(docSnap => {
            const c = docSnap.data();
            const pid = c.proveedorId;
            if (!saldos[pid]) saldos[pid] = 0;
            saldos[pid] += (c.saldo || 0);
        });
        setSaldosPorProveedor(saldos);
    });
    return unsub;
  }, [tenantId]);

  const openModal = (provider = null) => {
    if (provider) {
        setEditingProviderId(provider.id);
        setFormData({ ...provider });
    } else {
        setEditingProviderId(null);
        setFormData({ nombre: '', cuit: '', condicionIva: IVA_CONDITIONS[0], email: '', telefono: '', direccion: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return toast.error("El nombre es obligatorio");
    
    setLoading(true);
    try {
        const data = { ...formData, updatedAt: serverTimestamp() };
        if (editingProviderId) {
            await updateTenantDoc('proveedores', editingProviderId, data);
            toast.success("Proveedor actualizado");
        } else {
            await addTenantDoc('proveedores', { ...data, createdAt: serverTimestamp() });
            toast.success("Proveedor creado");
        }
        setIsModalOpen(false);
    } catch (err) {
        console.error(err);
        toast.error("Error al guardar proveedor");
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este proveedor?")) return;
    try {
        await deleteTenantDoc('proveedores', id);
        toast.success("Proveedor eliminado");
    } catch (err) {
        toast.error("Error al eliminar");
    }
  };

  const filtered = useMemo(() => {
    return proveedores.filter(p => 
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cuit?.includes(searchTerm)
    );
  }, [proveedores, searchTerm]);

  return (
    <div className="bg-slate-50 min-h-screen p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Proveedores</h2>
          <p className="text-slate-500 font-medium">Gestión de suministros y condiciones fiscales</p>
        </div>
        <Button onClick={() => openModal()} icon={<PlusIcon />}>Nuevo Proveedor</Button>
      </div>

      <div className="mb-6">
          <input 
            type="text" 
            placeholder="Buscar por nombre o CUIT..." 
            className="w-full max-w-md px-5 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(p => (
            <div key={p.id} 
                onClick={() => onViewDashboard(p)}
                className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all group overflow-hidden relative cursor-pointer active:scale-[0.98]"
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                        <ProviderIcon />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openModal(p)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><EditIcon /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"><DeleteIcon /></button>
                    </div>
                </div>
                
                <h4 className="text-xl font-black text-slate-800 mb-1 truncate">{p.nombre}</h4>
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-widest">{p.condicionIva}</span>
                    {p.cuit && <span className="text-xs font-mono text-slate-400 font-bold">{p.cuit}</span>}
                </div>

                <div className="mt-8 flex gap-3" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={() => onRegistrarCompra(p)}
                        className="flex-1 bg-slate-900 text-white px-4 py-3 rounded-xl text-xs font-black hover:bg-black transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        REGISTRAR COMPRA
                    </button>
                    <button 
                        onClick={() => setViewingCtaCteProv(p)}
                        className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        title="Cuenta Corriente"
                    >
                        <svg className="w-5 h-5 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                </div>
                
                {saldosPorProveedor[p.id] > 0 && (
                    <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2">
                         <div className="bg-rose-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg border-2 border-white animate-bounce-subtle">
                             DEUDA: ${saldosPorProveedor[p.id].toLocaleString('es-AR')}
                         </div>
                    </div>
                )}
            </div>
        ))}
      </div>

      {viewingCtaCteProv && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in shadow-2xl">
              <ProveedorCtaCte 
                proveedor={viewingCtaCteProv} 
                onBack={() => setViewingCtaCteProv(null)} 
              />
          </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in shadow-2xl">
              <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                  <header className="bg-slate-50 px-8 py-6 border-b border-slate-100">
                      <h3 className="text-2xl font-black text-slate-800">{editingProviderId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                      <p className="text-slate-500 font-medium">Condiciones fiscales y contacto</p>
                  </header>
                  
                  <form onSubmit={handleSave} className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="col-span-2">
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nombre / Razón Social *</label>
                              <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" required />
                          </div>
                          <div>
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">CUIT</label>
                              <input type="text" value={formData.cuit} onChange={e => setFormData({...formData, cuit: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono" placeholder="XX-XXXXXXXX-X" />
                          </div>
                          <div>
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Condición IVA</label>
                              <select value={formData.condicionIva} onChange={e => setFormData({...formData, condicionIva: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all">
                                  {IVA_CONDITIONS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Email</label>
                              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                          </div>
                          <div>
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Teléfono</label>
                              <input type="tel" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                          </div>
                          <div className="col-span-2">
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Dirección Física</label>
                              <input type="text" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all" />
                          </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                          <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95">CANCELAR</button>
                          <button type="submit" disabled={loading} className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">
                              {loading ? 'GUARDANDO...' : 'GUARDAR PROVEEDOR'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

export default Proveedores;
