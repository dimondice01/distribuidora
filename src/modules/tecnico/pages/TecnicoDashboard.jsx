import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '../../../hooks/useFirestore';
import { useTenant } from '../../../contexts/TenantContext';
import { query, where, getDocs, limit } from 'firebase/firestore';
import { auth } from '../../../firebase';
import { signOut } from 'firebase/auth';
import DashboardClient from './DashboardClient';
import ServicioForm from './ServicioForm';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Parche para iconos de Leaflet en React/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function TecnicoDashboard() {
    const { tenantId, getTenantCollection, onTenantSnapshot } = useFirestore();
    const { user } = useTenant();
    
    // Navegación Interna: 'home' | 'list' | 'map' | 'client_detail' | 'service'
    const [view, setView] = useState('home');
    const [selectedClientId, setSelectedClientId] = useState(null);
    
    const [clients, setClients] = useState([]);
    const [assetsCount, setAssetsCount] = useState({});
    const [clientStatuses, setClientStatuses] = useState({});
    const [todayRevenue, setTodayRevenue] = useState({ total: 0, cash: 0, transfer: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // 1. Carga de Datos en Tiempo Real (Snapshot Enterprise)
    useEffect(() => {
        if (!tenantId || !user?.uid) return;

        const unsubscribeClients = onTenantSnapshot('clientes', (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
            setClients(list);
            setLoading(false);
        });

        const unsubscribeAssets = onTenantSnapshot('assets', (snap) => {
            const counts = {};
            const statuses = {};
            const now = Date.now();
            const proxVenc = now + (30 * 24 * 60 * 60 * 1000); 

            snap.docs.forEach(d => {
                const data = d.data();
                const cId = data.clientId || data.clienteId;
                if (!cId) return;
                counts[cId] = (counts[cId] || 0) + 1;
                const nextVal = data.nextService?.toMillis() || 0;
                let currentStatus = 'green';
                if (nextVal < now) currentStatus = 'red';
                else if (nextVal < proxVenc) currentStatus = 'yellow';

                if (!statuses[cId] || (currentStatus === 'red') || (currentStatus === 'yellow' && statuses[cId] === 'green')) {
                    statuses[cId] = currentStatus;
                }
            });
            setAssetsCount(counts);
            setClientStatuses(statuses);
        });

        const unsubscribeRevenue = onTenantSnapshot('transacciones', (snap) => {
            const now = new Date();
            const startOfDay = new Date(now.setHours(0, 0, 0, 0)).getTime();
            
            let total = 0, cash = 0, transfer = 0;
            snap.docs.forEach(d => {
                const data = d.data();
                const transDate = data.date?.toMillis() || 0;
                if (data.metadata?.serviceId && transDate >= startOfDay) {
                    const amount = parseFloat(data.amount || 0);
                    total += amount;
                    if (data.method === 'Efectivo') cash += amount;
                    if (data.method === 'Transferencia') transfer += amount;
                }
            });
            setTodayRevenue({ total, cash, transfer });
        });

        return () => {
            unsubscribeClients();
            unsubscribeAssets();
            unsubscribeRevenue();
        };
    }, [tenantId, user?.uid, onTenantSnapshot]);

    // Función para crear Pines "Bonitos" SVG
    const createPrettyPin = (color) => {
        const colors = {
            red: '#EF4444',
            yellow: '#F59E0B',
            green: '#10B981'
        };
        const hex = colors[color] || '#64748B';
        
        return L.divIcon({
            className: 'custom-pin',
            html: `<div style="
                width: 32px; 
                height: 32px; 
                background: ${hex}; 
                border: 3px solid white; 
                border-radius: 50% 50% 50% 0; 
                transform: rotate(-45deg);
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    width: 8px; 
                    height: 8px; 
                    background: white; 
                    border-radius: 50%;
                    transform: rotate(45deg);
                "></div>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });
    };

    const filteredClients = useMemo(() => {
        const s = searchTerm.toLowerCase();
        return clients.filter(c => c.nombre?.toLowerCase().includes(s) || c.direccion?.toLowerCase().includes(s));
    }, [clients, searchTerm]);

    const handleLogout = () => signOut(auth);

    // Renderizado Condicional por Vista
    if (view === 'client_detail' && selectedClientId) {
        return <DashboardClient 
            clientId={selectedClientId} 
            onBack={() => setView('list')} 
            onStartService={(id) => { setSelectedClientId(id); setView('service'); }}
            onViewMap={() => setView('map')}
        />;
    }

    if (view === 'service' && selectedClientId) {
        return <ServicioForm 
            clientId={selectedClientId} 
            onBack={() => setView('client_detail')} 
        />;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Inter'] text-slate-950 flex flex-col pb-20">
            <style>{`
                @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .animate-in { animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .tab-active { background: #0F172A; color: white; box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.2); }
                .glass-nav { background: rgba(255, 255, 255, 0.82); backdrop-filter: blur(20px); border-top: 1px solid rgba(226, 232, 240, 0.8); }
            `}</style>

            {/* HEADER DINÁMICO */}
            <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-orange-600/20">
                            {view === 'home' ? 'H' : view === 'list' ? 'L' : 'M'}
                         </div>
                         <h1 className="font-black text-lg tracking-tight uppercase">
                            {view === 'home' ? 'Dashboard' : view === 'list' ? 'Cartera' : 'Hoja de Ruta'}
                         </h1>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-slate-400 active:scale-95 transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </div>

            {/* CONTENIDO SEGÚN VISTA */}
            <div className="flex-1 p-6 overflow-y-auto">
                {view === 'home' && (
                    <div className="space-y-6 animate-in">
                        {/* Bento Box Home */}
                        <div className="grid grid-cols-2 gap-4">
                            <div onClick={() => setView('list')} className="col-span-2 bg-slate-950 p-6 rounded-[2.5rem] text-white shadow-2xl active:scale-[0.98] transition-all cursor-pointer overflow-hidden relative">
                                <div className="absolute right-0 top-0 p-8 opacity-10">
                                    <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M17 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                </div>
                                <h3 className="text-2xl font-black mb-1">Mi Cartera</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{clients.length} CLIENTES ACTIVOS</p>
                            </div>
                            
                            <div onClick={() => setView('map')} className="bg-white border-2 border-slate-100 p-6 rounded-[2.5rem] shadow-sm active:scale-[0.98] transition-all cursor-pointer">
                                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                                </div>
                                <h3 className="font-black text-sm uppercase">Mapa</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Plan de Ruta</p>
                            </div>

                            <div className="bg-white border-2 border-slate-100 p-6 rounded-[2.5rem] shadow-sm active:scale-[0.98] transition-all cursor-pointer">
                                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                </div>
                                <h3 className="font-black text-sm uppercase">Perfil</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Mis Datos</p>
                            </div>
                        </div>

                        {/* Bento Box: Recaudación Real-Time */}
                        <div className="bg-white border-2 border-slate-100 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden animate-in" style={{ animationDelay: '0.2s' }}>
                            <div className="absolute right-0 top-0 p-6 opacity-5 text-slate-900">
                                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                            </div>
                            <h4 className="font-black text-[10px] uppercase tracking-[0.25em] text-slate-400 mb-4">Recaudación de Hoy</h4>
                            <div className="flex items-end gap-2 mb-6">
                                <span className="text-5xl font-black text-slate-950 tracking-tighter">${todayRevenue.total.toLocaleString()}</span>
                                <span className="text-[10px] font-black text-emerald-500 uppercase mb-2">Sincronizado</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Efectivo</p>
                                    <p className="text-sm font-black text-slate-700">${todayRevenue.cash.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Transf.</p>
                                    <p className="text-sm font-black text-slate-700">${todayRevenue.transfer.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Status de Sincronización ERP */}
                        <div className="bg-slate-950 p-6 rounded-[2rem] border border-white/10 shadow-2xl animate-in" style={{ animationDelay: '0.3s' }}>
                            <div className="flex items-center gap-4">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/40"></div>
                                <p className="text-xs font-black text-white uppercase tracking-widest">Sincronización ERP Activa</p>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'list' && (
                    <div className="space-y-4 animate-in">
                         <input 
                            type="search"
                            placeholder="BUSCAR CLIENTE..."
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 text-xs font-black outline-none focus:border-orange-500 transition-all uppercase"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <div className="space-y-3">
                            {filteredClients.map(client => (
                                <div 
                                    key={client.id}
                                    onClick={() => { setSelectedClientId(client.id); setView('client_detail'); }}
                                    className="bg-white p-5 rounded-[1.8rem] border border-slate-100 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h4 className="font-black text-[1rem] tracking-tight text-slate-900 uppercase truncate">{client.nombre}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{client.direccion || 'Sin dirección'}</p>
                                    </div>
                                    <div className="bg-slate-50 px-3 py-2 rounded-xl text-center min-w-[50px]">
                                        <p className="text-sm font-black text-slate-800">{assetsCount[client.id] || 0}</p>
                                        <p className="text-[7px] font-black text-slate-400 uppercase">Equipos</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'map' && (
                    <div className="h-[calc(100vh-250px)] w-full bg-slate-50 rounded-[2.5rem] overflow-hidden relative animate-in border-2 border-white shadow-2xl flex flex-col">
                        {MapContainer ? (
                            <MapContainer 
                                center={clients.find(c => c.lat)?.lat ? [clients.find(c => c.lat).lat, clients.find(c => c.lat).lng] : [-34.6037, -58.3816]} 
                                zoom={13} 
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom={true}
                            >
                                <TileLayer 
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                                />
                                {clients.map(c => {
                                    if (!c.lat || !c.lng) return null;
                                    const status = clientStatuses[c.id] || 'green';
                                    
                                    return (
                                        <Marker 
                                            key={c.id} 
                                            position={[parseFloat(c.lat), parseFloat(c.lng)]}
                                            icon={createPrettyPin(status)}
                                        >
                                            <Popup className="enterprise-popup">
                                                <div className="p-3 text-center min-w-[140px]">
                                                    <div className={`w-2 h-2 rounded-full mx-auto mb-2 ${status === 'red' ? 'bg-red-500' : status === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                                    <h4 className="font-black text-slate-900 uppercase text-[11px] mb-1 leading-tight">{c.nombre}</h4>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-3 truncate">{c.direccion}</p>
                                                    <button 
                                                        onClick={() => { setSelectedClientId(c.id); setView('client_detail'); }}
                                                        className="w-full py-2 bg-slate-950 text-white rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-slate-900/20"
                                                    >
                                                        Abrir Ficha
                                                    </button>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    );
                                })}
                            </MapContainer>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A2 2 0 013 15.488V5.488a2 2 0 011.553-1.944L9 2l6 3 5.447-2.724A2 2 0 0123 4.144v10a2 2 0 01-1.553 1.944L15 19l-6 1z"></path></svg>
                                </div>
                                <h3 className="font-black text-slate-900 uppercase text-xl">Inicializando Mapa...</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Asegúrate de haber instalado las librerías y reiniciado el servidor Vite.</p>
                            </div>
                        )}
                        
                        {/* Overlay Manual de Ayuda (Enterprise Style) */}
                        <div className="absolute bottom-4 left-4 right-4 bg-white/70 backdrop-blur-md p-3 rounded-2xl border border-white/50 z-[1000] flex justify-between items-center shadow-lg">
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Mapa Interactivo PWA</span>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></div>
                                <span className="text-[9px] font-black text-slate-400 uppercase">{clients.filter(c => c.lat).length} Clientes Ubicados</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* BARRA DE NAVEGACIÓN MODULAR (Bottom Tab Bar) */}
            <div className="fixed bottom-0 left-0 right-0 z-50 glass-nav px-8 pb-8 pt-4 flex justify-between items-center">
                <button onClick={() => setView('home')} className={`p-4 rounded-2xl transition-all ${view === 'home' ? 'tab-active' : 'text-slate-400 active:bg-slate-50'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                </button>
                <button onClick={() => setView('list')} className={`p-4 rounded-2xl transition-all ${view === 'list' || view === 'client_detail' || view === 'service' ? 'tab-active' : 'text-slate-400 active:bg-slate-50'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                </button>
                <button onClick={() => setView('map')} className={`p-4 rounded-2xl transition-all ${view === 'map' ? 'tab-active' : 'text-slate-400 active:bg-slate-50'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                </button>
            </div>
        </div>
    );
}
