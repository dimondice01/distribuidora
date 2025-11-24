// src/App.jsx
import { useState, useEffect } from 'react';
// 1. Importamos el Router
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; 
import { auth } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

// Componentes
import LoginScreen from './components/LoginScreen.jsx';
import Dashboard from './components/Dashboard.jsx';
import CatalogoPublico from './components/CatalogoPublico.jsx'; 
import RedirectToApp from './components/RedirectToApp.jsx'; // ✅ IMPORTAMOS EL COMPONENTE PUENTE

// Librería de Notificaciones
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl text-gray-500 animate-pulse">Cargando sistema...</p>
      </div>
    );
  }

  // Componente para proteger rutas privadas
  const RequireAuth = ({ children }) => {
    return user ? children : <Navigate to="/login" />;
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
        <Routes>
          
          {/* --- RUTA PÚBLICA (Catálogo) --- */}
          {/* El ":lista?" permite que funcione con "/catalogo", "/catalogo/Mayorista", etc. */}
          <Route path="/catalogo/:lista?" element={<CatalogoPublico />} />

          {/* ✅ NUEVA RUTA PUENTE PARA WHATSAPP */}
          <Route path="/abrir-pedido" element={<RedirectToApp />} />

          {/* --- RUTA DE LOGIN --- */}
          {/* Si ya está logueado, lo manda directo al dashboard */}
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

          {/* Cualquier otra ruta desconocida redirige al inicio */}
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