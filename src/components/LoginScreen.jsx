import { useState } from 'react';
import { signInWithEmailAndPassword, getAuth } from 'firebase/auth';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// --- LOGO NOAR ERP (Versión para Fondo Blanco) ---
const NoarLogoLogin = () => (
  <div className="flex flex-col items-center gap-4 mb-8">
      {/* Icono con Sombra Suave */}
      <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/30 transform transition-transform hover:scale-105 duration-500">
          <span className="text-amber-400 font-black text-4xl">N</span>
      </div>
      {/* Texto Corporativo */}
      <div className="flex flex-col items-center leading-none">
          <span className="text-3xl font-black tracking-tighter text-slate-900">
              NOAR <span className="text-amber-600 font-light tracking-widest text-2xl">ERP</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400 mt-1.5">
              SISTEMA INTEGRAL
          </span>
      </div>
  </div>
);

function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Por favor, completa todos los campos.');
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, "vendedores"), where("username", "==", username.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Usuario no encontrado o inactivo.');
        setLoading(false);
        return;
      }

      const vendedorData = querySnapshot.docs[0].data();
      const userEmail = vendedorData.email;
      
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, userEmail, password);
      // El onAuthStateChanged en App.jsx manejará la redirección

    } catch (err) {
      console.error("Error de autenticación:", err.code);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('La contraseña ingresada es incorrecta.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Espere unos minutos.');
      } else {
        setError('No se pudo iniciar sesión. Intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 font-sans">
      <div className="w-full max-w-md p-10 bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-100 transform transition-all animate-fade-in">
        
        {/* --- LOGO & BIENVENIDA --- */}
        <div className="text-center">
            <NoarLogoLogin />
            <h2 className="text-2xl font-bold text-slate-800 mt-6">
               Bienvenido de nuevo
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">
               Ingrese sus credenciales para acceder al panel.
            </p>
        </div>

        {/* --- FORMULARIO --- */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Usuario</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                placeholder="Ej: administrador"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 text-sm text-center font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl animate-pulse">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-slate-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              {loading ? (
                  <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Validando...
                  </span>
              ) : 'Acceder al Sistema'}
            </button>
          </div>
        </form>
        
        {/* Footer discreto */}
        <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">© 2025 Noar ERP Systems</p>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;