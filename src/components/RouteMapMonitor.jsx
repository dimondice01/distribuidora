import React, { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { XIcon, TruckIcon, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Corregir el bug de iconos de Leaflet en React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Iconos personalizados
const blueIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const greenIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
const grayIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });

// --- CÁLCULO DE DISTANCIA (Haversine) ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c); // Metros
};

// Componente para auto-ajustar el zoom
function AutoBoundSetter({ points }) {
    const map = useMap();
    useEffect(() => {
        if (points.length > 0) {
            const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [points, map]);
    return null;
}

const RouteMapMonitor = ({ isOpen, onClose, route, clientes = [] }) => {
    if (!isOpen || !route) return null;

    const events = useMemo(() => {
        // Obtenemos facturas que tengan coordenadas
        const facturasConGps = (route.facturas || [])
            .filter(f => f.location && f.location.lat && f.location.lng)
            .map(f => {
                const cliente = clientes.find(c => c.id === f.clienteId) || {};
                const baseLat = cliente.location?.latitude || cliente.location?.lat || cliente.latitude || cliente.lat;
                const baseLng = cliente.location?.longitude || cliente.location?.lng || cliente.longitude || cliente.lng;
                const distance = calculateDistance(f.location.lat, f.location.lng, baseLat, baseLng);
                const hasAlert = distance !== null && distance > 100;

                return {
                    ...f,
                    lat: f.location.lat,
                    lng: f.location.lng,
                    timestamp: f.location.timestamp ? new Date(f.location.timestamp) : new Date(),
                    distance,
                    hasAlert,
                    accuracy: f.location.accuracy || 0
                };
            })
            .sort((a, b) => a.timestamp - b.timestamp);

        return facturasConGps;
    }, [route, clientes]);

    const referencePoints = useMemo(() => {
        if (events.length > 0) return events;
        
        // Si no hay eventos, intentamos usar las coordenadas base de los clientes de la ruta
        return (route.facturas || [])
            .map(f => {
                const cliente = clientes.find(c => c.id === f.clienteId) || {};
                return {
                    lat: cliente.location?.latitude || cliente.location?.lat || cliente.latitude || cliente.lat,
                    lng: cliente.location?.longitude || cliente.location?.lng || cliente.longitude || cliente.lng
                };
            })
            .filter(p => p.lat && p.lng);
    }, [events, route.facturas, clientes]);

    const polylinePositions = useMemo(() => events.map(e => [e.lat, e.lng]), [events]);

    // Calcular centro inicial basado en puntos de referencia o default
    const initialCenter = useMemo(() => {
        if (referencePoints.length > 0) return [referencePoints[0].lat, referencePoints[0].lng];
        return [-31.42, -64.18]; // Default Córdoba
    }, [referencePoints]);

    return (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <TruckIcon className="text-indigo-600" /> Auditoría GPS: {route.nombre}
                        </h2>
                        <p className="text-xs text-gray-500 font-medium">
                            Repartidor: {route.repartidorNombre} | {events.length} Puntos registrados
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-grow flex overflow-hidden">
                    {/* Mapa Central */}
                    <div className="flex-grow relative z-10 border-r">
                        <MapContainer 
                            center={initialCenter} 
                            zoom={13} 
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            
                            {/* Marcadores de Clientes (Si no hay eventos) */}
                            {events.length === 0 && referencePoints.map((p, i) => (
                                <Marker key={`client-${i}`} position={[p.lat, p.lng]} icon={grayIcon} opacity={0.6}>
                                    <Popup><p className="text-xs font-bold">Ubicación registrada del cliente</p></Popup>
                                </Marker>
                            ))}

                            {events.map((event, idx) => (
                                <Marker 
                                    key={event.id} 
                                    position={[event.lat, event.lng]}
                                    icon={event.hasAlert ? redIcon : (event.estadoVisita === 'Pagada' ? greenIcon : blueIcon)}
                                >
                                    <Popup>
                                        <div className="p-1 min-w-[180px]">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-sm text-gray-800 leading-tight">{event.clienteNombre}</h4>
                                                <span className="text-[10px] bg-gray-100 px-1.5 rounded text-gray-500">#{idx + 1}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {event.clienteDireccion}
                                            </p>
                                            <p className="text-[10px] text-gray-400 border-t pt-2">
                                                Hora: {format(event.timestamp, 'HH:mm', { locale: es })}hs
                                            </p>
                                            <p className="text-[10px] text-gray-400">
                                                Precisión: ±{Math.round(event.accuracy)}m
                                            </p>
                                            
                                            {event.distance !== null && (
                                                <div className={`mt-2 p-1.5 rounded text-[11px] font-bold flex items-center gap-1.5 ${event.hasAlert ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                    {event.hasAlert ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                                    Distancia base: {event.distance > 1000 ? `${(event.distance/1000).toFixed(1)}km` : `${event.distance}m`}
                                                </div>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}

                            <Polyline 
                                positions={polylinePositions}
                                pathOptions={{ color: '#4f46e5', weight: 3, dashArray: '5, 10', opacity: 0.6 }}
                            />

                            <AutoBoundSetter points={referencePoints} />
                        </MapContainer>
                    </div>

                    {/* Timeline Lateral */}
                    <div className="w-80 bg-gray-50 overflow-y-auto p-4 hidden md:block">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Línea de Tiempo</h3>
                        <div className="space-y-4">
                            {events.map((event, idx) => (
                                <div key={event.id} className="relative pl-6 border-l-2 border-gray-200 py-1">
                                    <div className={`absolute -left-[9px] top-2 w-4 h-4 rounded-full border-2 border-white ${event.hasAlert ? 'bg-red-500' : (event.estadoVisita === 'Pagada' ? 'bg-green-500' : 'bg-blue-500')}`}></div>
                                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-bold text-gray-800 truncate pr-2">{event.clienteNombre}</p>
                                            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1 rounded">{format(event.timestamp, 'HH:mm')}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 truncate mb-1">{event.clienteDireccion}</p>
                                        {event.hasAlert && (
                                            <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                                                <AlertTriangle size={10} /> Entrega fuera de radio (+{event.distance}m)
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {events.length === 0 && (
                                <div className="text-center py-10 opacity-50">
                                    <MapPin className="mx-auto mb-2 text-gray-300" size={32} />
                                    <p className="text-xs font-medium text-gray-400">No hay datos de GPS registrados para esta ruta aún.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RouteMapMonitor;
