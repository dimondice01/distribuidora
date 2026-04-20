import React, { useState, useMemo } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const AssetAgenda = ({ onViewClient }) => {
    const { tenantId, onTenantSnapshot } = useFirestore();
    const [assets, setAssets] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Reset de página al cambiar filtro
    React.useEffect(() => {
        setCurrentPage(1);
    }, [selectedMonth, selectedYear]);

    // Suscripción a Activos y Clientes
    React.useEffect(() => {
        if (!tenantId) return;

        const unsubAssets = onTenantSnapshot('assets', (s) => {
            const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
            setAssets(data);
            setLoading(false);
        }, [], (err) => {
            console.error("Error Assets:", err);
            setError(`Error Assets: ${err.message}`);
            setLoading(false);
        });

        const unsubClients = onTenantSnapshot('clientes', (s) => {
            const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
            setClientes(data);
        }, [], (err) => {
            console.error("Error Clientes:", err);
            setError(`Error Clientes: ${err.message}`);
        });

        return () => {
            unsubAssets();
            unsubClients();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId]);

    // Mapa de clientes para acceso rápido por ID
    const clientesMap = useMemo(() => {
        const map = {};
        clientes.forEach(c => { 
            map[c.id] = { ...c, id: c.id }; 
        });
        return map;
    }, [clientes]);

    // Agrupación de activos por mes y año
    const agendaData = useMemo(() => {
        const groups = {};
        
        // Si no hay activos, retornamos vacío
        if (!assets.length) return groups;

        assets.forEach(asset => {
            if (!asset.proximaVisita) return;
            
            // Compatibilidad con ambos nombres de campo
            const clientId = asset.clientId || asset.clienteId;
            if (!clientId) return;

            const date = asset.proximaVisita.toDate();
            const month = date.getMonth();
            const year = date.getFullYear();
            
            const key = `${year}-${month}`;
            if (!groups[key]) groups[key] = { clients: {}, totalAssets: 0 };
            
            if (!groups[key].clients[clientId]) {
                // Buscamos en el mapa, si no existe, usamos un placeholder con el ID
                const clientInfo = clientesMap[clientId] || { 
                    id: clientId,
                    nombre: `ID: ${clientId.substring(0, 8)}...`, 
                    direccion: 'Resolviendo identidad...' 
                };

                groups[key].clients[clientId] = {
                    info: clientInfo,
                    count: 0,
                    assets: []
                };
            }
            
            // Actualización proactiva si la info llegó después
            if (groups[key].clients[clientId].info.nombre.startsWith('ID:') && clientesMap[clientId]) {
                groups[key].clients[clientId].info = clientesMap[clientId];
            }

            groups[key].clients[clientId].count++;
            groups[key].clients[clientId].assets.push(asset);
            groups[key].totalAssets++;
        });
        return groups;
    }, [assets, clientesMap]);

    if (loading) return <div className="p-8 text-slate-500">Cargando Agenda Proactiva...</div>;

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const currentYearKey = (m) => `${selectedYear}-${m}`;
    const selectedMonthData = agendaData[currentYearKey(selectedMonth)] || { clients: {}, totalAssets: 0 };
    
    // Lógica de Paginación
    const allClientsInMonth = Object.values(selectedMonthData.clients).sort((a,b) => b.count - a.count);
    const totalPages = Math.ceil(allClientsInMonth.length / itemsPerPage);
    const paginatedClients = allClientsInMonth.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="p-6 h-full overflow-y-auto space-y-8">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold animate-pulse">
                    ⚠️ Error de Sincronización: {error}
                </div>
            )}
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Agenda de Vencimientos 📅</h2>
                    <div className="flex gap-4 mt-1">
                        <p className="text-slate-500 text-sm">Planificación estratégica para el año {selectedYear}.</p>
                        <div className="flex gap-2">
                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">
                                {assets.length} Assets
                            </span>
                            <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">
                                {clientes.length} Clientes
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                    {[2025, 2026, 2027].map(y => (
                        <button
                            key={y}
                            onClick={() => setSelectedYear(y)}
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${selectedYear === y ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {y}
                        </button>
                    ))}
                </div>
            </header>

            {/* Grid de 12 Meses */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {months.map((name, index) => {
                    const data = agendaData[currentYearKey(index)];
                    const isSelected = selectedMonth === index;
                    const hasData = data && data.totalAssets > 0;

                    return (
                        <button
                            key={index}
                            onClick={() => setSelectedMonth(index)}
                            className={`
                                relative p-4 rounded-2xl border transition-all text-left group
                                ${isSelected ? 'bg-amber-400 border-amber-500 shadow-lg shadow-amber-200' : 'bg-white border-slate-100 hover:border-slate-300'}
                            `}
                        >
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-amber-900' : 'text-slate-400'}`}>
                                {name.substring(0, 3)}
                            </p>
                            <p className={`text-xl font-black ${isSelected ? 'text-amber-950' : 'text-slate-800'}`}>
                                {hasData ? data.totalAssets : '0'}
                            </p>
                            {hasData && !isSelected && (
                                <div className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Detalle del Mes Seleccionado */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-tight">
                        Detalle: {months[selectedMonth]} {selectedYear}
                    </h3>
                    <div className="bg-white px-3 py-1 rounded-full border border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                        {allClientsInMonth.length} Clientes Detectados
                    </div>
                </div>

                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-4">Cliente / Dirección</th>
                                <th className="px-8 py-4">Equipos</th>
                                <th className="px-8 py-4">Contacto</th>
                                <th className="px-8 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedClients.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-8 py-10 text-center text-slate-400 italic text-sm">
                                        No hay vencimientos programados para este mes.
                                    </td>
                                </tr>
                            ) : (
                                paginatedClients.map((item, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <p className="font-black text-slate-800 group-hover:text-amber-600 transition-colors uppercase text-sm">
                                                {item.info.nombre}
                                            </p>
                                            <p className="text-xs text-slate-400 font-medium">
                                                {item.info.direccion}
                                            </p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-black">
                                                {item.count} Unidades
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs font-bold text-slate-600">{item.info.telefono || 'Sin Teléfono'}</p>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button 
                                                onClick={() => onViewClient(item.info.id)}
                                                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black shadow-sm hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95"
                                            >
                                                Ver Detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-center gap-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm disabled:opacity-50 hover:bg-slate-100 transition-all"
                        >
                            Anterior
                        </button>
                        <div className="flex items-center px-4 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800">
                            {currentPage} / {totalPages}
                        </div>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-black shadow-sm disabled:opacity-50 hover:bg-slate-100 transition-all"
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetAgenda;
