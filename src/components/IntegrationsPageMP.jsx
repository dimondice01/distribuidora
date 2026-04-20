import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, query, collection, where, limit, getDocs, addDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { useFirestore } from '../hooks/useFirestore';
import { 
    CreditCard, Save, Smartphone, Search, CheckCircle2, 
    AlertTriangle, HelpCircle, ExternalLink, Plug, 
    RefreshCw, Power, Loader2, Eye, EyeOff, XCircle,
    User, Store, ChevronRight, Trash2, Plus
} from 'lucide-react';
import { toast } from 'react-toastify';

// ==================================================================================
// 🎓 MODAL DE AYUDA (TUTORIAL MP)
// ==================================================================================
const TutorialModalMP = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const steps = [
        { 
            title: "1. Ir a MercadoPago Developers", 
            desc: "Ingresa al panel de desarrolladores con la cuenta del negocio (la dueña de los cobros).",
            link: "https://www.mercadopago.com.ar/developers/panel",
            icon: ExternalLink
        },
        { 
            title: "2. Crear una Aplicación", 
            desc: "Haz clic en '+ Crear Aplicación'. Selecciona 'Pagos Presenciales' (o MP Point). Ponle de nombre 'Sistema Noar'.",
            icon: Plug
        },
        { 
            title: "3. Obtener Credenciales", 
            desc: "En el menú izquierdo ve a 'Credenciales de Producción'. Allí verás el 'Access Token'.",
            icon: CreditCard
        },
        { 
            title: "4. Copiar y Pegar", 
            desc: "Copia el texto que empieza con 'APP_USR-...' y pégalo en el campo 'Access Token' de esta pantalla.",
            icon: Save
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-[#009EE3] p-5 text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2"><HelpCircle size={20}/> Guía Mercado Pago</h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><XCircle size={20}/></button>
                </div>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {steps.map((step, i) => (
                        <div key={i} className="flex gap-4 group">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#009EE3] flex items-center justify-center shrink-0 font-bold border border-blue-100 group-hover:scale-110 transition-transform">
                                <step.icon size={18}/>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">{step.title}</h4>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                                {step.link && (
                                    <a href={step.link} target="_blank" rel="noreferrer" className="mt-2 text-xs text-[#009EE3] font-bold flex items-center hover:underline">
                                        Abrir enlace <ExternalLink size={10} className="ml-1"/>
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-5 bg-gray-50 text-center border-t">
                    <button onClick={onClose} className="bg-[#009EE3] text-white px-6 py-2 rounded-lg font-bold text-sm w-full hover:bg-[#007eb5] transition-colors">
                        ¡Entendido!
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================================================================================
// 🚀 COMPONENTE PRINCIPAL
// ==================================================================================
const IntegrationsPageMP = () => {
    const { tenantId, getTenantCollection, getTenantDoc, addTenantDoc, updateTenantDoc, db } = useFirestore();
    const [config, setConfig] = useState({
        accessToken: '',
        userId: '', 
        active: false
    });
    const [configDocId, setConfigDocId] = useState(null);
    
    const [terminals, setTerminals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [configuring, setConfiguring] = useState(null); 
    const [showToken, setShowToken] = useState(false);
    const [tutorialOpen, setTutorialOpen] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    // --- NUEVOS ESTADOS PARA ASIGNACIÓN ---
    const [vendedores, setVendedores] = useState([]);
    const [cajasQR, setCajasQR] = useState([]); // {id, nombre}
    const [newCaja, setNewCaja] = useState({ id: '', nombre: '' });
    const [savingUser, setSavingUser] = useState(null);

    useEffect(() => { 
        if (tenantId) {
            loadConfig();
            loadVendedores();
        }
    }, [tenantId]);

    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        setUnsavedChanges(true);
    };

    const loadConfig = async () => {
        setLoading(true);
        try {
            const q = query(getTenantCollection('config'), where('tipo', '==', 'mercadopago'), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const docSnap = snap.docs[0];
                const data = docSnap.data();
                setConfigDocId(docSnap.id);
                setConfig({
                    accessToken: data.accessToken || '',
                    userId: data.userId || '',
                    active: data.active || false
                });
                setCajasQR(data.cajasQR || []);
            }
        } catch (e) { console.error("Error al cargar config MP:", e); } 
        finally { setLoading(false); }
    };

    const loadVendedores = async () => {
        const q = getTenantCollection('vendedores');
        const snap = await getDocs(q);
        setVendedores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const finalData = { ...config, cajasQR, companyId: tenantId, tipo: 'mercadopago' };
            if (configDocId) {
                await updateTenantDoc('config', configDocId, finalData);
            } else {
                const newDocRef = await addTenantDoc('config', finalData);
                setConfigDocId(newDocRef.id);
            }
            setUnsavedChanges(false);
            toast.success("✅ Configuración de Mercado Pago guardada.");
        } catch (e) {
            console.error(e);
            toast.error("Error al guardar: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCaja = () => {
        if (!newCaja.id || !newCaja.nombre) return toast.warning("Completa ID y Nombre de la Caja");
        setCajasQR([...cajasQR, newCaja]);
        setNewCaja({ id: '', nombre: '' });
        setUnsavedChanges(true);
    };

    const handleRemoveCaja = (id) => {
        setCajasQR(cajasQR.filter(c => c.id !== id));
        setUnsavedChanges(true);
    };

    const handleAssignDevice = async (vendedorId, field, value) => {
        setSavingUser(vendedorId);
        try {
            const v = vendedores.find(v => v.id === vendedorId);
            const updateObj = { [field]: value };
            
            // 1. Actualizar en la subcolección del tenant
            await updateTenantDoc('vendedores', vendedorId, updateObj);
            
            // 2. Sincronizar con users/{uid} para la App Móvil
            if (v.firebaseAuthUid) {
                const userRef = doc(db, 'users', v.firebaseAuthUid);
                await setDoc(userRef, updateObj, { merge: true });
            }

            // 3. Actualizar estado local
            setVendedores(prev => prev.map(u => u.id === vendedorId ? { ...u, ...updateObj } : u));
            toast.success("Asignación actualizada");
        } catch (e) {
            console.error(e);
            toast.error("Error al asignar");
        } finally {
            setSavingUser(null);
        }
    };

    // --- FUNCIONES DE CLOUD ---

    const handleSearchTerminals = async () => {
        if (unsavedChanges) return alert("⚠️ Guarda los cambios (Token) antes de buscar.");
        if (!config.accessToken) return alert("⚠️ Ingresa un Access Token primero.");

        setSearching(true);
        setTerminals([]);
        try {
            const functions = getFunctions();
            // Llamamos a la función que migramos hoy
            const obtenerTerminales = httpsCallable(functions, 'obtenerTerminales');
            
            const result = await obtenerTerminales();
            const devices = result.data.devices || [];
            
            if (devices.length === 0) {
                alert("⚠️ No se encontraron terminales Point asociados a esta cuenta.");
            } else {
                setTerminals(devices);
            }
        } catch (e) {
            console.error(e);
            alert("Error buscando terminales: " + (e.message || "Revisa el Token"));
        } finally {
            setSearching(false);
        }
    };

    const handleConfigurePoint = async (deviceId, mode) => {
        setConfiguring(deviceId);
        try {
            const functions = getFunctions();
            const configurarPoint = httpsCallable(functions, 'configurarPoint');
            
            await configurarPoint({ deviceId, mode });
            
            alert(`✅ Terminal configurada en modo: ${mode === 'PDV' ? 'INTEGRADO (PDV)' : 'STANDALONE'}.\n\nReinicia el Point para ver los cambios.`);
        } catch (e) {
            console.error(e);
            alert("Error configurando Point: " + e.message);
        } finally {
            setConfiguring(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-slate-800">
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <CreditCard className="text-[#009EE3]" /> Integración Mercado Pago
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm">Gestiona cobros con QR y terminales Point Smart para tu flota.</p>
                    </div>
                    <button 
                        onClick={() => setTutorialOpen(true)}
                        className="flex items-center gap-2 text-sm font-bold text-[#009EE3] bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors"
                    >
                        <HelpCircle size={16}/> ¿Cómo obtener el Token?
                    </button>
                </div>

                {/* MAIN CARD */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    
                    {/* STATUS BAR */}
                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${config.active ? 'bg-[#009EE3]' : 'bg-slate-600'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${config.active ? 'translate-x-6' : ''}`}/>
                            </div>
                            <input type="checkbox" className="hidden" checked={config.active} onChange={e => handleChange('active', e.target.checked)} />
                            <span className="font-bold text-sm uppercase tracking-wide">
                                {config.active ? 'Integración Activa' : 'Integración Pausada'}
                            </span>
                        </label>
                    </div>

                    <div className="p-8 space-y-8">
                        
                        {/* 1. CREDENCIALES */}
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4 flex items-center gap-2">
                                <CreditCard size={20} className="text-slate-400"/> Credenciales (Access Token)
                            </h3>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1 relative">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Production Access Token</label>
                                    <div className="relative">
                                        <input 
                                            type={showToken ? "text" : "password"}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-[#009EE3] outline-none transition-all font-mono text-slate-700 pr-10"
                                            placeholder="APP_USR-..."
                                            value={config.accessToken}
                                            onChange={e => handleChange('accessToken', e.target.value)}
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowToken(!showToken)}
                                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                        >
                                            {showToken ? <EyeOff size={18}/> : <Eye size={18}/>}
                                        </button>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleSave}
                                    disabled={loading || !unsavedChanges}
                                    className="bg-[#009EE3] text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-[#007eb5] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center gap-2"
                                >
                                    {loading ? '...' : <Save size={18}/>}
                                    Guardar
                                </button>
                            </div>
                            {unsavedChanges && <p className="text-xs text-orange-500 font-bold mt-2 animate-pulse">⚠ Tienes cambios sin guardar. Guarda antes de buscar terminales.</p>}
                        </section>

                        {/* 2. GESTIÓN DE TERMINALES (POINT) */}
                        <section className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Smartphone size={20} className="text-slate-400"/> Dispositivos Point
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Configura tus lectores para recibir órdenes desde la App.</p>
                                </div>
                                <button 
                                    onClick={handleSearchTerminals}
                                    disabled={searching || !config.accessToken || unsavedChanges}
                                    className="text-[#009EE3] border border-[#009EE3] px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                                >
                                    {searching ? <Loader2 className="animate-spin" size={14}/> : <Search size={14}/>}
                                    Buscar Mis Terminales
                                </button>
                            </div>

                            {terminals.length > 0 ? (
                                <div className="grid gap-4">
                                    {terminals.map((dev) => (
                                        <div key={dev.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-blue-100 text-[#009EE3] rounded-full flex items-center justify-center">
                                                    <Smartphone size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{dev.name}</h4>
                                                    <p className="text-[10px] text-slate-500 font-mono">ID: {dev.id}</p>
                                                    <p className="text-[10px] text-slate-400">Modelo: {dev.model || 'Genérico'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                                <button 
                                                    onClick={() => handleConfigurePoint(dev.id, 'PDV')}
                                                    disabled={configuring === dev.id}
                                                    className="flex-1 md:flex-none bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                                                    title="El Point esperará órdenes del sistema"
                                                >
                                                    {configuring === dev.id ? <Loader2 className="animate-spin" size={12}/> : <Plug size={12}/>}
                                                    Vincular (PDV)
                                                </button>
                                                <button 
                                                    onClick={() => handleConfigurePoint(dev.id, 'STANDALONE')}
                                                    disabled={configuring === dev.id}
                                                    className="flex-1 md:flex-none bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center gap-2"
                                                    title="El Point funcionará independiente"
                                                >
                                                    <Power size={12}/>
                                                    Soltar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                                    <Smartphone className="mx-auto mb-2 opacity-50" size={32}/>
                                    <p className="text-sm">No hay terminales listados.</p>
                                    <p className="text-xs">Presiona "Buscar" para traer tus dispositivos desde Mercado Pago.</p>
                                </div>
                            )}
                        </section>

                        {/* 3. GESTIÓN DE CAJAS VIRTUALES (QR) */}
                        <section className="bg-white rounded-xl p-6 border border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <Store size={20} className="text-slate-400"/> Cajas Virtuales (QR)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                                <input type="text" placeholder="ID de la Caja (External ID)" value={newCaja.id} onChange={e => setNewCaja({...newCaja, id: e.target.value})} className="px-4 py-2 bg-slate-50 border rounded-lg text-sm" />
                                <input type="text" placeholder="Nombre (Ej: Reparto 1)" value={newCaja.nombre} onChange={e => setNewCaja({...newCaja, nombre: e.target.value})} className="px-4 py-2 bg-slate-50 border rounded-lg text-sm" />
                                <button onClick={handleAddCaja} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2">
                                    <Plus size={14}/> Agregar Caja
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {cajasQR.map(c => (
                                    <div key={c.id} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                                        <span className="text-[11px] font-bold text-slate-700">{c.nombre} <span className="text-slate-400 font-mono">({c.id})</span></span>
                                        <button onClick={() => handleRemoveCaja(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                                    </div>
                                ))}
                                {cajasQR.length === 0 && <p className="text-xs text-slate-400 italic">No hay cajas definidas aún.</p>}
                            </div>
                        </section>

                        {/* 4. ASIGNACIÓN A USUARIOS */}
                        <section className="bg-indigo-50/50 rounded-xl p-6 border border-indigo-100">
                             <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <User size={20} className="text-indigo-500"/> Asignación de Dispositivos por Usuario
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Vincula una Caja QR y un Point a cada vendedor/repartidor.</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-indigo-100">
                                            <th className="py-3 px-2">Vendedor</th>
                                            <th className="py-3 px-2">Caja (QR)</th>
                                            <th className="py-3 px-2">Terminal (Point)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-indigo-50">
                                        {vendedores.map(v => (
                                            <tr key={v.id} className="group">
                                                <td className="py-4 px-2">
                                                    <div className="font-bold text-slate-700">{v.nombreCompleto}</div>
                                                    <div className="text-[10px] text-slate-400 uppercase font-black">{v.rango}</div>
                                                </td>
                                                <td className="py-4 px-2">
                                                    <select 
                                                        value={v.mpCajaId || ''} 
                                                        onChange={(e) => handleAssignDevice(v.id, 'mpCajaId', e.target.value)}
                                                        disabled={savingUser === v.id}
                                                        className="w-full max-w-[180px] py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                                    >
                                                        <option value="">Sin Asignar</option>
                                                        {cajasQR.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                                    </select>
                                                </td>
                                                <td className="py-4 px-2">
                                                    <select 
                                                        value={v.mpDeviceId || ''} 
                                                        onChange={(e) => handleAssignDevice(v.id, 'mpDeviceId', e.target.value)}
                                                        disabled={savingUser === v.id}
                                                        className="w-full max-w-[180px] py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                                    >
                                                        <option value="">Sin Asignar</option>
                                                        {terminals.map(t => <option key={t.id} value={t.id}>{t.name} ({t.id.substring(0,4)})</option>)}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                    </div>
                </div>
            </div>

            <TutorialModalMP isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
        </div>
    );
};

export default IntegrationsPageMP;