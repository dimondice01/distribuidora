// src/App.jsx
import { useState, useEffect } from 'react';
// 1. Importamos el Router
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; 
import { auth } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'react-toastify'; // Importamos toast para usarlo en los eventos

// Componentes
import LoginScreen from './components/LoginScreen.jsx';
import Dashboard from './components/Dashboard.jsx';
import CatalogoPublico from './components/CatalogoPublico.jsx'; 
import RedirectToApp from './components/RedirectToApp.jsx'; 

// Librería de Notificaciones
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 1. LÓGICA DE AUTENTICACIÓN ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        {/* Spinner o Loader simple */}
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-slate-500 animate-pulse">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  // Componente para proteger rutas privadas
  const RequireAuth = ({ children }) => {
    return user ? children : <Navigate to="/login" />;
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
        <Routes>
          
          {/* --- RUTA PÚBLICA (Catálogo) --- */}
          <Route path="/catalogo/:lista?" element={<CatalogoPublico />} />

          {/* ✅ RUTA PUENTE PARA WHATSAPP */}
          <Route path="/abrir-pedido" element={<RedirectToApp />} />

          {/* --- RUTA DE LOGIN --- */}
          <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/" />} />

          {/* --- RUTA PRIVADA (Dashboard) --- */}
          <Route 
            path="/" 
            element={
              <RequireAuth>
                <Dashboard user={user} />
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

export default App;