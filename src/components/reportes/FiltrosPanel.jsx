import React from 'react';

const ESTADOS = ['Pagada', 'Adeuda', 'Pendiente de Entrega', 'Repartiendo', 'Anulada'];
const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta', 'QR', 'Point'];

const selectClass = "text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer";

const FiltrosPanel = ({
    vendedores, zonas, filtros, onFiltrosChange,
    startDate, endDate, onDateChange, formatDateForInput, atajos,
}) => {
    const handleChange = (campo) => (e) => onFiltrosChange({ ...filtros, [campo]: e.target.value });

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-3">
            {/* Atajos de rango + fechas */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase mr-1">Período</span>
                <button onClick={atajos.hoy} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100">Hoy</button>
                <button onClick={atajos.semana} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100">Esta semana</button>
                <button onClick={atajos.mes} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100">Este mes</button>
                <button onClick={atajos.mesAnterior} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100">Mes anterior</button>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <div className="flex items-center gap-2">
                    <label htmlFor="startDate" className="text-xs font-bold text-gray-500 uppercase">Desde</label>
                    <input type="date" name="startDate" id="startDate" value={formatDateForInput(startDate)} onChange={onDateChange} className="text-sm font-bold text-indigo-700 outline-none bg-transparent cursor-pointer" />
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="endDate" className="text-xs font-bold text-gray-500 uppercase">Hasta</label>
                    <input type="date" name="endDate" id="endDate" value={formatDateForInput(endDate)} onChange={onDateChange} className="text-sm font-bold text-indigo-700 outline-none bg-transparent cursor-pointer" />
                </div>
            </div>

            {/* Filtros de negocio */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-bold text-gray-400 uppercase mr-1">Filtros</span>
                <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={filtros.busquedaCliente}
                    onChange={handleChange('busquedaCliente')}
                    className="text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                />
                <select value={filtros.vendedorId} onChange={handleChange('vendedorId')} className={selectClass}>
                    <option value="">Todos los vendedores</option>
                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombreCompleto}</option>)}
                </select>
                <select value={filtros.zonaId} onChange={handleChange('zonaId')} className={selectClass}>
                    <option value="">Todas las zonas</option>
                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
                <select value={filtros.estado} onChange={handleChange('estado')} className={selectClass}>
                    <option value="">Todos los estados</option>
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select value={filtros.metodoPago} onChange={handleChange('metodoPago')} className={selectClass}>
                    <option value="">Todos los medios de pago</option>
                    {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {(filtros.vendedorId || filtros.zonaId || filtros.estado || filtros.metodoPago || filtros.busquedaCliente) && (
                    <button
                        onClick={() => onFiltrosChange({ vendedorId: '', zonaId: '', estado: '', metodoPago: '', busquedaCliente: '' })}
                        className="text-xs font-bold text-gray-500 hover:text-rose-600 px-2"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>
        </div>
    );
};

export default FiltrosPanel;
