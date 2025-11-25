import React, { useState } from 'react';
import { auth } from '../firebase.js';

// --- IMPORTACIÓN DE COMPONENTES ---
import Products from './Products.jsx';
import Categories from './Categories.jsx';
import Vendedores from './Vendedores.jsx';
import Facturacion from './Facturacion.jsx';
import Clientes from './Clientes.jsx';
import Gastos from "./Gastos.jsx";
import Rutas from './Rutas.jsx';
import Rubros from './Rubros.jsx';
import ReporteVendedor from './ReporteVendedor.jsx';
import ReporteGeneral from "./ReporteGeneral.jsx";
import Zonas from './Zonas.jsx';
import Promotions from './Promotions.jsx'; 
import Caja from './Caja.jsx';
import ClienteDetalle from './ClienteDetalle.jsx'; 

// --- ESTILOS GLOBALES PARA OCULTAR SCROLLBAR ---
const scrollbarStyles = `
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
`;

// --- ICONOS (Heroicons Mini & Outline) ---
const Icono = ({ path, d2 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
  </svg>
);

const icons = {
  productos: <Icono path="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />,
  categorias: <Icono path="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.703.542A9.003 9.003 0 0021 11.751V7.5a2.25 2.25 0 00-2.25-2.25h-4.318a2.25 2.25 0 01-1.591-.659L9.568 3z" />,
  rubros: <Icono path="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />,
  promociones: <Icono path="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />,
  clientes: <Icono path="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-4.5-5.25A3.75 3.75 0 0013.5 9.75V11.5m0 0v2.25m0-2.25a3.75 3.75 0 003.75-3.75V9.75A3.75 3.75 0 0013.5 6v1.5m-6 9.75a9.094 9.094 0 013.741-.479 3 3 0 01-4.682-2.72M6 18.72V13.5m0 5.22A3.75 3.75 0 016 9.75V11.5m0 0v2.25m0-2.25a3.75 3.75 0 013.75-3.75V9.75A3.75 3.75 0 016 6v1.5m6 3.75a3.75 3.75 0 00-3.75-3.75V9.75a3.75 3.75 0 003.75 3.75v1.5m0 0v2.25m0-2.25a3.75 3.75 0 003.75-3.75V9.75a3.75 3.75 0 00-3.75 3.75z" />,
  vendedores: <Icono path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A1.5 1.5 0 0118 21.75H6.001c-.621 0-1.125-.504-1.125-1.125a1.5 1.5 0 01.624-1.507z" />,
  zonas: <Icono path="M9 6.75V15m0 0v2.25m0-2.25a3 3 0 110-6 3 3 0 010 6zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  facturacion: <Icono path="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />,
  caja: <Icono path="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.75A.75.75 0 013 4.5h.75m12 0v.75A.75.75 0 0015 6h.75m0 0v-.75A.75.75 0 0015 4.5h-.75M5.25 12a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM5.25 15a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM12 12a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM12 15a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM7.5 18.75a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM14.25 18.75a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM18.75 18.75a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM3.75 18.75a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75z" />,
  rutas: <Icono path="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" d2="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />,
  gastos: <Icono path="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h6m-6 2.25h6M12 9.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75M4.5 19.5h15c.621 0 1.125-.504 1.125-1.125V8.25c0-.621-.504-1.125-1.125-1.125h-15c-.621 0-1.125.504-1.125 1.125v10.125c0 .621.504 1.125 1.125 1.125z" />,
  reporteG: <Icono path="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" d2="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />,
  reporteV: <Icono path="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m1-3l1 3m0 0l-1 3m1-3l1 3M6.75 12h.008v.008H6.75V12zm3.75 0h.008v.008H10.5V12zm3.75 0h.008v.008H14.25V12z" />,
  logout: <Icono path="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />,
  // --- CONTROLES UI ---
  collapse: <Icono path="M15.75 19.5L8.25 12l7.5-7.5" />,
  expand: <Icono path="M8.25 4.5l7.5 7.5-7.5 7.5" />,
};

const navSections = [
  {
    title: 'Gestión Comercial',
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
    title: 'Logística y Finanzas',
    items: [
      { name: 'Facturación', icon: icons.facturacion },
      { name: 'Rutas', icon: icons.rutas },
      { name: 'Caja Diaria', icon: icons.caja },
      { name: 'Gastos', icon: icons.gastos },
      { name: 'Reporte General', icon: icons.reporteG },
      { name: 'Reporte Vendedor', icon: icons.reporteV },
    ]
  }
];

// --- COMPONENTE ITEM DE NAVEGACIÓN ---
function NavItem({ item, activeTab, setActiveTab, isSidebarOpen }) {
  const isActive = (activeTab === item.name || (activeTab === 'ClienteDetalle' && item.name === 'Clientes'));
  
  return (
    <button
      onClick={() => setActiveTab(item.name)}
      title={!isSidebarOpen ? item.name : ''}
      className={`
        relative flex items-center w-full py-3 my-1 rounded-xl text-sm font-medium transition-all duration-200 ease-out group overflow-hidden
        ${isActive ? 'text-white shadow-md shadow-indigo-900/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}
        ${isSidebarOpen ? 'px-4 mx-3 w-[90%]' : 'px-0 justify-center mx-auto w-10 h-10'}
      `}
    >
      {/* Fondo Activo con Gradiente Intenso */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl"></div>
      )}

      {/* Icono */}
      <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-110'}`}>
        {item.icon}
      </span>

      {/* Texto */}
      <span className={`
        relative z-10 ml-3 whitespace-nowrap transition-all duration-300 origin-left
        ${isSidebarOpen ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}
      `}>
        {item.name}
      </span>
      
      {/* Indicador Neon cuando colapsado */}
      {!isSidebarOpen && isActive && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-400 rounded-l-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
      )}
    </button>
  );
}

