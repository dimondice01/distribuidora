import { useState } from 'react';
import { auth } from '../firebase.js';
import Products from './Products.jsx';
import Categories from './Categories.jsx';
import Vendedores from './Vendedores.jsx';
import Facturacion from './Facturacion.jsx';
import Clientes from './Clientes.jsx';
import Gastos from "./Gastos.jsx";
import Rutas from './Rutas.jsx';
import ReporteVendedor from './ReporteVendedor.jsx';
import ReporteGeneral from "./ReporteGeneral.jsx"
import Zonas from './Zonas.jsx';
import Promotions from './Promotions.jsx'; // <-- 1. IMPORTAMOS EL NUEVO COMPONENTE
import Caja from './Caja.jsx';

function Dashboard({ user }) {
  // <-- 2. AÑADIMOS LA NUEVA PESTAÑA A LA LISTA
  const tabs = ['Productos', 'Categorías', 'Vendedores', 'Facturación', "Caja Diaria" , 'Promociones', "Gastos" ,"Reporte General", 'Reporte Vendedor','Rutas', 'Zonas', 'Clientes']; 
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Productos':
        return <Products />;
      case 'Categorías':
        return <Categories />;
      case 'Caja Diaria':
        return <Caja />;
      case 'Vendedores':
        return <Vendedores />;
      case 'Facturación':
        return <Facturacion />;
      // <-- 3. AÑADIMOS EL CASO PARA RENDERIZAR PROMOCIONES
      case 'Promociones':
        return <Promotions />;
      case "Gastos":
            return <Gastos />;
      case 'Reporte Vendedor':
        return <ReporteVendedor />;
      case "Reporte General":
            return <ReporteGeneral/>;
      case 'Clientes':
        return <Clientes />;
      case 'Zonas':
        return <Zonas />;
      case 'Rutas':
        return <Rutas />;
      default:
        return <Products />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      {/* ...el resto de tu JSX no necesita cambios... */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
              <p className="text-indigo-200">Bienvenido, {user.displayName || user.email}</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="flex items-center px-4 py-2 font-semibold text-indigo-600 bg-white rounded-lg shadow-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600 transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;