import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, RefreshCw, Printer } from 'lucide-react';
import { useFirestore } from '../../hooks/useFirestore';
import { useRangoFechas } from './hooks/useRangoFechas';
import { useVentasReporte } from './hooks/useVentasReporte';
import { useCobranzasGastos } from './hooks/useCobranzasGastos';
import { useComparativoPeriodo } from './hooks/useComparativoPeriodo';
import { useVisitasReporte } from './hooks/useVisitasReporte';
import KpiCard from './KpiCards';
import FiltrosPanel from './FiltrosPanel';
import VentasChart from './VentasChart';
import MixMedioPago from './MixMedioPago';
import TopProductosClientes from './TopProductosClientes';
import TablaMovimientos from './TablaMovimientos';
import ConversionVisitas from './ConversionVisitas';
import MermaReparto from './MermaReparto';
import PanelAfip from './PanelAfip';
import ExportMenu from './ExportMenu';
import { printReport } from './printTemplate';
import { useRanking } from './hooks/useRankingProductosClientes';
import { formatCurrency, calcularDeltaPercent } from './formatters';

const RENDER_STATUS_ANULADA = 'Anulada';
const RENDER_STATUS_DEVOLUCION = 'devolucion';

function ReporteGeneralShell() {
    const { tenantId, onTenantSnapshotFiltered } = useFirestore();
    const [activeTab, setActiveTab] = useState('ganancia');
    const [vendedores, setVendedores] = useState([]);
    const [zonas, setZonas] = useState([]);
    const [filtros, setFiltros] = useState({ vendedorId: '', zonaId: '', estado: '', metodoPago: '', busquedaCliente: '' });

    const { startDate, endDate, setStartDate, setEndDate, atajos, isRangoEnVivo } = useRangoFechas();
    const { ventas: ventasSinFiltrar, isLoading } = useVentasReporte({ tenantId, startDate, endDate, isRangoEnVivo });
    const { cobranzas, gastos } = useCobranzasGastos({ tenantId, startDate, endDate, isRangoEnVivo });
    const comparativo = useComparativoPeriodo({ tenantId, startDate, endDate });
    const { visitas } = useVisitasReporte({ tenantId, startDate, endDate });

    // --- CATÁLOGOS (vendedores/zonas) para filtros y resolución de nombres ---
    useEffect(() => {
        if (!tenantId) { setVendedores([]); setZonas([]); return; }
        const unsubVendedores = onTenantSnapshotFiltered('vendedores', (snap) => {
            setVendedores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubZonas = onTenantSnapshotFiltered('zonas', (snap) => {
            setZonas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => { unsubVendedores(); unsubZonas(); };
    }, [tenantId, onTenantSnapshotFiltered]);

    const vendedorNombrePorId = useMemo(() => {
        const map = new Map();
        vendedores.forEach(v => map.set(v.id, v.nombreCompleto));
        return map;
    }, [vendedores]);

    // Mismo patrón de fallback que usa Facturacion.jsx: si la venta no tiene
    // 'vendedorNombre' grabado (legacy), se resuelve por 'vendedorId' contra el catálogo.
    const resolverVendedorNombre = useCallback((venta) => {
        return venta.vendedorNombre || vendedorNombrePorId.get(venta.vendedorId) || null;
    }, [vendedorNombrePorId]);

    // --- FILTROS DE NEGOCIO (en memoria, sobre el rango ya acotado por fecha en el query) ---
    const ventas = useMemo(() => {
        const busqueda = filtros.busquedaCliente.trim().toLowerCase();
        return ventasSinFiltrar.filter((v) => {
            if (filtros.vendedorId && v.vendedorId !== filtros.vendedorId) return false;
            if (filtros.zonaId && v.clienteZonaId !== filtros.zonaId) return false;
            if (filtros.estado && v.estado !== filtros.estado) return false;
            if (filtros.metodoPago) {
                const campo = { Efectivo: 'pagoEfectivo', Transferencia: 'pagoTransferencia', Tarjeta: 'pagoTarjeta', QR: 'pagoQR', Point: 'pagoPoint' }[filtros.metodoPago];
                if (!(parseFloat(v[campo]) > 0)) return false;
            }
            if (busqueda && !(v.clienteNombre || '').toLowerCase().includes(busqueda)) return false;
            return true;
        });
    }, [ventasSinFiltrar, filtros]);

    // --- CÁLCULO DE MÉTRICAS (Ganancia devengada) ---
    const totals = useMemo(() => {
        return ventas.reduce((acc, v) => {
            const costo = v.totalCosto || 0;
            const venta = v.totalVenta || 0;
            const saldo = v.saldoPendiente || 0;

            if (v.tipo === RENDER_STATUS_DEVOLUCION) {
                acc.totalCostoDevoluciones += costo;
                acc.cantidadDevoluciones += 1;
            } else if (v.estado !== RENDER_STATUS_ANULADA) {
                acc.totalVenta += venta;
                acc.totalCosto += costo;
                acc.totalDeuda += saldo;
            }
            return acc;
        }, { totalVenta: 0, totalCosto: 0, totalDeuda: 0, totalCostoDevoluciones: 0, cantidadDevoluciones: 0 });
    }, [ventas]);

    const visitasFiltradas = useMemo(() => {
        if (!filtros.vendedorId) return visitas;
        return visitas.filter(v => v.vendedorId === filtros.vendedorId);
    }, [visitas, filtros.vendedorId]);

    const gananciaBruta = totals.totalVenta - totals.totalCosto - totals.totalCostoDevoluciones;
    const deltaVentas = calcularDeltaPercent(totals.totalVenta, comparativo.totalVenta);
    const deltaGanancia = calcularDeltaPercent(gananciaBruta, comparativo.gananciaBruta);

    // --- FLUJO DE EFECTIVO REAL (por método de pago y fecha real de cobro) ---
    const flujoEfectivo = useMemo(() => {
        const result = {
            porMetodo: { Efectivo: 0, Transferencia: 0, Tarjeta: 0, QR: 0, Point: 0 },
            totalIngresos: 0, totalEgresos: 0, movimientos: [],
        };

        ventas.forEach(v => {
            [
                ['Efectivo', v.pagoEfectivo], ['Transferencia', v.pagoTransferencia],
                ['Tarjeta', v.pagoTarjeta], ['QR', v.pagoQR], ['Point', v.pagoPoint],
            ].forEach(([metodo, monto]) => {
                const m = parseFloat(monto) || 0;
                if (m > 0) {
                    result.porMetodo[metodo] = (result.porMetodo[metodo] || 0) + m;
                    result.totalIngresos += m;
                    result.movimientos.push({ id: `${v.id}-${metodo}`, fecha: v.fecha, origen: v.clienteNombre || 'Cliente', tipo: 'Venta', metodo, monto: m });
                }
            });
        });

        cobranzas.forEach(c => {
            const monto = parseFloat(c.monto) || 0;
            if (monto > 0) {
                const metodo = c.metodoPago || 'Efectivo';
                result.porMetodo[metodo] = (result.porMetodo[metodo] || 0) + monto;
                result.totalIngresos += monto;
                result.movimientos.push({ id: c.id, fecha: c.fecha, origen: c.clienteNombre || 'Cliente', tipo: 'Cobro', metodo, monto });
            }
        });

        gastos.forEach(g => {
            const monto = parseFloat(g.monto) || 0;
            result.totalEgresos += monto;
            result.movimientos.push({ id: g.id, fecha: g.fecha, origen: g.detalle || 'Gasto', tipo: 'Egreso', metodo: g.metodoPago || 'Efectivo', monto: -monto });
        });

        result.movimientos.sort((a, b) => (b.fecha?.getTime?.() || 0) - (a.fecha?.getTime?.() || 0));
        result.saldoNeto = result.totalIngresos - result.totalEgresos;
        return result;
    }, [ventas, cobranzas, gastos]);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        const [year, month, day] = value.split('-').map(Number);
        if (name === 'startDate') setStartDate(new Date(year, month - 1, day, 0, 0, 0, 0));
        else if (name === 'endDate') setEndDate(new Date(year, month - 1, day, 23, 59, 59, 999));
    };

    const formatDateForInput = (date) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const { topProductos } = useRanking(ventas);

    const handlePrint = () => {
        printReport(startDate, endDate, { ...totals, gananciaBruta }, ventas.map(v => ({ ...v, vendedorNombre: resolverVendedorNombre(v) })), topProductos);
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen font-sans text-gray-800">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-wrap justify-between items-center mb-6 gap-3">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reporte General</h1>
                        <p className="text-gray-500 mt-1">Análisis financiero y operativo</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ExportMenu
                            startDate={startDate}
                            endDate={endDate}
                            totals={totals}
                            gananciaBruta={gananciaBruta}
                            ventas={ventas}
                            resolverVendedorNombre={resolverVendedorNombre}
                        />
                        <button onClick={handlePrint} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Imprimir Reporte">
                            <Printer className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <FiltrosPanel
                    vendedores={vendedores}
                    zonas={zonas}
                    filtros={filtros}
                    onFiltrosChange={setFiltros}
                    startDate={startDate}
                    endDate={endDate}
                    onDateChange={handleDateChange}
                    formatDateForInput={formatDateForInput}
                    atajos={atajos}
                />

                <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 w-fit">
                    <button onClick={() => setActiveTab('ganancia')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'ganancia' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        Ganancia (Operativo)
                    </button>
                    <button onClick={() => setActiveTab('flujo')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'flujo' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        Flujo de Efectivo
                    </button>
                </div>

                {activeTab === 'ganancia' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                            <KpiCard title="Total Ventas" value={formatCurrency(totals.totalVenta)} icon={<TrendingUp className="text-emerald-600" size={22} />} bgIcon="bg-emerald-100" borderColor="border-emerald-500" deltaPercent={deltaVentas} />
                            <KpiCard title="Ganancia Bruta" value={formatCurrency(gananciaBruta)} icon={<DollarSign className="text-blue-600" size={22} />} bgIcon="bg-blue-100" borderColor="border-blue-500" deltaPercent={deltaGanancia} />
                            <KpiCard title="Saldo Pendiente" value={formatCurrency(totals.totalDeuda)} icon={<CreditCard className="text-amber-600" size={22} />} bgIcon="bg-amber-100" borderColor="border-amber-500" />
                            <KpiCard title="Costo Devoluciones" value={formatCurrency(totals.totalCostoDevoluciones)} icon={<RefreshCw className="text-rose-600" size={22} />} bgIcon="bg-rose-100" borderColor="border-rose-500" subtext={`${totals.cantidadDevoluciones} devol.`} />
                            <KpiCard title="Costo Mercadería" value={formatCurrency(totals.totalCosto)} icon={<TrendingDown className="text-gray-600" size={22} />} bgIcon="bg-gray-100" borderColor="border-gray-400" />
                        </div>

                        <VentasChart ventas={ventas} />
                        <TopProductosClientes ventas={ventas} />

                        <div>
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Métricas Avanzadas · datos de campo (app Android)</h2>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                <ConversionVisitas visitas={visitasFiltradas} resolverNombreVendedor={(id) => vendedorNombrePorId.get(id)} />
                                <MermaReparto ventas={ventas} />
                                <PanelAfip ventas={ventas} />
                            </div>
                        </div>

                        <TablaMovimientos ventas={ventas} isLoading={isLoading} resolverVendedorNombre={resolverVendedorNombre} />
                    </div>
                )}

                {activeTab === 'flujo' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <KpiCard title="Total Ingresado" value={formatCurrency(flujoEfectivo.totalIngresos)} icon={<TrendingUp className="text-emerald-600" size={22} />} bgIcon="bg-emerald-100" borderColor="border-emerald-500" />
                            <KpiCard title="Total Egresos" value={formatCurrency(flujoEfectivo.totalEgresos)} icon={<TrendingDown className="text-rose-600" size={22} />} bgIcon="bg-rose-100" borderColor="border-rose-500" />
                            <KpiCard title="Saldo Neto de Caja" value={formatCurrency(flujoEfectivo.saldoNeto)} icon={<DollarSign className="text-blue-600" size={22} />} bgIcon="bg-blue-100" borderColor="border-blue-500" />
                        </div>

                        <MixMedioPago porMetodo={flujoEfectivo.porMetodo} />

                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-gray-800">Movimientos de Caja</h2>
                                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                                    {flujoEfectivo.movimientos.length} movimientos
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Origen</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Método</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {flujoEfectivo.movimientos.map((mov) => (
                                            <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{mov.fecha?.toLocaleDateString?.('es-AR')}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{mov.origen}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full ${
                                                        mov.tipo === 'Cobro' ? 'bg-violet-100 text-violet-800' :
                                                        mov.tipo === 'Egreso' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                                    }`}>
                                                        {mov.tipo}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{mov.metodo}</td>
                                                <td className={`px-6 py-4 text-right text-sm font-bold ${mov.monto < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(mov.monto)}</td>
                                            </tr>
                                        ))}
                                        {flujoEfectivo.movimientos.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">No hay movimientos de caja en este período.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReporteGeneralShell;
