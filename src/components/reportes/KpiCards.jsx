import React from 'react';
import { INK } from './chartPalette';

/**
 * Tarjeta de KPI con delta % opcional contra el período anterior.
 * deltaPercent: number | null (null = no hay comparativo disponible, ej. rango custom largo).
 */
const KpiCard = ({ title, value, icon, bgIcon, borderColor, subtext, deltaPercent }) => {
    const tieneDelta = typeof deltaPercent === 'number' && Number.isFinite(deltaPercent);
    const esPositivo = tieneDelta && deltaPercent >= 0;

    return (
        <div className={`bg-white p-5 rounded-2xl shadow-md border-l-4 ${borderColor} flex flex-col justify-between h-full transition-transform hover:scale-[1.02]`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl ${bgIcon}`}>{icon}</div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{title}</p>
                    </div>
                </div>
                {tieneDelta && (
                    <span
                        className="text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap"
                        style={{
                            color: esPositivo ? INK.successText : '#b91c1c',
                            backgroundColor: esPositivo ? '#e6f4e6' : '#fbe9e9',
                        }}
                        title="Variación vs. mismo período anterior"
                    >
                        {esPositivo ? '▲' : '▼'} {Math.abs(deltaPercent).toFixed(1)}%
                    </span>
                )}
            </div>
            <div className="mt-4">
                <p className="text-2xl font-extrabold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{value}</p>
                {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
            </div>
        </div>
    );
};

export default KpiCard;
