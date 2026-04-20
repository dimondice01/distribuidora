import React, { useState } from 'react';
import { auth, db, firebaseConfig } from '../../../firebase.js';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import SeedService from '../../../services/SeedService.js';

// --- ICONOGRAFÍA ---
const Icon = ({ d, className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const RocketIcon = () => <Icon d="M15.59 6.79a6.008 6.008 0 00-8.58 0V10.33L1.58 17.1a.75.75 0 00.91 1.09l4.52-1.39a.75.75 0 01.45 0l2.35.73a.75.75 0 00.45 0l2.35-.73a.75.75 0 01.45 0l4.52 1.39a.75.75 0 00.91-1.09l-5.43-6.77V6.79zM18 6.75l1.25-1.25M18 17.25l1.25 1.25M6 6.75L4.75 5.5M6 17.25L4.75 18.5" />;
const BuildingIcon = () => <Icon d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-3h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />;
const UserIcon = () => <Icon d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A1.5 1.5 0 0118 21.75H6.001c-.621 0-1.125-.504-1.125-1.125a1.5 1.5 0 01.624-1.507z" />;
const LockIcon = () => <Icon d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />;
const CheckIcon = () => <Icon d="M4.5 12.75l6 6 9-13.5" />;

const SuperAdminPage = () => {
    const [formData, setFormData] = useState({
        companyName: '',
        adminEmail: '',
        adminPassword: '',
        modules: []
    });
    const [loading, setLoading] = useState(false);
    const [currentUserInfo, setCurrentUserInfo] = useState(null);
    const [isInitialized, setIsInitialized] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    // --- VERIFICAR AUTORIZACIÓN Y ESTADO INICIAL ---
    React.useEffect(() => {
        const checkAuth = async () => {
            const user = auth.currentUser;
            if (user) {
                try {
                    // 1. Verificar si el sistema ya fue inicializado
                    const configSnap = await getDoc(doc(db, 'config', 'access_control'));
                    const initialized = configSnap.exists();
                    setIsInitialized(initialized);

                    // 2. Verificar datos del usuario actual
                    const userSnap = await getDoc(doc(db, 'users', user.uid));
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        setCurrentUserInfo(data);
                        setIsAuthorized(data.role === 'superadmin' || !initialized);
                    } else if (!initialized) {
                        // Modo Bootstrap: Si no hay config, permitimos acceso temporal
                        setIsAuthorized(true);
                    }
                } catch (e) {
                    console.error("Error validando superadmin:", e);
                    // Si falla por falta de config, asumimos que no está inicializado
                    setIsInitialized(false);
                    setIsAuthorized(true);
                }
            }
        };
        checkAuth();
    }, []);

    const handleBootstrap = async () => {
        const user = auth.currentUser;
        if (!user) return toast.error("Debes iniciar sesión primero");
        
        setLoading(true);
        try {
            // 1. Crear documento en /users
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                role: 'superadmin',
                isSuperAdmin: true,
                createdAt: serverTimestamp()
            });

            // 2. Crear marcador global de inicialización
            await setDoc(doc(db, 'config', 'access_control'), {
                initializedAt: serverTimestamp(),
                initializedBy: user.uid
            });

            toast.success("🛡️ ¡Poderes de SuperAdmin concedidos!");
            window.location.reload(); // Recargar para aplicar estados
        } catch (e) {
            console.error(e);
            toast.error("Error en el Bootstrap: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleModule = (module) => {
        setFormData(prev => ({
            ...prev,
            modules: prev.modules.includes(module) 
                ? prev.modules.filter(m => m !== module)
                : [...prev.modules, module]
        }));
    };

    const handleCreateCompany = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Inicializar APP Secundaria 
            // Esto permite crear un usuario sin cerrar la sesión de SuperAdmin actual.
            const secondaryApp = initializeApp(firebaseConfig, 'SecondaryArea');
            const secondaryAuth = getAuth(secondaryApp);

            // 2. Crear el auth del admin en la instancia secundaria
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.adminEmail, formData.adminPassword);
            const secondaryUser = userCredential.user;

            // 3. Generar ID único de compañía
            const companyRef = doc(collection(db, 'companies'));
            const companyId = companyRef.id;

            // 4. Crear el documento de la compañía (Firmado por SuperAdmin)
            await setDoc(companyRef, {
                name: formData.companyName,
                createdAt: serverTimestamp(),
                ownerId: secondaryUser.uid,
                modules: formData.modules,
                slug: formData.companyName.toLowerCase().replace(/\s+/g, '-'),
                config: {
                    themeColors: {
                        primary: '#4f46e5',
                        secondary: '#f59e0b',
                    }
                }
            });

            // 5. Crear el documento del usuario (Firmado por SuperAdmin)
            await setDoc(doc(db, 'users', secondaryUser.uid), {
                email: formData.adminEmail,
                companyId: companyId,
                role: 'admin',
                createdAt: serverTimestamp(),
                isSuperAdmin: false 
            });

            // 6. Cerrar sesión en la App Secundaria y limpiarla
            await signOut(secondaryAuth);
            // No eliminamos la app secundaria explícitamente aquí para evitar conflictos si se crea otra enseguida, 
            // pero la sesión de Auth secundaria ya está cerrada.

            toast.success("🚀 ¡Génesis exitosa! Empresa y Admin creados.");
            
            // Ya no es necesario el window.confirm porque el SuperAdmin sigue logueado
            setFormData({
                companyName: '',
                adminEmail: '',
                adminPassword: '',
                modules: []
            });

        } catch (error) {
            console.error("Error en Génesis:", error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans selection:bg-indigo-500/30">
            <div className="max-w-xl w-full">
                
                {/* Header Estilo Cyber/Tech */}
                <div className="mb-10 text-center relative">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-indigo-500/20 blur-[100px] rounded-full"></div>
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-black tracking-widest uppercase mb-4 animate-pulse">
                        <RocketIcon className="w-4 h-4" /> Módulo Génesis v1.0
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-4">
                        ALTA DE <span className="text-indigo-500">CLIENTES</span>
                    </h1>
                    <p className="text-slate-400 font-medium">Configuración de instancia Multi-Tenant para nuevas empresas.</p>
                    
                    {/* Badge de Estado de Sesión */}
                    <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl">
                        <div className={`w-2 h-2 rounded-full ${isAuthorized ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">
                            {isAuthorized 
                                ? `AUTORIZADO: ${currentUserInfo?.email || 'SuperAdmin'}` 
                                : auth.currentUser 
                                    ? `DENEGADO: Rol '${currentUserInfo?.role || 'sin rol'}' no es SuperAdmin`
                                    : 'ERROR: No has iniciado sesión'
                            }
                        </span>
                    </div>

                    {/* Alerta de Bootstrap */}
                    {!isInitialized && auth.currentUser && (
                        <div className="mt-8 p-6 bg-indigo-500/10 border border-indigo-500/30 rounded-3xl animate-fade-in">
                            <h4 className="text-white font-bold mb-2 flex items-center gap-2">🛡️ Modo Bootstrap Activo</h4>
                            <p className="text-slate-400 text-sm mb-4">No se ha detectado un SuperAdmin en el sistema. Puedes convertir tu cuenta actual en la cuenta maestra.</p>
                            <button 
                                onClick={handleBootstrap}
                                disabled={loading}
                                className="px-6 py-3 bg-indigo-500 text-white font-bold rounded-2xl hover:bg-indigo-400 transition-all text-xs uppercase"
                            >
                                {loading ? 'Procesando...' : 'Convertirme en SuperAdmin'}
                            </button>
                        </div>
                    )}
                </div>

                <form onSubmit={handleCreateCompany} className="space-y-6">
                    
                    {/* Sección Empresa */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-slate-800 opacity-20 group-hover:opacity-40 transition-opacity">
                            <BuildingIcon className="w-24 h-24" />
                        </div>
                        
                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                           <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div> Perfil de Empresa
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 pl-1">Nombre Comercial</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Distribuidora Central"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none ring-offset-2 ring-offset-slate-950 focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-700"
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 pl-1">Módulos Activos</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {['distribucion', 'matafuegos'].map((mod) => (
                                        <button
                                            key={mod}
                                            type="button"
                                            onClick={() => toggleModule(mod)}
                                            className={`
                                                flex items-center justify-between p-4 rounded-2xl border-2 transition-all font-black text-sm uppercase
                                                ${formData.modules.includes(mod) 
                                                    ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.2)]' 
                                                    : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700'}
                                            `}
                                        >
                                            {mod}
                                            {formData.modules.includes(mod) && <CheckIcon className="w-5 h-5 text-indigo-400"/>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sección Admin */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-slate-800 opacity-20 group-hover:opacity-40 transition-opacity">
                            <UserIcon className="w-24 h-24" />
                        </div>

                        <h3 className="text-white font-bold mb-6 flex items-center gap-2">
                           <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div> Acceso Administrador
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 pl-1">Email Principal</label>
                                <input 
                                    type="email" 
                                    placeholder="admin@empresa.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-700"
                                    value={formData.adminEmail}
                                    onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 pl-1">Password Temporal</label>
                                <input 
                                    type="password" 
                                    placeholder="••••••••"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-700"
                                    value={formData.adminPassword}
                                    onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={loading || !isAuthorized}
                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-3xl shadow-2xl shadow-indigo-500/40 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <RocketIcon className="w-6 h-6" /> 
                                {!isAuthorized ? 'ACCESO RESTRINGIDO' : 'INICIALIZAR INSTANCIA'}
                            </>
                        )}
                    </button>

                </form>

                <p className="mt-8 text-center text-slate-600 text-xs font-bold uppercase tracking-[0.2em]">
                    Noar ERP Industrial System • 2024
                </p>
            </div>
        </div>
    );
};

export default SuperAdminPage;
