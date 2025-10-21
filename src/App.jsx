import { useState, useEffect } from 'react';
import { auth } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import LoginScreen from './components/LoginScreen.jsx';
import Dashboard from './components/Dashboard.jsx';

// --- PASO 1: Importar el componente y sus estilos ---
// Estas dos líneas son necesarias para que la librería funcione.
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-xl text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    // Es buena práctica envolver todo en un solo fragmento o div.
    // Usar un div aquí está bien, ya que ya lo tenías.
    <>
      <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
        {user ? <Dashboard user={user} /> : <LoginScreen />}
      </div>

      {/* --- PASO 2: Añadir el componente ToastContainer aquí --- */}
      {/* Se coloca al final, fuera del div principal si quieres, o dentro.
          Lo importante es que esté en el nivel más alto de tu app.
          Él solo se encargará de posicionarse correctamente en la pantalla. */}
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
    </>
  );
}

export default App;