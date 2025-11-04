import { useState } from 'react'; // Importamos useState
import { auth } from '../firebase.js';

// Componentes
import Products from './Products.jsx';
import Categories from './Categories.jsx';
// ... (todos tus otros imports de componentes)
import Vendedores from './Vendedores.jsx';
import Facturacion from './Facturacion.jsx';
import Clientes from './Clientes.jsx';
import Gastos from "./Gastos.jsx";
import Rutas from './Rutas.jsx';
import Rubros from './Rubros.jsx';
import ReporteVendedor from './ReporteVendedor.jsx';
import ReporteGeneral from "./ReporteGeneral.jsx"
import Zonas from './Zonas.jsx';
import Promotions from './Promotions.jsx'; 
import Caja from './Caja.jsx';
import ClienteDetalle from './ClienteDetalle.jsx'; 

// --- Iconos de Heroicons (SVG) ---
const Icono = ({ path }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const icons = {
  // ... (todos tus iconos anteriores)
  productos: <Icono path="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />,
  categorias: <Icono path="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.703.542A9.003 9.003 0 0021 11.751V7.5a2.25 2.25 0 00-2.25-2.25h-4.318a2.25 2.25 0 01-1.591-.659L9.568 3z" />,
  rubros: <Icono path="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />,
  promociones: <Icono path="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />,
  clientes: <Icono path="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-4.5-5.25A3.75 3.75 0 0013.5 9.75V11.5m0 0v2.25m0-2.25a3.75 3.75 0 003.75-3.75V9.75A3.75 3.75 0 0013.5 6v1.5m-6 9.75a9.094 9.094 0 013.741-.479 3 3 0 01-4.682-2.72M6 18.72V13.5m0 5.22A3.75 3.75 0 016 9.75V11.5m0 0v2.25m0-2.25a3.75 3.75 0 013.75-3.75V9.75A3.75 3.75 0 016 6v1.5m6 3.75a3.75 3.75 0 00-3.75-3.75V9.75a3.75 3.75 0 003.75 3.75v1.5m0 0v2.25m0-2.25a3.75 3.75 0 003.75-3.75V9.75a3.75 3.75 0 00-3.75 3.75z" />,
  vendedores: <Icono path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A1.5 1.5 0 0118 21.75H6.001c-.621 0-1.125-.504-1.125-1.125a1.5 1.5 0 01.624-1.507z" />,
  zonas: <Icono path="M9 6.75V15m0 0v2.25m0-2.25a3 3 0 110-6 3 3 0 010 6zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  facturacion: <Icono path="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />,
  caja: <Icono path="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.75A.75.75 0 013 4.5h.75m12 0v.75A.75.75 0 0015 6h.75m0 0v-.75A.75.75 0 0015 4.5h-.75M5.25 12a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM5.25 15a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM12 12a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM12 15a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM7.5 18.75a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM14.25 18.75a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM18.75 18.75a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM3.75 18.75a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75z" />,
  rutas: <Icono path="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" d2="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />,
  gastos: <Icono path="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h6m-6 2.25h6M12 9.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75M4.5 19.5h15c.621 0 1.125-.504 1.125-1.125V8.25c0-.621-.504-1.125-1.125-1.125h-15c-.621 0-1.125.504-1.125 1.125v10.125c0 .621.504 1.125 1.125 1.125z" />,
  reporteG: <Icono path="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" d2="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />,
  reporteV: <Icono path="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m1-3l1 3m0 0l-1 3m1-3l1 3M6.75 12h.008v.008H6.75V12zm3.75 0h.008v.008H10.5V12zm3.75 0h.008v.008H14.25V12z" />,
  logout: <Icono path="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />,
  // --- NUEVOS ICONOS ---
  collapse: <Icono path="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15l-7.5-7.5 7.5-7.5" />,
  expand: <Icono path="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />,
};

// --- Estructura de Navegación (sin cambios) ---
const navSections = [
  {
    title: 'Gestión',
    items: [
      { name: 'Productos', icon: icons.productos },
      { name: 'Categorías', icon: icons.categorias },
      { name: 'Rubros', icon: icons.rubros },
      { name: 'Promociones', icon: icons.promociones },
      { name: 'Clientes', icon: icons.clientes },
      { name: 'Vendedores', icon: icons.vendedores },
      { name: 'Zonas', icon: icons.zonas },
    ]
  },
  {
    title: 'Operaciones y Reportes',
    items: [
      { name: 'Facturación', icon: icons.facturacion },
      { name: 'Caja Diaria', icon: icons.caja },
      { name: 'Rutas', icon: icons.rutas },
      { name: 'Gastos', icon: icons.gastos },
      { name: 'Reporte General', icon: icons.reporteG },
      { name: 'Reporte Vendedor', icon: icons.reporteV },
    ]
  }
];

// --- Componente de Botón de Navegación (Actualizado) ---
// Ahora recibe `isSidebarOpen`
function NavItem({ item, activeTab, setActiveTab, isSidebarOpen }) {
  const isActive = (activeTab === item.name || (activeTab === 'ClienteDetalle' && item.name === 'Clientes'));
  
  return (
    <button
      key={item.name}
      onClick={() => setActiveTab(item.name)}
      // ¡Tooltip! Para cuando está colapsado
      title={item.name} 
      className={`
        flex items-center w-full py-3 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out
        group
        ${
          isActive
            ? 'bg-red-800 text-white shadow-inner' // Estilo "Vino" Activo
            : 'text-gray-300 hover:bg-slate-700 hover:text-white' // Estilo Inactivo
        }
        ${
          // Lógica de colapso:
          isSidebarOpen
            ? 'px-4' // Padding normal
            : 'px-2 justify-center' // Padding reducido y centrado
        }
      `}
    >
      {/* Icono */}
      <span className={`transition-all ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'} ${isSidebarOpen ? 'mr-3' : 'mr-0'}`}>
        {item.icon}
      </span>

      {/* Texto (Solo visible si está abierto) */}
      {isSidebarOpen && (
        <span className="flex-1 text-left whitespace-nowrap">
          {item.name}
        </span>
      )}
    </button>
  );
}


// --- Componente Principal del Dashboard (Actualizado) ---
function Dashboard({ user }) {
  
  // --- NUEVO ESTADO ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [activeTab, setActiveTab] = useState(navSections[0].items[0].name); // 'Productos'
  const [selectedClientId, setSelectedClientId] = useState(null);

  // ... (handleLogout, handleViewClientDetail, handleBackToTabs, getActiveTitle sin cambios) ...
  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleViewClientDetail = (clientId) => {
    setSelectedClientId(clientId);
    setActiveTab('ClienteDetalle');
  };

  const handleBackToTabs = () => {
    setSelectedClientId(null);
    setActiveTab('Clientes');
  };

  const getActiveTitle = () => {
    if (activeTab === 'ClienteDetalle') {
      return 'Detalle del Cliente';
    }
    for (const section of navSections) {
      const item = section.items.find(i => i.name === activeTab);
      if (item) return item.name;
    }
    return 'Dashboard';
  };


  // ... (renderContent sin cambios) ...
  const renderContent = () => {
    switch (activeTab) {
      case 'Productos':
        return <Products />;
      case 'Categorías':
        return <Categories />;
      case 'Vendedores':
        return <Vendedores />;
      case 'Facturación':
        return <Facturacion />;
      case 'Reporte Vendedor':
        return <ReporteVendedor />;
      case 'Reporte General':
          return <ReporteGeneral />
      case 'Rutas':
        return <Rutas />;
      case 'Zonas':
        return <Zonas />;
      case 'Clientes':
        return <Clientes onViewDetail={handleViewClientDetail} />; 
      case 'Promociones':
          return <Promotions />
      case 'Caja Diaria':
        return <Caja />
      case 'Gastos':
        return <Gastos />
      case "Rubros":
        return <Rubros />
      case 'ClienteDetalle':
        return (
          <ClienteDetalle
            clienteId={selectedClientId}
            onBack={handleBackToTabs}
          />
        );
      default:
        return <Products />;
    }
  };


  // --- ESTRUCTURA DE RENDERIZADO (Actualizada) ---
  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      
      {/* --- Sidebar (Actualizado con lógica de colapso) --- */}
      <aside className={`
          bg-slate-900 text-gray-300 flex flex-col shadow-lg
          transition-all duration-300 ease-in-out 
          ${isSidebarOpen ? 'w-64' : 'w-20'}
      `}>
        
        {/* Logo/Título y Botón de Toggle */}
        <div className="flex items-center h-20 px-4 shadow-md bg-slate-900">
          {/* Título (visible si está abierto) */}
          {isSidebarOpen && (
            <h1 className="text-2xl font-bold text-white whitespace-nowrap">Distribuidora</h1>
          )}
          
          {/* Botón de Toggle (tu idea!) */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`
              p-2 text-gray-400 rounded-lg hover:bg-slate-700 hover:text-white transition-colors
              ${isSidebarOpen ? 'ml-auto' : 'mx-auto'}
            `}
          >
            {isSidebarOpen ? icons.collapse : icons.expand}
          </button>
        </div>

        {/* Menú de Navegación (Actualizado) */}
        <nav className={`
            flex-1 overflow-y-auto py-6 space-y-6 
            transition-all duration-300
            ${isSidebarOpen ? 'px-4' : 'px-2'}
        `}>
          {navSections.map((section) => (
            <div key={section.title}>
              {/* Títulos de sección (se ocultan o cambian) */}
              <h3 className={`
                  mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider
                  ${isSidebarOpen ? 'px-4' : 'text-center'}
              `}>
                {isSidebarOpen ? section.title : '·'}
              </h3>
              
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItem 
                    key={item.name}
                    item={item} 
                    activeTab={activeTab} 
                    setActiveTab={setActiveTab}
                    // Pasamos el estado al componente
                    isSidebarOpen={isSidebarOpen} 
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* --- Contenedor Principal (Sin cambios) --- */}
      {/* flex-1 hace que ocupe el espacio sobrante (se agranda solo) */}
      <div className="flex-1 flex flex-col">
        
        {/* Encabezado Superior (sin cambios) */}
        <header className="bg-white text-gray-800 p-6 flex justify-between items-center shadow-sm z-10 h-20">
          <h2 className="text-2xl font-semibold">{getActiveTitle()}</h2>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg shadow-sm hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all"
          >
            <span className="mr-2">{icons.logout}</span>
            Cerrar Sesión
          </button>
        </header>

        {/* Contenido Principal (con animación) */}
        {/* Asegúrate de tener la animación en tu index.css */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 opacity-0 animate-fadeIn">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;