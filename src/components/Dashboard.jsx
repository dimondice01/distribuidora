import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase.js';
import { doc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '../hooks/useFirestore';

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
import Proveedores from './Proveedores.jsx';
import CompraPage from './CompraPage.jsx';
import ProveedorDashboard from './ProveedorDashboard.jsx';
import POS from './POS.jsx';
import CompanySettings from './CompanySettings.jsx';
import MapaCRM from './MapaCRM.jsx';

// ✅ INTEGRACIONES (Backend Modules)
import IntegrationsPage from './IntegrationsPage.jsx';   // AFIP / ARCA
import IntegrationsPageMP from './IntegrationsPageMP.jsx'; // MERCADO PAGO

// ✅ MÓDULO MATAFUEGOS & SERVICE
import ExcelImporter from '../modules/admin/components/ExcelImporter.jsx';
import ProductImporter from '../modules/admin/components/ProductImporter.jsx';
import AssetAgenda from './AssetAgenda.jsx';
import { useTenant } from '../contexts/TenantContext.jsx';
import { useShift } from '../contexts/ShiftContext.jsx';

// --- ESTILOS GLOBALES ---
const scrollbarStyles = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .sidebar-scroll::-webkit-scrollbar { width: 5px; }
  .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
  .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.25); border-radius: 99px; }
  .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(251,191,36,0.65); }
  .sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgba(251,191,36,0.25) transparent; }
