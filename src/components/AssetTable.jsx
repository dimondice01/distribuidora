import React from 'react';

const AssetTable = ({ assets }) => {
    
    const formatDate = (timestamp) => {
        if (!timestamp) return 'S/D';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-AR');
    };

    /**
     * Determina el color de alerta basado en la fecha de vencimiento.
     */
    const getStatusColor = (proximaVisita) => {
        if (!proximaVisita) return 'text-slate-400';
        const today = new Date();
        const dueDate = proximaVisita.toDate ? proximaVisita.toDate() : new Date(proximaVisita);
        
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'text-red-500 font-black'; // Vencido
        if (diffDays <= 30) return 'text-amber-500 font-bold'; // Por vencer (30 días)
        return 'text-emerald-500 font-bold'; // Al día
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in mt-6">
            <header className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-6 bg-amber-400 rounded-full"></span>
                    Inventario de Activos (Matafuegos)
                </h3>
                <span className="text-xs font-bold bg-slate-200 text-slate-600 px-3 py-1 rounded-full uppercase tracking-wider">
                    {assets.length} Unidades
                </span>
            </header>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="px-6 py-4">Tipo / Capacidad</th>
                            <th className="px-6 py-4">Último Service</th>
                            <th className="px-6 py-4">Vencimiento</th>
                            <th className="px-6 py-4">Ubicación Interna</th>
                            <th className="px-6 py-4">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {assets.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-slate-400 italic">
                                    No hay activos registrados para este cliente.
                                </td>
                            </tr>
                        ) : (
                            assets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800">{asset.tipo}</span>
                                            <span className="text-xs text-slate-400">{asset.capacidad}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {formatDate(asset.fechaUltimoService)}
                                    </td>
                                    <td className={`px-6 py-4 text-sm ${getStatusColor(asset.proximaVisita)}`}>
                                        {formatDate(asset.proximaVisita)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500 italic">
                                        {asset.ubicacionInterna || 'Sin asignar'}
                                    </td>
                                    <td className="px-6 py-4 uppercase">
                                        <div className={`text-[10px] font-black px-2 py-1 rounded-md inline-block
                                            ${asset.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}
                                        `}>
                                            {asset.estado}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AssetTable;
