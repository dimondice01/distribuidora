import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CATEGORICAL, INK } from './chartPalette';
import { formatCurrency, formatCurrencyCompact } from './formatters';

const RENDER_STATUS_ANULADA = 'Anulada';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 px-3 py-2 text-sm">
            <p className="font-bold text-gray-800 mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
                    {p.name}: {formatCurrency(p.value)}
                </p>
            ))}
        </div>
    );
};

/**
 * Serie temporal de ventas y ganancia bruta por día, dentro del rango filtrado.
 */
const VentasChart = ({ ventas }) => {
    const data = useMemo(() => {
        const porDia = new Map();
        ventas.forEach((v) => {
            if (v.tipo === 'devolucion' || v.estado === RENDER_STATUS_ANULADA) return;
            const clave = format(v.fecha, 'yyyy-MM-dd');
            const entry = porDia.get(clave) || { fecha: clave, ventas: 0, ganancia: 0 };
            entry.ventas += v.totalVenta || 0;
            entry.ganancia += (v.totalVenta || 0) - (v.totalCosto || 0);
            porDia.set(clave, entry);
        });
        return Array.from(porDia.values())
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .map((d) => ({ ...d, label: format(new Date(d.fecha), 'dd MMM', { locale: es }) }));
    }, [ventas]);

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-10 text-center text-gray-400 italic">
                No hay ventas en este período para graficar.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Evolución de Ventas y Ganancia</h3>
            <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CATEGORICAL[0]} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={CATEGORICAL[0]} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CATEGORICAL[1]} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={CATEGORICAL[1]} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: INK.muted }} axisLine={{ stroke: INK.axis }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: INK.muted }} axisLine={false} tickLine={false} tickFormatter={formatCurrencyCompact} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="ventas" name="Total Ventas" stroke={CATEGORICAL[0]} strokeWidth={2} fill="url(#colorVentas)" />
                    <Area type="monotone" dataKey="ganancia" name="Ganancia Bruta" stroke={CATEGORICAL[1]} strokeWidth={2} fill="url(#colorGanancia)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default VentasChart;
