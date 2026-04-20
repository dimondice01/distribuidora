import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, User, Clock, Filter, AlertTriangle } from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';

// ── Estilos globales para popups de Leaflet ──────────────────────────────────
const LEAFLET_POPUP_STYLES = `
  .leaflet-popup-content-wrapper {
    border-radius: 16px !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.14) !important;
    border: 1px solid #e2e8f0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .leaflet-popup-content { margin: 0 !important; }
  .leaflet-popup-tip-container { display: none !important; }
  .leaflet-popup-close-button {
    top: 10px !important; right: 12px !important;
    color: #94a3b8 !important; font-size: 20px !important;
    font-weight: 300 !important; z-index: 10 !important;
  }
  .leaflet-popup-close-button:hover { color: #475569 !important; background: none !important; }
`;

// ── Pines custom con divIcon ─────────────────────────────────────────────────
const mkPin = (bg, label = '', opacity = 1) => L.divIcon({
    className: '',
    html: `<div style="
        width:34px;height:34px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);background:${bg};
        border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.22);
        opacity:${opacity};transition:transform .15s;
    "><div style="
        transform:rotate(45deg);width:100%;height:100%;
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:900;color:white;padding-bottom:5px;
        letter-spacing:-0.5px;
    ">${label}</div></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
});

const PIN_VENTA   = mkPin('#22c55e', '$');
const PIN_VISITA  = mkPin('#f97316');
const PIN_GRIS    = mkPin('#94a3b8', '', 0.6);
const PIN_ALERTA  = mkPin('#ef4444', '!');

const UMBRAL_DISCREPANCIA = 300;

const PERIODOS = [
    { val: 'hoy',    label: 'Hoy'    },
    { val: 'ayer',   label: 'Ayer'   },
    { val: 'semana', label: 'Semana' },
    { val: 'todo',   label: 'Todo'   },
];

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R  = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

function AutoBoundSetter({ points }) {
    const map = useMap();
    useEffect(() => {
        if (points.length > 0) {
            map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [50, 50] });
        }
    }, [points, map]);
    return null;
}

// ── Popup content reutilizable ───────────────────────────────────────────────
function PopupContent({ titulo, badgeColor, nombre, vendedorName, ts, alerta, distancia, clienteId, onViewClient, totalVenta }) {
    const btnClass = "mt-3 w-full text-xs font-bold text-indigo-600 hover:text-indigo-800 text-center border border-indigo-100 hover:border-indigo-300 rounded-xl py-2 transition-colors bg-indigo-50 hover:bg-indigo-100 block";
    return (
        <div className="p-4 min-w-[220px]">
            <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: badgeColor }}></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{titulo}</span>
            </div>
            <p className="font-black text-[15px] text-slate-800 leading-tight">{nombre}</p>
            {totalVenta != null && (
                <p className="text-sm font-extrabold text-green-600 mt-0.5 mb-3">${totalVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
            )}
            {totalVenta == null && <div className="mb-3" />}
            <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                {vendedorName && (
                    <p className="flex items-center gap-2">
                        <User size={12} className="text-slate-400 flex-shrink-0" />
                        {vendedorName}
                    </p>
                )}
                {ts && (
                    <p className="flex items-center gap-2">
                        <Clock size={12} className="text-slate-400 flex-shrink-0" />
                        {format(ts, "dd/MM/yyyy · HH:mm", { locale: es })}hs
                    </p>
                )}
            </div>
            {alerta && distancia !== null && (
                <div className="mt-3 p-2 rounded-xl bg-red-50 text-red-600 text-[11px] font-bold flex items-center gap-2">
                    <AlertTriangle size={12} />
                    {distancia > 1000 ? `${(distancia / 1000).toFixed(1)} km` : `${distancia} m`} del domicilio registrado
                </div>
            )}
            {onViewClient && clienteId && (
                <button onClick={() => onViewClient(clienteId)} className={btnClass}>
                    Ver ficha del cliente →
                </button>
            )}
        </div>
    );
}

export default function MapaCRM({ onViewClient }) {
    const { onTenantSnapshot, tenantId } = useFirestore();

    const [visitas,    setVisitas]    = useState([]);
    const [ventas,     setVentas]     = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [zonas,      setZonas]      = useState([]);
    const [clientes,   setClientes]   = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [showAlertas, setShowAlertas] = useState(false);

    const [filtros, setFiltros] = useState({ vendedorId: '', resultado: 'todos', zonaId: '' });
    const [periodo, setPeriodo] = useState('hoy');

    useEffect(() => {
        if (!tenantId) return;
        let resolved = 0;
        const done = () => { if (++resolved === 5) setLoading(false); };

        const u1 = onTenantSnapshot('visitas',    (s) => { setVisitas(s.docs.map(d => ({ id: d.id, ...d.data() }))); done(); },    [{ field: 'fecha', direction: 'desc' }]);
        const u2 = onTenantSnapshot('ventas',     (s) => { setVentas(s.docs.map(d => ({ id: d.id, ...d.data() }))); done(); },     [{ field: 'fecha', direction: 'desc' }]);
        const u3 = onTenantSnapshot('vendedores', (s) => { setVendedores(s.docs.map(d => ({ id: d.id, ...d.data() }))); done(); }, [{ field: 'nombreCompleto', direction: 'asc' }]);
        const u4 = onTenantSnapshot('zonas',      (s) => { setZonas(s.docs.map(d => ({ id: d.id, ...d.data() }))); done(); },      [{ field: 'nombre', direction: 'asc' }]);
        const u5 = onTenantSnapshot('clientes',   (s) => { setClientes(s.docs.map(d => ({ id: d.id, ...d.data() }))); done(); },   [{ field: 'nombre', direction: 'asc' }]);

        return () => { u1(); u2(); u3(); u4(); u5(); };
    }, [onTenantSnapshot, tenantId]);

    const resolveTs = (doc) => {
        if (doc.fecha?.toDate) return doc.fecha.toDate();
        if (doc.timestamp)     return new Date(doc.timestamp);
        return new Date();
    };

    const todosLosEventos = useMemo(() =>
        visitas
            .filter(v => v.ubicacion?.lat && v.ubicacion?.lng)
            .map(v => {
                const venta = v.resultado === 'con_venta'
                    ? ventas.find(vt => vt.clienteId === v.clienteId && Math.abs((vt.fecha?.toDate?.() ?? new Date()) - (v.fecha?.toDate?.() ?? new Date(v.timestamp))) < 60000)
                    : null;
                return {
                    ...v,
                    clientName:   v.clientName   || v.clienteNombre  || 'Cliente',
                    vendedorName: v.vendedorName || v.vendedorNombre || '',
                    ts: resolveTs(v),
                    totalVenta: venta?.totalVenta ?? null,
                };
            })
    , [visitas, ventas]);

    const eventosFiltrados = useMemo(() => {
        let ev = todosLosEventos;

        const hoy    = new Date(); hoy.setHours(0, 0, 0, 0);
        const hasta  = new Date(); hasta.setHours(23, 59, 59, 999);
        const ayer   = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
        const semana = new Date(hoy); semana.setDate(semana.getDate() - 6);

        if (periodo === 'hoy')    ev = ev.filter(e => e.ts >= hoy    && e.ts <= hasta);
        if (periodo === 'ayer')   ev = ev.filter(e => e.ts >= ayer   && e.ts <  hoy);
        if (periodo === 'semana') ev = ev.filter(e => e.ts >= semana && e.ts <= hasta);

        if (filtros.zonaId) {
            const ids = new Set(vendedores.filter(v => v.zonasAsignadas?.includes(filtros.zonaId)).map(v => v.id));
            ev = ev.filter(e => ids.has(e.vendedorId));
        }
        if (filtros.vendedorId)            ev = ev.filter(e => e.vendedorId === filtros.vendedorId);
        if (filtros.resultado === 'visitas') ev = ev.filter(e => e.resultado === 'sin_venta');
        if (filtros.resultado === 'ventas')  ev = ev.filter(e => e.resultado === 'con_venta');

        return ev;
    }, [todosLosEventos, filtros, periodo, vendedores]);

    const clientesSinVisitar = useMemo(() => {
        if (!filtros.zonaId) return [];
        const visitados = new Set(eventosFiltrados.map(e => e.clienteId).filter(Boolean));
        return clientes
            .filter(c => c.zonaId === filtros.zonaId)
            .filter(c => !filtros.vendedorId || c.vendedorAsignadoId === filtros.vendedorId)
            .filter(c => !visitados.has(c.id));
    }, [clientes, filtros.zonaId, filtros.vendedorId, eventosFiltrados]);

    const clientesSinVisitarConCoords = useMemo(() =>
        clientesSinVisitar.filter(c => c.location?.latitude && c.location?.longitude),
    [clientesSinVisitar]);

    const clientesSinVisitarSinCoords = useMemo(() =>
        clientesSinVisitar.filter(c => !c.location?.latitude || !c.location?.longitude),
    [clientesSinVisitar]);

    const eventosConAlerta = useMemo(() => {
        if (!showAlertas) return new Set();
        return new Set(
            eventosFiltrados.filter(ev => {
                const c = clientes.find(x => x.id === ev.clienteId);
                if (!c?.location?.latitude) return false;
                const d = calculateDistance(ev.ubicacion.lat, ev.ubicacion.lng, c.location.latitude, c.location.longitude);
                return d !== null && d > UMBRAL_DISCREPANCIA;
            }).map(ev => ev.id)
        );
    }, [eventosFiltrados, clientes, showAlertas]);

    const getPin = (ev) => {
        if (showAlertas && eventosConAlerta.has(ev.id)) return PIN_ALERTA;
        return ev.resultado === 'con_venta' ? PIN_VENTA : PIN_VISITA;
    };

    const rutaOrdenada = useMemo(() => {
        if (!filtros.vendedorId) return [];
        return [...eventosFiltrados].sort((a, b) => a.ts - b.ts);
    }, [eventosFiltrados, filtros.vendedorId]);

    const boundsPoints = useMemo(() => [
        ...eventosFiltrados.map(e => ({ lat: e.ubicacion.lat,              lng: e.ubicacion.lng })),
        ...clientesSinVisitarConCoords.map(c => ({ lat: c.location.latitude, lng: c.location.longitude })),
    ], [eventosFiltrados, clientesSinVisitarConCoords]);

    const initialCenter = useMemo(() => {
        if (boundsPoints.length > 0) return [boundsPoints[0].lat, boundsPoints[0].lng];
        return [-31.42, -64.18];
    }, [boundsPoints]);

    const setFiltro = (key, val) => setFiltros(prev => ({ ...prev, [key]: val }));

    const cntVentas     = eventosFiltrados.filter(e => e.resultado === 'con_venta').length;
    const cntVisitas    = eventosFiltrados.filter(e => e.resultado === 'sin_venta').length;
    const cntTotal      = cntVentas + cntVisitas;
    const tasaConv      = cntTotal > 0 ? Math.round((cntVentas / cntTotal) * 100) : null;
    const cntSinVisitar = clientesSinVisitar.length;
    const cntAlertas    = eventosConAlerta.size;
    const hayPuntos     = boundsPoints.length > 0;
    const periodoLabel  = PERIODOS.find(p => p.val === periodo)?.label ?? '';

    const btnSegment = (active) =>
        `px-3 py-2 text-xs font-bold transition-all ${active ? 'bg-slate-900 text-amber-400' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`;

    return (
        <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 160px)' }}>
            <style>{LEAFLET_POPUP_STYLES}</style>

            {/* ── Barra de filtros ── */}
            <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-sm flex-shrink-0">
                <div className="flex flex-wrap items-end gap-2">

                    <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-widest mr-1">
                        <Filter size={12} /> Filtros
                    </div>

                    {/* Vendedor */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendedor</label>
                        <select value={filtros.vendedorId} onChange={e => setFiltro('vendedorId', e.target.value)}
                            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:border-amber-400 focus:outline-none font-medium text-slate-700 h-9">
                            <option value="">Todos</option>
                            {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombreCompleto}</option>)}
                        </select>
                    </div>

                    {/* Zona */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zona</label>
                        <select value={filtros.zonaId} onChange={e => setFiltro('zonaId', e.target.value)}
                            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:border-amber-400 focus:outline-none font-medium text-slate-700 h-9">
                            <option value="">Todas</option>
                            {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                        </select>
                    </div>

                    {/* Período */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período</label>
                        <div className="flex rounded-xl overflow-hidden border border-slate-200 h-9">
                            {PERIODOS.map(p => (
                                <button key={p.val} onClick={() => setPeriodo(p.val)} className={btnSegment(periodo === p.val)}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Resultado */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resultado</label>
                        <div className="flex rounded-xl overflow-hidden border border-slate-200 h-9">
                            {[{ val: 'todos', label: 'Todos' }, { val: 'visitas', label: 'Visitas' }, { val: 'ventas', label: 'Ventas' }].map(op => (
                                <button key={op.val} onClick={() => setFiltro('resultado', op.val)} className={btnSegment(filtros.resultado === op.val)}>
                                    {op.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Alertas GPS */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auditoría</label>
                        <button onClick={() => setShowAlertas(v => !v)} className={`flex items-center gap-1.5 px-3 h-9 text-xs font-bold rounded-xl border transition-all ${showAlertas ? 'bg-red-500 text-white border-red-500 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                            <AlertTriangle size={12} /> Alertas GPS
                        </button>
                    </div>

                    {/* Stats inline (actúan como leyenda) */}
                    <div className="ml-auto flex items-center gap-3 flex-wrap">
                        <span title="Ventas realizadas" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-default">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> {cntVentas}
                        </span>
                        <span title="Visitas sin venta" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-default">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span> {cntVisitas}
                        </span>
                        {tasaConv !== null && (
                            <span title="Tasa de conversión (ventas / total visitas)" className={`flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-lg cursor-default ${tasaConv >= 60 ? 'bg-green-50 text-green-600' : tasaConv >= 30 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
                                {tasaConv}% conv.
                            </span>
                        )}
                        {filtros.zonaId && (
                            <span title="Sin visitar en este período" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 cursor-default">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> {cntSinVisitar}
                            </span>
                        )}
                        {showAlertas && (
                            <span title="Discrepancias GPS" className="flex items-center gap-1.5 text-xs font-bold text-red-500 cursor-default">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> {cntAlertas}
                            </span>
                        )}
                        {filtros.vendedorId && rutaOrdenada.length > 1 && (
                            <span title="Ruta cronológica visible" className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 cursor-default">
                                <span className="w-5 h-px border-t-2 border-dashed border-indigo-400 inline-block"></span>
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Mapa ── */}
            {loading ? (
                <div className="flex-1 rounded-2xl border border-slate-200 bg-white flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-slate-400">Cargando mapa…</span>
                </div>
            ) : (
                <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
                    style={{ position: 'relative', zIndex: 10, minHeight: 0 }}>

                    {!hayPuntos ? (
                        <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                <MapPin size={28} className="text-slate-300" />
                            </div>
                            <p className="font-bold text-slate-500 text-sm">Sin actividad — {periodoLabel}</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {filtros.zonaId
                                    ? 'Probá "Todo" para ver el historial completo'
                                    : 'Seleccioná una zona o cambiá el período'}
                            </p>
                        </div>
                    ) : (
                        <MapContainer center={initialCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            />

                            {/* Pines grises: clientes sin visitar con coords */}
                            {clientesSinVisitarConCoords.map(c => (
                                <Marker key={`c-${c.id}`} position={[c.location.latitude, c.location.longitude]} icon={PIN_GRIS}>
                                    <Popup>
                                        <PopupContent
                                            titulo="Sin visitas"
                                            badgeColor="#94a3b8"
                                            nombre={c.nombre}
                                            clienteId={c.id}
                                            onViewClient={onViewClient}
                                        />
                                    </Popup>
                                </Marker>
                            ))}

                            {/* Pines de eventos */}
                            {eventosFiltrados.map((ev) => {
                                const esAlerta = showAlertas && eventosConAlerta.has(ev.id);
                                const cliente  = esAlerta ? clientes.find(c => c.id === ev.clienteId) : null;
                                const dist     = esAlerta && cliente?.location?.latitude
                                    ? calculateDistance(ev.ubicacion.lat, ev.ubicacion.lng, cliente.location.latitude, cliente.location.longitude)
                                    : null;

                                return (
                                    <Marker key={ev.id} position={[ev.ubicacion.lat, ev.ubicacion.lng]} icon={getPin(ev)}>
                                        <Popup>
                                            <PopupContent
                                                titulo={esAlerta ? 'Discrepancia GPS' : ev.resultado === 'con_venta' ? 'Venta realizada' : 'Visita sin venta'}
                                                badgeColor={esAlerta ? '#ef4444' : ev.resultado === 'con_venta' ? '#22c55e' : '#f97316'}
                                                nombre={ev.clientName}
                                                vendedorName={ev.vendedorName}
                                                ts={ev.ts}
                                                alerta={esAlerta}
                                                distancia={dist}
                                                clienteId={ev.clienteId}
                                                onViewClient={onViewClient}
                                                totalVenta={ev.totalVenta}
                                            />
                                        </Popup>
                                    </Marker>
                                );
                            })}

                            {filtros.vendedorId && rutaOrdenada.length > 1 && (
                                <Polyline
                                    positions={rutaOrdenada.map(e => [e.ubicacion.lat, e.ubicacion.lng])}
                                    pathOptions={{ color: '#6366f1', weight: 3, dashArray: '6, 10', opacity: 0.65 }}
                                />
                            )}

                            <AutoBoundSetter points={boundsPoints} />
                        </MapContainer>
                    )}

                    {/* Overlay: clientes sin coordenadas */}
                    {filtros.zonaId && clientesSinVisitarSinCoords.length > 0 && (
                        <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1000, maxWidth: 290 }}
                            className="bg-white/95 backdrop-blur-sm border border-amber-200 rounded-2xl p-3 shadow-lg">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <MapPin size={11} /> {clientesSinVisitarSinCoords.length} sin ubicación
                            </p>
                            <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                                {clientesSinVisitarSinCoords.map(c => (
                                    <button key={c.id} onClick={() => onViewClient && onViewClient(c.id)}
                                        className="text-left text-xs px-2 py-1.5 rounded-xl hover:bg-amber-50 transition-colors text-slate-700 font-medium">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 mr-2 mb-px"></span>
                                        {c.nombre}
                                        {c.direccion && <span className="text-slate-400 ml-1 font-normal">— {c.direccion}</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
