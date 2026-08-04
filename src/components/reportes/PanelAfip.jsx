import React, { useMemo } from 'react';
import { STATUS } from './chartPalette';

const RENDER_STATUS_PENDIENTE = 'Pendiente de Entrega';
const RENDER_STATUS_ANULADA = 'Anulada';

/**
 * Cumplimiento de facturación electrónica AFIP: % de ventas que debían facturarse
 * (facturaAfip === true) y ya tienen CAE, vs las que quedaron pendientes/con error.
 * Mismo criterio que usa el badge "SIN CAE" en Facturacion.jsx.
 */
const PanelAfip = ({ ventas }) => {
    const { pct, aprobadas, pendientes, listaPendientes } = useMemo(() => {
        const facturables = ventas.filter(v => v.facturaAfip && v.estado !== RENDER_STATUS_ANULADA && v.estado !== RENDER_STATUS_PENDIENTE);
        const aprobadas = facturables.filter(v => v.afipCAE);
        const pendientes = facturables.filter(v => !v.afipCAE);
        return {
            pct: facturables.length > 0 ? (aprobadas.length / facturables.length) * 100 : null,
            aprobadas: aprobadas.length,
            pendientes: pendientes.length,
            listaPendientes: pendientes.slice(0, 5),
        };
    }, [ventas]);

    const color = pct === null ? STATUS.good : pct >= 95 ? STATUS.good : pct >= 80 ? STATUS.warning : STATUS.critical;

    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Cumplimiento Fiscal AFIP</h3>

            {pct === null ? (
                <p className="text-sm text-gray-400 italic py-6 text-center">Sin ventas facturables (AFIP) en este período.</p>
            ) : (
                <>
                    <div className="flex items-baseline gap-3 mb-4">
                        <span className="text-3xl font-extrabold" style={{ color }}>{pct.toFixed(0)}%</span>
                        <span className="text-xs font-medium text-gray-500">{aprobadas} con CAE · {pendientes} pendientes de {aprobadas + pendientes}</span>
                    </div>
                    {listaPendientes.length > 0 && (
                        <div className="border-t border-gray-100 pt-3 space-y-1.5">
                            <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Pendientes de CAE</p>
                            {listaPendientes.map((v) => (
                                <div key={v.id} className="flex justify-between text-xs">
                                    <span className="text-gray-600 truncate">{v.clienteNombre}</span>
                                    <span className="text-gray-400">{v.fecha.toLocaleDateString('es-AR')}</span>
                                </div>
                            ))}
                            {pendientes > listaPendientes.length && (
                                <p className="text-[11px] text-gray-400">+{pendientes - listaPendientes.length} más</p>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default PanelAfip;