`;

// --- LOGO NOAR ERP (Versión Dinámica / White Label) ---
const NoarLogoDark = ({ companyName, customLogo }) => (
  <div className="flex items-center gap-3 select-none">
      {customLogo ? (
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0 border border-slate-700">
           <img src={customLogo} alt="Logo" className="w-full h-full object-contain" />
        </div>
      ) : (
        <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-400/20 flex-shrink-0">
            <span className="text-slate-900 font-black text-2xl">N</span>
        </div>
      )}
      
      <div className="flex flex-col leading-none overflow-hidden">
          <span className="text-xl font-black tracking-tighter text-white truncate">
              {companyName || 'NOAR ERP'}
          </span>
          <span className="text-amber-400 font-black tracking-widest text-[10px] opacity-70">ERP CLOUD</span>
      </div>
  </div>
);

// --- ICONOS ---
const Icono = ({ path, d2, className="w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
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
  caja: <Icono path="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  rutas: <Icono path="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" d2="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />,
  gastos: <Icono path="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h6m-6 2.25h6M12 9.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75M4.5 19.5h15c.621 0 1.125-.504 1.125-1.125V8.25c0-.621-.504-1.125-1.125-1.125h-15c-.621 0-1.125.504-1.125 1.125v10.125c0 .621.504 1.125 1.125 1.125z" />,
  reporteG: <Icono path="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" d2="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />,
  reporteV: <Icono path="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m1-3l1 3m0 0l-1 3m1-3l1 3M6.75 12h.008v.008H6.75V12zm3.75 0h.008v.008H10.5V12zm3.75 0h.008v.008H14.25V12z" />,
  mapaCRM:  <Icono path="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />,
  logout: <Icono path="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />,
  collapse: <Icono path="M15.75 19.5L8.25 12l7.5-7.5" />,
  expand: <Icono path="M8.25 4.5l7.5 7.5-7.5 7.5" />,
  // ✅ ICONO ARCA
  integraciones: <Icono path="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-16.5 0h13.5m-13.5 0a3 3 0 100 6h13.5a3 3 0 100-6" />,
  // ✅ NUEVO ICONO MP: Tarjeta de Crédito (Estilo Noar)
  mp: <Icono path="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
  // ✅ ICONO AGENDA
  agenda: <Icono path="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zM14.25 15h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />,
  proveedores: <Icono path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  pos: <Icono path="M13.5 21V15M10.5 21V15M3 15V3.75C3 3.33579 3.33579 3 3.75 3H20.25C20.6642 3 21 3.33579 21 3.75V15M2 15H22M4 18H20C21.1046 18 22 18.8954 22 20V21H2V20C2 18.8954 2.89543 18 4 18Z" />,
  config: <Icono path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" d2="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
};

// --- GENERACIÓN DINÁMICA DE MENÚ ---
const getNavSections = (config) => {
  const isMatafuegos = config?.modules?.includes('matafuegos');

  const sections = [
    {
      title: isMatafuegos ? 'Gestión de Servicio' : 'Operativa Diaria',
      items: [
        { name: 'Venta POS (Local)', icon: icons.pos },
        { name: 'Facturación', icon: icons.facturacion },
        isMatafuegos ? null : { name: 'Rutas',    icon: icons.rutas },
        isMatafuegos ? null : { name: 'Mapa CRM', icon: icons.mapaCRM },
        isMatafuegos ? { name: 'Agenda de Vencimientos', icon: icons.agenda } : null,
        isMatafuegos ? { name: 'Importación Masiva', icon: icons.integraciones } : { name: 'Importar Catálogo', icon: icons.integraciones },
      ].filter(Boolean)
    },
    {
      title: isMatafuegos ? 'Clientes & Activos' : 'Gestión de Inventario',
      items: [
        { name: 'Clientes', icon: icons.clientes },
        isMatafuegos ? null : { name: 'Productos', icon: icons.productos },
        isMatafuegos ? null : { name: 'Categorías', icon: icons.categorias },
        isMatafuegos ? null : { name: 'Rubros', icon: icons.rubros },
        isMatafuegos ? null : { name: 'Promociones', icon: icons.promociones },
      ].filter(Boolean)
    },
    {
      title: 'Administración',
      items: [
        { name: 'Configuración Empresa', icon: icons.config },
        { name: 'Vendedores', icon: icons.vendedores },
        { name: 'Proveedores', icon: icons.proveedores },
        { name: 'Zonas', icon: icons.zonas },
        { name: 'Gastos', icon: icons.gastos },
        { name: 'Integración ARCA', icon: icons.integraciones }, 
        { name: 'Integración MercadoPago', icon: icons.mp }, 
      ]
    },
    {
      title: 'Reportes & Métricas',
      items: [
        { name: 'Reporte General',  icon: icons.reporteG },
        { name: 'Reporte Vendedor', icon: icons.reporteV },
      ]
    }
  ];
  return sections;
};

// --- COMPONENTE ITEM DE NAVEGACIÓN ---
function NavItem({ item, activeTab, setActiveTab, isSidebarOpen }) {
  const isActive = (activeTab === item.name || (activeTab === 'ClienteDetalle' && item.name === 'Clientes'));
  
  return (
    <button
      onClick={() => setActiveTab(item.name)}
      title={!isSidebarOpen ? item.name : ''}
      className={`
        relative flex items-center w-full py-3 my-1 rounded-xl text-sm font-bold transition-all duration-200 ease-out group overflow-hidden
        ${isActive 
            // DISEÑO ACTIVO: AMARILLO (AMBER) CON TEXTO OSCURO PARA CONTRASTE INDUSTRIAL
            ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/20' 
            // DISEÑO INACTIVO: GRIS CLARO SOBRE FONDO OSCURO
            : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/50'}
        ${isSidebarOpen ? 'px-4 mx-3 w-[90%]' : 'px-0 justify-center mx-auto w-10 h-10'}
      `}
    >
      {/* Icono */}
      <span className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
        {item.icon}
      </span>

      {/* Texto */}
      <span className={`
        relative z-10 ml-3 whitespace-nowrap transition-all duration-300 origin-left
        ${isSidebarOpen ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-4 w-0 overflow-hidden'}
      `}>
        {item.name}
      </span>
      
      {/* Indicador Lateral cuando colapsado */}
      {!isSidebarOpen && isActive && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-amber-400 rounded-l-full shadow-[0_0_10px_rgba(251,191,36,0.6)]"></div>
      )}
    </button>
  );
}

// --- LAYOUT PRINCIPAL ---
function Dashboard({ user }) {
  const { tenantId, getTenantCollection } = useFirestore();
  const { companyConfig, logo: globalLogo } = useTenant(); 
  const { activeShift, openShift, hasOpenShift, closeShift } = useShift();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Facturación');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [initialCash, setInitialCash] = useState(0);
  const [selectedProvCompra, setSelectedProvCompra] = useState(null);
  const [selectedProvDashboard, setSelectedProvDashboard] = useState(null);
  const [pendingWebOrders, setPendingWebOrders] = useState([]);

  // --- ESCUCHA DE PEDIDOS WEB PENDIENTES ---
  useEffect(() => {
    if (!tenantId) return;
    const q = query(getTenantCollection('pedidos_temporales'), where('estado', '==', 'Web: Pendiente'));
    const unsub = onSnapshot(q, (snap) => {
        setPendingWebOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [tenantId]);

  // ✅ AUTO-COLLAPSE SIDEBAR EN POS Y CONFIG
  useEffect(() => {
    if (activeTab === 'Venta POS (Local)' || activeTab === 'Registrar Compra' || activeTab === 'Configuración Empresa') {
        setIsSidebarOpen(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchCompany = async () => {
        if (!tenantId) return;
        try {
            const snap = await getDoc(doc(db, 'companies', tenantId));
            if (snap.exists()) setCompanyName(snap.data().name);
        } catch (e) { console.error(e); }
    };
    fetchCompany();
  }, [tenantId]);

  const handleLogout = async () => {
    try { await auth.signOut(); } catch (error) { console.error("Error logout:", error); }
  };

  const handleViewClientDetail = (clientId) => { setSelectedClientId(clientId); setActiveTab('ClienteDetalle'); };
  const handleBackToTabs = () => { setSelectedClientId(null); setActiveTab('Clientes'); };
  const handleStartCompra = (prov) => { setSelectedProvCompra(prov); setActiveTab('Registrar Compra'); };
  const handleFinishCompra = () => { setSelectedProvCompra(null); setActiveTab('Proveedores'); };
  const handleStartDashboard = (prov) => { setSelectedProvDashboard(prov); setActiveTab('Dashboard Proveedor'); };
  const handleBackFromDashboard = () => { setSelectedProvDashboard(null); setActiveTab('Proveedores'); };

  const getActiveTitle = () => {
    if (activeTab === 'ClienteDetalle') return 'Ficha de Cliente';
    if (activeTab === 'Registrar Compra') return 'Estación de Compras';
    if (activeTab === 'Dashboard Proveedor') return 'Panel de Auditoría';
    return activeTab;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Productos': return <Products />;
      case 'Categorías': return <Categories />;
      case 'Vendedores': return <Vendedores />;
      case 'Venta POS (Local)': return <POS />;
      case 'Facturación': return <Facturacion />;
      case 'Reporte Vendedor': return <ReporteVendedor />;
      case 'Reporte General': return <ReporteGeneral />;
      case 'Rutas': return <Rutas />;
      case 'Zonas': return <Zonas />;
      case 'Clientes': return <Clientes onViewDetail={handleViewClientDetail} />; 
      case 'Promociones': return <Promotions />;
      case 'Caja Diaria': return <Caja />;
      case 'Gastos': return <Gastos />;
      case 'Rubros': return <Rubros />;
      case 'Proveedores': return <Proveedores onRegistrarCompra={handleStartCompra} onViewDashboard={handleStartDashboard} />;
      case 'Registrar Compra': return <CompraPage proveedor={selectedProvCompra} onCancel={handleFinishCompra} onSuccess={handleFinishCompra} />;
      case 'Dashboard Proveedor': return <ProveedorDashboard proveedor={selectedProvDashboard} onBack={handleBackFromDashboard} />;
      case 'ClienteDetalle': return <ClienteDetalle clienteId={selectedClientId} onBack={handleBackToTabs} />;
      
      // ✅ CONFIGURACIÓN CENTRAL
      case 'Configuración Empresa': return <CompanySettings />;

      // ✅ NEXOS DE CONFIGURACIÓN (Opcionales ahora que están integrados)
      case 'Integración ARCA': return <IntegrationsPage />;
      case 'Integración MercadoPago': return <IntegrationsPageMP />;
      
      // ✅ IMPORTADOR INTELIGENTE (DISTRIBUIDORAS)
      case 'Importar Catálogo': return <ProductImporter />;
      
      case 'Mapa CRM': return <MapaCRM onViewClient={handleViewClientDetail} />;

      // ✅ MÓDULO MATAFUEGOS
      case 'Importación Masiva': return <ExcelImporter />;
      case 'Agenda de Vencimientos': return <AssetAgenda onViewClient={handleViewClientDetail} />;
      
      default: return <Facturacion />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden selection:bg-amber-300 selection:text-slate-900">
      <style>{scrollbarStyles}</style>
      
      {/* SIDEBAR (OSCURO PROFESIONAL) */}
      <aside className={`
          bg-slate-900 text-white flex flex-col shadow-2xl z-30 
          transition-all duration-500 cubic-bezier(0.25, 0.8, 0.25, 1) border-r border-slate-800
          print:hidden
          ${isSidebarOpen ? 'w-64' : 'w-20'} 
      `}>
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-between px-5 bg-slate-950 border-b border-slate-800">
          {isSidebarOpen && (
            <div className="flex flex-col animate-fade-in overflow-hidden">
                {/* --- LOGO DINÁMICO --- */}
                <NoarLogoDark companyName={companyName} customLogo={globalLogo} />
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-xl text-slate-400 hover:bg-white/5 hover:text-amber-400 transition-all ${isSidebarOpen ? 'ml-auto' : 'mx-auto'}`}>
            {isSidebarOpen ? icons.collapse : icons.expand}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto py-6 sidebar-scroll space-y-6">
          {getNavSections(companyConfig).map((section, idx) => (
            <div key={section.title}>
              {isSidebarOpen && (
                <h3 className="px-6 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
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
        <div className="p-4 border-t border-slate-800 bg-slate-950">
            <div className={`flex items-center ${isSidebarOpen ? 'gap-3' : 'justify-center'}`}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-900 shadow-lg ring-2 ring-slate-800">
                    <span className="font-extrabold text-sm">{user?.email?.[0].toUpperCase() || 'A'}</span>
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

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm print:hidden">
          <div className="flex items-center gap-4">
             {/* Título Dinámico con subrayado amarillo */}
             <div className="flex flex-col">
                 <h2 className="text-2xl font-black text-slate-800 tracking-tight">{getActiveTitle()}</h2>
                 <div className="h-1 w-12 bg-amber-400 rounded-full mt-1"></div>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* NOTIFICACIÓN PEDIDOS WEB */}
            {pendingWebOrders.length > 0 && (
              <button 
                onClick={() => setActiveTab('Facturación')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all animate-bounce-short shadow-lg shadow-indigo-600/20"
              >
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] ring-2 ring-indigo-600">{pendingWebOrders.length}</span>
                </div>
                <span className="hidden lg:inline text-xs">PEDIDOS WEB</span>
              </button>
            )}

            {/* BOTÓN DINÁMICO DE TURNO (SHIFTS) */}
            {!hasOpenShift ? (
              <button 
                onClick={() => setShowOpenShiftModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                ABRIR TURNO
              </button>
            ) : (
              <div className="flex items-center gap-3">
                 <div className="hidden md:flex flex-col text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Caja Abierta</span>
                    <span className="text-xs font-black text-emerald-600 leading-none">VENDEDOR ACTIVO</span>
                 </div>
                 <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center border border-emerald-100">
                    {icons.caja}
                 </div>
                 {/* BOTÓN CERRAR TURNO */}
                 <button 
                  onClick={() => setActiveTab('Caja Diaria')} // Redirigiremos a una mini-vista de cierre o abriremos el modal en Facturacion
                  className="px-4 py-2 bg-rose-50 text-rose-600 font-bold text-xs rounded-xl border border-rose-100 hover:bg-rose-100 transition-all active:scale-95"
                 >
                   CERRAR TURNO
                 </button>
              </div>
            )}

            <div className="w-px h-8 bg-slate-200 mx-2 hidden sm:block"></div>

            <button onClick={handleLogout} className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all border border-slate-200 hover:border-red-200 bg-white shadow-sm">
              <span className="group-hover:translate-x-1 transition-transform duration-300">{icons.logout}</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </header>

        {/* MODAL APERTURA DE TURNO (Fondo de Caja) */}
        {showOpenShiftModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Apertura de Caja</h3>
              <p className="text-slate-500 text-sm font-medium mb-6">Ingresa el fondo inicial de efectivo en caja para comenzar a facturar.</p>
              
              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                  <input 
                    type="number" 
                    value={initialCash} 
                    onChange={(e) => setInitialCash(e.target.value)}
                    className="w-full pl-8 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black text-slate-800 focus:border-amber-400 focus:bg-white transition-all outline-none"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                   <button 
                    onClick={() => setShowOpenShiftModal(false)}
                    className="flex-1 px-4 py-4 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                        openShift(initialCash);
                        setShowOpenShiftModal(false);
                        setInitialCash(0);
                    }}
                    className="flex-[2] bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-black active:scale-95 transition-all"
                  >
                    INICIAR TURNO
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Content Scroll Area */}
        <main className={`flex-1 ${activeTab === 'Venta POS (Local)' ? 'overflow-hidden p-0' : 'overflow-y-auto p-6 lg:p-8'} relative no-scrollbar scroll-smooth bg-slate-50/50 print:p-0 print:bg-white`}>
            <div className={`mx-auto animate-fade-in-up ${activeTab === 'Venta POS (Local)' ? 'max-w-none h-full pb-0' : 'max-w-[1920px] pb-10'}`}>
                {renderContent()}
            </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;