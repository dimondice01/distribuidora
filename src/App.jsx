// src/App.jsx
import { useEffect } from 'react';
import { auth } from './firebase.js';
// 1. Importamos el Router
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; 
import { toast } from 'react-toastify'; 

// Contextos
import { TenantProvider, useTenant } from './contexts/TenantContext.jsx';
import { ShiftProvider } from './contexts/ShiftContext.jsx';

// Componentes Principales
import LandingPage from './components/landingPage.jsx'; 
import LoginScreen from './components/LoginScreen.jsx';
import Dashboard from './components/Dashboard.jsx';
import CatalogoPublico from './components/CatalogoPublico.jsx'; 
import RedirectToApp from './components/RedirectToApp.jsx'; 

// Módulos Admin (Génesis)
import SuperAdminPage from './modules/admin/pages/SuperAdminPage.jsx';

import IntegrationsPage from './components/IntegrationsPage.jsx';   // AFIP / ARCA
import IntegrationsPageMP from './components/IntegrationsPageMP.jsx'; // MERCADO PAGO
import CompanySettings from './components/CompanySettings.jsx';     // CONFIGURACIÓN CENTRAL

// ✅ PWA PARA TÉCNICOS (Matafuegos)
import TecnicoApp from './modules/tecnico/pages/TecnicoApp.jsx';

// ✅ POS MÓVIL (Venta caliente desde el celular + ticket térmico 58mm)
import POSMovil from './modules/posmovil/POSMovil.jsx';

// Librería de Notificaciones
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function AppContent() {
  const { user, loading: authLoading, tenantId } = useTenant();

  // --- 2. LÓGICA DE DETECCIÓN OFFLINE/ONLINE (UX PREMIUM) ---
  useEffect(() => {
    const handleOffline = () => {
      toast.warn("📶 Modo Offline: Sin conexión. Puedes seguir trabajando, los datos se guardarán localmente.", {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
      });
    };

    const handleOnline = () => {
      toast.success("🌐 Conexión Restaurada: Sincronizando datos con la nube...", {
        position: "bottom-right",
        autoClose: 3000,
        theme: "colored",
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-slate-500 animate-pulse">Sintonizando frecuencia SaaS...</p>
        </div>
      </div>
    );
  }

  // Componente para proteger rutas privadas (Garantía de Seguridad SaaS)
  const RequireAuth = ({ children }) => {
    if (!user) return <Navigate to="/login" />;
    
    // Si el usuario no tiene compañía asignada (Estado penditente o error)
    if (!tenantId) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">🚫</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Acceso Denegado</h2>
                    <p className="text-slate-500 font-medium leading-relaxed mb-6">
                        Tu cuenta no tiene una suscripción de empresa activa. Contacta al administrador de NOAR ERP.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all">Reintentar</button>
                        <button onClick={() => auth.signOut()} className="px-6 py-3 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-200 hover:bg-red-100 transition-all">Cerrar Sesión</button>
                    </div>
                    <p className="mt-4 text-xs font-mono text-slate-400">UID: {user.uid}</p>
                </div>
            </div>
        );
    }

    return children;
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
        <Routes>
          
          {/* --- RUTA LANDING PAGE (INFO) --- */}
          <Route path="/informacion" element={<LandingPage />} />

          {/* --- RUTA PÚBLICA (Catálogo) --- */}
          <Route path="/catalogo/:lista?" element={<CatalogoPublico />} />

          {/* RUTA PUENTE PARA WHATSAPP */}
          <Route path="/abrir-pedido" element={<RedirectToApp />} />

          {/* --- RUTA DE LOGIN --- */}
          <Route path="/noar-genesis" element={<SuperAdminPage />} />
          <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/" />} />

          {/* --- RUTAS PRIVADAS (Requieren Login + Empresa) --- */}
          
          {/* 1. Dashboard Principal */}
          <Route 
            path="/" 
            element={
              <RequireAuth>
                <Dashboard user={user} />
              </RequireAuth>
            } 
          />

          {/* 2. ✅ INTEGRACIÓN AFIP / ARCA */}
          <Route 
            path="/integraciones" 
            element={
              <RequireAuth>
                <IntegrationsPage />
              </RequireAuth>
            } 
          />

          {/* 3. ✅ INTEGRACIÓN MERCADO PAGO */}
          <Route 
            path="/integraciones-mp" 
            element={
              <RequireAuth>
                <IntegrationsPageMP />
              </RequireAuth>
            } 
          />

          {/* 4. ✅ CONFIGURACIÓN CENTRAL DE EMPRESA */}
          <Route 
            path="/configuracion" 
            element={
              <RequireAuth>
                <CompanySettings />
              </RequireAuth>
            } 
          />

          {/* ✅ 4. RUTA MINI PWA (Técnicos) */}
          <Route path="/tecnico" element={<TecnicoApp />} />

          {/* ✅ 5. POS MÓVIL (Venta caliente desde el celular) */}
          <Route
            path="/movil"
            element={
              <RequireAuth>
                <POSMovil />
              </RequireAuth>
            }
          />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </div>

      {/* Notificaciones Globales */}
      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </BrowserRouter>
  );
}

function App() {
    return (
        <TenantProvider>
            <ShiftProvider>
                <AppContent />
            </ShiftProvider>
        </TenantProvider>
    );
}

export default App;