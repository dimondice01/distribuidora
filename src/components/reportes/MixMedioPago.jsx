import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts';
import { CATEGORICAL, INK } from './chartPalette';
import { formatCurrency, formatCurrencyCompact } from './formatters';

/**
 * Mix de medios de pago (ingresos): Efectivo/Transferencia/Tarjeta/QR/Point.
 * Recibe el objeto `porMetodo` ya calculado por useFlujoEfectivo.
 */
const MixMedioPago = ({ porMetodo }) => {
    const data = useMemo(() => {
        return Object.entries(porMetodo)
            .map(([metodo, monto]) => ({ metodo, monto }))
            .filter((d) => d.monto > 0)
            .sort((a, b) => b.monto - a.monto);
    }, [porMetodo]);

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-10 text-center text-gray-400 italic">
                No hay ingresos registrados en este período.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Mix de Medios de Pago</h3>
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={INK.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: INK.muted }} axisLine={false} tickLine={false} tickFormatter={formatCurrencyCompact} />
                    <YAxis type="category" dataKey="metodo" tick={{ fontSize: 12, fill: INK.secondary, fontWeight: 600 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                    <Bar dataKey="monto" radius={[0, 4, 4, 0]} barSize={22}>
                        {data.map((entry, i) => (
                            <Cell key={entry.metodo} fill={CATEGORICAL[i % CATEGORICAL.length]} />
                        ))}
                        <LabelList dataKey="monto" position="right" formatter={formatCurrencyCompact} style={{ fontSize: 11, fill: INK.secondary, fontWeight: 600 }} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default MixMedioPago;