// --- LAYOUT PRINCIPAL ---
function Dashboard({ user }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(navSections[0].items[0].name);
  const [selectedClientId, setSelectedClientId] = useState(null);

  const handleLogout = async () => {
    try { await auth.signOut(); } catch (error) { console.error("Error logout:", error); }
  };

  const handleViewClientDetail = (clientId) => { setSelectedClientId(clientId); setActiveTab('ClienteDetalle'); };
  const handleBackToTabs = () => { setSelectedClientId(null); setActiveTab('Clientes'); };

  const getActiveTitle = () => {
    if (activeTab === 'ClienteDetalle') return 'Detalle del Cliente';
    for (const section of navSections) {
      const item = section.items.find(i => i.name === activeTab);
      if (item) return item.name;
    }
    return 'Dashboard';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Productos': return <Products />;
      case 'Categorías': return <Categories />;
      case 'Vendedores': return <Vendedores />;
      case 'Facturación': return <Facturacion />;
      case 'Reporte Vendedor': return <ReporteVendedor />;
      case 'Reporte General': return <ReporteGeneral />;
      case 'Rutas': return <Rutas />;
      case 'Zonas': return <Zonas />;
      case 'Clientes': return <Clientes onViewDetail={handleViewClientDetail} />; 
      case 'Promociones': return <Promotions />;
      case 'Caja Diaria': return <Caja />;
      case 'Gastos': return <Gastos />;
      case "Rubros": return <Rubros />;
      case 'ClienteDetalle': return <ClienteDetalle clienteId={selectedClientId} onBack={handleBackToTabs} />;
      default: return <Products />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden selection:bg-indigo-500 selection:text-white">
      <style>{scrollbarStyles}</style>
      
      {/* SIDEBAR (OSCURO & CONTRASTADO) */}
      <aside className={`
          bg-[#0f172a] text-white flex flex-col shadow-2xl z-30 
          transition-all duration-500 cubic-bezier(0.25, 0.8, 0.25, 1) border-r border-slate-800
          ${isSidebarOpen ? 'w-64' : 'w-20'} 
      `}>
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-between px-5 bg-[#0f172a] border-b border-slate-800">
          {isSidebarOpen && (
            <div className="flex flex-col animate-fade-in">
                <span className="text-xl font-extrabold tracking-tight text-white">Distribuidora</span>
                <span className="text-[10px] text-indigo-400 font-bold tracking-[0.25em] uppercase mt-0.5 opacity-80">ERP System</span>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all ${isSidebarOpen ? 'ml-auto' : 'mx-auto'}`}>
            {isSidebarOpen ? icons.collapse : icons.expand}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto py-6 no-scrollbar space-y-8">
          {navSections.map((section, idx) => (
            <div key={section.title}>
              {isSidebarOpen && (
                <h3 className="px-6 mb-3 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
                  {section.title}
                </h3>
              )}
              {!isSidebarOpen && idx > 0 && <div className="h-px bg-slate-800 mx-4 my-4"></div>}
              
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItem key={item.name} item={item} activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
            <div className={`flex items-center ${isSidebarOpen ? 'gap-3' : 'justify-center'}`}>
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg ring-2 ring-slate-700">
                    <span className="font-bold text-xs">{user?.email?.[0].toUpperCase() || 'U'}</span>
                </div>
                
                {isSidebarOpen && (
                    <div className="flex-1 min-w-0 animate-fade-in">
                        <p className="text-sm font-bold text-white truncate">Administrador</p>
                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>
                )}
            </div>
        </div>
      </aside>

      {/* MAIN AREA (CLARO & LIMPIO) */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 relative">
        
        {/* Header Glassmorphism */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
             <h2 className="text-2xl font-bold text-slate-800 tracking-tight drop-shadow-sm">{getActiveTitle()}</h2>
          </div>
          
          <button onClick={handleLogout} className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all border border-slate-200 hover:border-red-200 bg-white shadow-sm">
            <span className="group-hover:rotate-180 transition-transform duration-500">{icons.logout}</span>
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 relative no-scrollbar scroll-smooth">
            <div className="max-w-[1920px] mx-auto animate-fade-in-up pb-10">
                {renderContent()}
            </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;