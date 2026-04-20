import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '../../../hooks/useFirestore';
import { doc, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { toast } from 'react-toastify';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

// Componente auxiliar para capturar el click en el mapa
function LocationMarker({ onSelect }) {
    useMapEvents({
        click(e) {
            onSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function DashboardClient({ clientId, onBack, onStartService }) {
    const { tenantId, getTenantCollection, getTenantDoc, updateTenantDoc } = useFirestore();
    const [client, setClient] = useState(null);
    const [stats, setStats] = useState({ total: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [isMapPicking, setIsMapPicking] = useState(false);

    useEffect(() => {
        if (!clientId) return;
        const loadClientData = async () => {
            try {
                const cDoc = await getDoc(getTenantDoc('clientes', clientId));
                if (cDoc.exists()) setClient({ id: cDoc.id, ...cDoc.data() });

                const qA = query(getTenantCollection('assets'), where('clientId', '==', clientId));
                const snapA = await getDocs(qA);
                const assets = snapA.docs.map(d => d.data());
                const unAnioAtras = Date.now() - (365 * 24 * 60 * 60 * 1000);
                const pending = assets.filter(a => !a.lastService || a.lastService.toMillis() < unAnioAtras).length;
                setStats({ total: assets.length, pending });
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        loadClientData();
    }, [clientId, tenantId, getTenantCollection]);

    const saveLocation = async (lat, lng) => {
        try {
            await updateTenantDoc('clientes', clientId, { 
                lat: parseFloat(lat), 
                lng: parseFloat(lng) 
            });
            setClient(prev => ({ ...prev, lat, lng }));
            setIsMapPicking(false);
            toast.success("📍 Ubicación guardada con éxito");
        } catch (e) { toast.error("Error al guardar ubicación"); }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) return toast.error("GPS No soportado");
        toast.info("Obteniendo señal GPS...");
        navigator.geolocation.getCurrentPosition(
            (pos) => saveLocation(pos.coords.latitude, pos.coords.longitude),
            (err) => toast.error("Error de GPS: Revisa los permisos"),
            { enableHighAccuracy: true }
        );
    };

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-['Inter'] text-slate-950 flex flex-col pb-10">
            <style>{`
                @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .glass-card { background: rgba(255, 255, 255, 0.82); backdrop-filter: blur(20px); border: 1px solid rgba(226, 232, 240, 0.8); }
            `}</style>

            {/* Header Pro */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-5 flex items-center gap-4">
                <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm active:scale-95 transition-transform">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <div className="flex-1">
                    <h1 className="font-black text-xl tracking-tight text-slate-900 uppercase truncate leading-none">{client?.nombre}</h1>
                    <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">{client?.lat ? '✅ Ubicación Registrada' : '📍 Ubicación Pendiente'}</p>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Info Card Enterprise */}
                <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/40 animate-up relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-2.5 h-full ${client?.lat ? 'bg-emerald-500' : 'bg-orange-400'}`}></div>
                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-4 rounded-3xl ${client?.lat ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        </div>
                        <span className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-full tracking-widest ${client?.lat ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'}`}>
                            {client?.lat ? 'SINCRO GPS OK' : 'PENDIENTE GPS'}
                        </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-950 leading-tight mb-2 uppercase">{client?.nombre}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                        {client?.direccion || 'Sin dirección registrada'}
                    </p>
                </div>

                {/* GEOLOCALIZACIÓN TOOLS */}
                <div className="grid grid-cols-1 gap-4 animate-up" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center justify-between px-2">
                         <h3 className="font-black text-[10px] uppercase tracking-[0.25em] text-slate-400">Geolocalización</h3>
                         {client?.lat && <button onClick={() => saveLocation(null, null)} className="text-[10px] font-black text-red-500 uppercase">Eliminar</button>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleGetCurrentLocation}
                            className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all shadow-sm group active:border-orange-500"
                        >
                            <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl group-active:bg-orange-600 group-active:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                            </div>
                            <span className="text-[10px] font-black text-slate-900 uppercase">GPS Aquí</span>
                        </button>

                        <button 
                            onClick={() => setIsMapPicking(!isMapPicking)}
                            className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 active:scale-95 transition-all shadow-sm ${isMapPicking ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-900'}`}
                        >
                            <div className={`p-3 rounded-2xl ${isMapPicking ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A2 2 0 013 15.488V5.488a2 2 0 011.553-1.944L9 2l6 3 5.447-2.724A2 2 0 0123 4.144v10a2 2 0 01-1.553 1.944L15 19l-6 1z"></path></svg>
                            </div>
                            <span className="text-[10px] font-black uppercase">{isMapPicking ? 'Cerrar Mapa' : 'Poner Pin'}</span>
                        </button>
                    </div>

                    {isMapPicking && (
                        <div className="h-80 w-full rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl relative animate-up">
                            <MapContainer center={client?.lat ? [client.lat, client.lng] : [-34.6037, -58.3816]} zoom={15} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <LocationMarker onSelect={saveLocation} />
                                {client?.lat && <Marker position={[client.lat, client.lng]} />}
                            </MapContainer>
                            <div className="absolute top-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-black p-3 rounded-xl text-center z-[1000] uppercase tracking-widest">
                                Toca en el mapa para marcar al cliente
                            </div>
                        </div>
                    )}
                </div>

                {/* Acciones de Negocio */}
                <div className="space-y-4 animate-up" style={{ animationDelay: '0.2s' }}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950 p-6 rounded-[2.5rem] text-white shadow-xl">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Activos</p>
                            <p className="text-4xl font-black">{stats.total}</p>
                        </div>
                        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Vencidos</p>
                            <p className="text-4xl font-black text-slate-900">{stats.pending}</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => onStartService(clientId)}
                        className="w-full bg-[#EA580C] text-white p-6 rounded-[2.5rem] font-black text-xl shadow-2xl shadow-orange-600/30 flex items-center justify-center gap-4 active:scale-95 transition-all"
                    >
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4"></path></svg>
                        </div>
                        INICIAR SERVICIO
                    </button>
                    
                    <button className="w-full bg-white border-2 border-slate-100 text-slate-400 p-5 rounded-[2rem] font-black text-xs uppercase tracking-widest active:bg-slate-50 transition-all opacity-50">
                        Ver Inventario Completo
                    </button>
                </div>
            </div>
        </div>
    );
}
