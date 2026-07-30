import React, { useState, useMemo, useEffect } from 'react';
import Button from './Button';
import { useFirestore } from '../hooks/useFirestore';
// --- Iconos SVG (Estilo iOS) ---
const TrendingUp = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 6 13.5 15.5 10 12 1 21"></polyline><path d="M22 6h-6v6"/></svg>;
const TrendingDown = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>;
const DollarSign = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const CreditCard = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const RefreshCw = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const PrinterIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;

// --- Constantes ---
const RENDER_STATUS = {
    PAGADA: 'Pagada',
    ADEUDA: 'Adeuda',
    PENDIENTE: 'Pendiente de Entrega',
    REPARTIENDO: 'Repartiendo',
    ANULADA: 'Anulada',
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0);
};

// --- Función de Impresión ---
const printReport = (startDate, endDate, totals, ventas) => {
    const startStr = startDate.toLocaleDateString('es-AR');
    const endStr = endDate.toLocaleDateString('es-AR');
    
    const rows = ventas.map(v => `
        <tr>
            <td>${v.fecha.toLocaleDateString('es-AR')}</td>
            <td>${v.clienteNombre}</td>
            <td>${v.vendedorName || 'N/A'}</td>
            <td>${v.estado}</td>
            <td style="text-align:right">${formatCurrency(v.totalVenta)}</td>
            <td style="text-align:right; color:${v.saldoPendiente > 0 ? 'red' : 'black'}">${formatCurrency(v.saldoPendiente)}</td>
            <td style="text-align:right">${formatCurrency(v.totalVenta - (v.totalCosto || 0))}</td>
        </tr>
    `).join('');

    const html = `
    <html>
        <head>
            <title>Reporte General ${startStr} - ${endStr}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
                h1 { color: #111; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .metrics { display: flex; gap: 20px; margin-bottom: 30px; }
                .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; flex: 1; text-align: center; background: #f9fafb; }
                .card h3 { margin: 0 0 5px 0; font-size: 14px; color: #666; text-transform: uppercase; }
                .card p { margin: 0; font-size: 24px; font-weight: bold; color: #333; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
                th { background: #f3f4f6; font-weight: 600; }
                tr:nth-child(even) { background: #f9fafb; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>Reporte General de Ventas</h1>
                    <p>Período: ${startStr} al ${endStr}</p>
                </div>
                <div style="text-align:right">
                    <p>Generado el: ${new Date().toLocaleString('es-AR')}</p>
                </div>
            </div>

            <div class="metrics">
                <div class="card"><h3>Total Ventas</h3><p>${formatCurrency(totals.totalVenta)}</p></div>
                <div class="card"><h3>Ganancia Bruta</h3><p style="color:green">${formatCurrency(totals.gananciaBruta)}</p></div>
                <div class="card"><h3>Deuda</h3><p style="color:orange">${formatCurrency(totals.totalDeuda)}</p></div>
                <div class="card"><h3>Costo Mercadería</h3><p>${formatCurrency(totals.totalCosto)}</p></div>
            </div>

            <table>
                <thead>
                    <tr><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Estado</th><th style="text-align:right">Total</th><th style="text-align:right">Deuda</th><th style="text-align:right">Ganancia</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </body>
    </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
};

function ReporteGeneral() {
    const [ventas, setVentas] = useState([]);
    const [cobranzas, setCobranzas] = useState([]);
    const [gastos, setGastos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ganancia'); // 'ganancia' (devengado) | 'flujo' (caja real)

    // Fechas iniciales (Local Timezone)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d;
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date(); d.setHours(23, 59, 59, 999); return d;
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);

    // --- CÁLCULO DE MÉTRICAS (Usando useMemo) ---
    // IMPORTANTE: esto es GANANCIA DEVENGADA (por fecha real de venta). Los cobros de
    // saldo pendiente NUNCA suman acá: ya se contaron como ganancia el día de la venta.
    // El dinero que efectivamente entra por cobros se ve en la pestaña "Flujo de Efectivo".
    const totals = useMemo(() => {
        return ventas.reduce((acc, v) => {
            const costo = v.totalCosto || 0;
            const venta = v.totalVenta || 0;
            const saldo = v.saldoPendiente || 0;

            if (v.tipo === 'devolucion') {
                acc.totalCostoDevoluciones += costo;
                acc.cantidadDevoluciones += 1;
            } else if (v.estado !== RENDER_STATUS.ANULADA) {
                acc.totalVenta += venta;
                acc.totalCosto += costo;
                acc.totalDeuda += saldo;
            }
            return acc;
        }, {
            totalVenta: 0, totalCosto: 0, totalDeuda: 0, totalCostoDevoluciones: 0, cantidadDevoluciones: 0
        });
    }, [ventas]);

    const gananciaBruta = totals.totalVenta - totals.totalCosto - totals.totalCostoDevoluciones;

    const { tenantId, onTenantSnapshot } = useFirestore();

    // --- CARGA DE VENTAS (Filtrado por Tenant y Fecha REAL de venta) ---
    useEffect(() => {
        if (!tenantId) {
            setVentas([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // Usamos onTenantSnapshot para inyectar automáticamente el filtro de companyId
        const unsubscribe = onTenantSnapshot('ventas', (querySnapshot) => {
            const ventasData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();

                // Ganancia = devengado: SIEMPRE la fecha real de la venta. Nunca la fecha
                // del último pago, para que un cobro posterior no haga "reaparecer" la
                // venta completa (con su totalVenta íntegro) en el reporte del día de hoy.
                const fechaVenta = data.fecha ? data.fecha.toDate() : null;

                if (fechaVenta) {
                    // Filtro de fecha (Local comparison)
                    if (fechaVenta >= startDate && fechaVenta <= endDate) {

                        // FILTRO CLAVE: Solo mostrar si hubo movimiento real (No Pendientes puros sin pago)
                        // Si es 'Pendiente de Entrega' y NO tiene pagos parciales, lo ignoramos (es una venta futura/planificada).
                        const tienePagos = (data.pagoEfectivo > 0 || data.pagoTransferencia > 0);
                        const esPendientePuro = data.estado === RENDER_STATUS.PENDIENTE && !tienePagos;

                        // Compatibilidad hacia atrás: si quedó algún cobro viejo escrito
                        // dentro de "ventas" (antes de separar la colección cobranzas),
                        // lo excluimos para que no ensucie el reporte de ganancia. El chequeo
                        // por 'ventaOriginalId' cubre además los legacy que quedaron sin 'tipo'
                        // seteado: una venta real nunca referencia a otra venta como "original".
                        const esCobroLegacy = data.tipo === 'cobranza' || data.tipo === 'cobro' || !!data.ventaOriginalId;

                        if (!esPendientePuro && !esCobroLegacy) {
                            ventasData.push({
                                id: doc.id,
                                ...data,
                                fecha: fechaVenta,
                            });
                        }
                    }
                }
            });

            setVentas(ventasData);
            setCurrentPage(1);
            setIsLoading(false);
        }, [{ field: "fecha", direction: "desc" }]); // Orden por fecha desc

        return () => unsubscribe();
    }, [startDate, endDate, tenantId]);

    // --- CARGA DE COBRANZAS Y GASTOS (Para Flujo de Efectivo real) ---
    useEffect(() => {
        if (!tenantId) {
            setCobranzas([]);
            setGastos([]);
            return;
        }

        const unsubCobranzas = onTenantSnapshot('cobranzas', (querySnapshot) => {
            const data = [];
            querySnapshot.forEach((doc) => {
                const d = doc.data();
                const fecha = d.fecha ? d.fecha.toDate() : null;
                if (fecha && fecha >= startDate && fecha <= endDate) {
                    data.push({ id: doc.id, ...d, fecha });
                }
            });
            setCobranzas(data);
        }, [{ field: 'fecha', direction: 'desc' }]);

        const unsubGastos = onTenantSnapshot('gastos', (querySnapshot) => {
            const data = [];
            querySnapshot.forEach((doc) => {
                const d = doc.data();
                const fecha = d.fechaGasto ? d.fechaGasto.toDate() : (d.fecha ? d.fecha.toDate() : null);
                if (fecha && fecha >= startDate && fecha <= endDate) {
                    data.push({ id: doc.id, ...d, fecha });
                }
            });
            setGastos(data);
        }, [{ field: 'fechaGasto', direction: 'desc' }]);

        return () => { unsubCobranzas(); unsubGastos(); };
    }, [startDate, endDate, tenantId]);

    // --- FLUJO DE EFECTIVO REAL (por método de pago y fecha real de cobro) ---
    const flujoEfectivo = useMemo(() => {
        const result = {
            porMetodo: { Efectivo: 0, Transferencia: 0, Tarjeta: 0, QR: 0, Point: 0 },
            totalIngresos: 0,
            totalEgresos: 0,
            movimientos: [],
        };

        // Pagos recibidos en el momento mismo de la venta/entrega
        ventas.forEach(v => {
            [
                ['Efectivo', v.pagoEfectivo],
                ['Transferencia', v.pagoTransferencia],
                ['Tarjeta', v.pagoTarjeta],
                ['QR', v.pagoQR],
                ['Point', v.pagoPoint],
            ].forEach(([metodo, monto]) => {
                const m = parseFloat(monto) || 0;
                if (m > 0) {
                    result.porMetodo[metodo] = (result.porMetodo[metodo] || 0) + m;
                    result.totalIngresos += m;
                    result.movimientos.push({
                        id: `${v.id}-${metodo}`, fecha: v.fecha,
                        origen: v.clienteNombre || v.clientName || 'Cliente',
                        tipo: 'Venta', metodo, monto: m,
                    });
                }
            });
        });

        // Cobros de saldo pendiente (colección separada, no duplican ganancia)
        cobranzas.forEach(c => {
            const monto = parseFloat(c.monto) || 0;
            if (monto > 0) {
                const metodo = c.metodoPago || 'Efectivo';
                result.porMetodo[metodo] = (result.porMetodo[metodo] || 0) + monto;
                result.totalIngresos += monto;
                result.movimientos.push({
                    id: c.id, fecha: c.fecha, origen: c.clienteNombre || 'Cliente',
                    tipo: 'Cobro', metodo, monto,
                });
            }
        });

        // Egresos (gastos de caja)
        gastos.forEach(g => {
            const monto = parseFloat(g.monto) || 0;
            result.totalEgresos += monto;
            result.movimientos.push({
                id: g.id, fecha: g.fecha, origen: g.detalle || 'Gasto',
                tipo: 'Egreso', metodo: g.metodoPago || 'Efectivo', monto: -monto,
            });
        });

        result.movimientos.sort((a, b) => (b.fecha?.getTime?.() || 0) - (a.fecha?.getTime?.() || 0));
        result.saldoNeto = result.totalIngresos - result.totalEgresos;

        return result;
    }, [ventas, cobranzas, gastos]);


    // --- Paginación ---
    const { paginatedVentas, totalPages } = useMemo(() => {
        const total = ventas.length;
        const totalP = Math.ceil(total / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return { paginatedVentas: ventas.slice(start, end), totalPages: totalP };
    }, [ventas, currentPage, itemsPerPage]);

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        const [year, month, day] = value.split('-').map(Number);
        
        if (name === 'startDate') {
            const d = new Date(year, month - 1, day, 0, 0, 0, 0);
            setStartDate(d);
        } else if (name === 'endDate') {
            const d = new Date(year, month - 1, day, 23, 59, 59, 999);
            setEndDate(d);
        }
    };

    const formatDateForInput = (date) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen font-sans text-gray-800">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-wrap justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reporte General</h1>
                        <p className="text-gray-500 mt-1">Análisis financiero y operativo</p>
                    </div>
                    
                    {/* Controles */}
                    <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 px-2">
                            <label htmlFor="startDate" className="text-xs font-bold text-gray-500 uppercase">Desde</label>
                            <input type="date" name="startDate" id="startDate" value={formatDateForInput(startDate)} onChange={handleDateChange} className="text-sm font-bold text-indigo-700 outline-none bg-transparent cursor-pointer"/>
                        </div>
                        <div className="w-px h-6 bg-gray-200"></div>
                        <div className="flex items-center gap-2 px-2">
                            <label htmlFor="endDate" className="text-xs font-bold text-gray-500 uppercase">Hasta</label>
                            <input type="date" name="endDate" id="endDate" value={formatDateForInput(endDate)} onChange={handleDateChange} className="text-sm font-bold text-indigo-700 outline-none bg-transparent cursor-pointer"/>
                        </div>
                        <button onClick={() => printReport(startDate, endDate, {...totals, gananciaBruta}, ventas)} className="ml-2 p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors" title="Imprimir Reporte">
                            <PrinterIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </header>

                {/* Tabs: Ganancia (devengado) vs Flujo de Efectivo (caja real) */}
                <div className="flex gap-2 mb-6 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 w-fit">
                    <button
                        onClick={() => setActiveTab('ganancia')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'ganancia' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        Ganancia (Operativo)
                    </button>
                    <button
                        onClick={() => setActiveTab('flujo')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'flujo' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        Flujo de Efectivo
                    </button>
                </div>

                {activeTab === 'ganancia' && (
                <>
                {/* Tarjetas de Resumen (Estilo iOS Glassy) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">

                    <MetricCard 
                        title="Total Ventas" 
                        value={formatCurrency(totals.totalVenta)} 
                        icon={<TrendingUp className="text-emerald-600"/>} 
                        bgIcon="bg-emerald-100"
                        borderColor="border-emerald-500"
                    />

                    <MetricCard 
                        title="Ganancia Bruta" 
                        value={formatCurrency(gananciaBruta)} 
                        icon={<DollarSign className="text-blue-600"/>} 
                        bgIcon="bg-blue-100"
                        borderColor="border-blue-500"
                    />

                    <MetricCard 
                        title="Saldo Pendiente" 
                        value={formatCurrency(totals.totalDeuda)} 
                        icon={<CreditCard className="text-amber-600"/>} 
                        bgIcon="bg-amber-100"
                        borderColor="border-amber-500"
                    />

                    <MetricCard 
                        title="Costo Devoluciones" 
                        value={formatCurrency(totals.totalCostoDevoluciones)} 
                        icon={<RefreshCw className="text-rose-600"/>} 
                        bgIcon="bg-rose-100"
                        borderColor="border-rose-500"
                        subtext={`${totals.cantidadDevoluciones} devol.`}
                    />
                    
                    <MetricCard 
                        title="Costo Mercadería" 
                        value={formatCurrency(totals.totalCosto)} 
                        icon={<TrendingDown className="text-gray-600"/>} 
                        bgIcon="bg-gray-100"
                        borderColor="border-gray-400"
                    />
                </div>

                {/* Tabla de Ventas */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">Movimientos Detallados</h2>
                        <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                            {ventas.length} registros encontrados
                        </span>
                    </div>
                    
                    {isLoading ? (
                        <div className="p-10 text-center text-gray-400 animate-pulse">Cargando datos...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha Movimiento</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vendedor</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Deuda</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ganancia</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {paginatedVentas.map((venta) => (
                                        <tr key={venta.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                                {venta.fecha.toLocaleDateString('es-AR')}
                                                <div className="text-[10px] text-gray-400">{venta.fecha.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{venta.clienteNombre}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{venta.vendedorName || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full ${
                                                    venta.tipo === 'devolucion' ? 'bg-rose-100 text-rose-800' :
                                                    venta.estado === RENDER_STATUS.PAGADA ? 'bg-emerald-100 text-emerald-800' :
                                                    venta.estado === RENDER_STATUS.ADEUDA ? 'bg-amber-100 text-amber-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {venta.tipo === 'devolucion' ? 'Devolución' : venta.estado}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-gray-800">{formatCurrency(venta.totalVenta)}</td>
                                            <td className={`px-6 py-4 text-right text-sm font-bold ${venta.saldoPendiente > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                                {formatCurrency(venta.saldoPendiente)}
                                            </td>
                                            <td className={`px-6 py-4 text-right text-sm font-bold ${(venta.totalVenta - venta.totalCosto) > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                {formatCurrency(venta.totalVenta - (venta.totalCosto || 0))}
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedVentas.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">
                                                No hay movimientos registrados en este período.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 shadow-sm">
                                Anterior
                            </button>
                            <span className="text-sm font-medium text-gray-600">Página {currentPage} de {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 shadow-sm">
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>
                </>
                )}

                {activeTab === 'flujo' && (
                <>
                {/* Tarjetas de Resumen: Flujo de Efectivo REAL (por método de pago) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                    <MetricCard
                        title="Total Ingresado"
                        value={formatCurrency(flujoEfectivo.totalIngresos)}
                        icon={<TrendingUp className="text-emerald-600"/>}
                        bgIcon="bg-emerald-100"
                        borderColor="border-emerald-500"
                    />
                    <MetricCard
                        title="Total Egresos"
                        value={formatCurrency(flujoEfectivo.totalEgresos)}
                        icon={<TrendingDown className="text-rose-600"/>}
                        bgIcon="bg-rose-100"
                        borderColor="border-rose-500"
                    />
                    <MetricCard
                        title="Saldo Neto de Caja"
                        value={formatCurrency(flujoEfectivo.saldoNeto)}
                        icon={<DollarSign className="text-blue-600"/>}
                        bgIcon="bg-blue-100"
                        borderColor="border-blue-500"
                    />
                    <MetricCard
                        title="Efectivo"
                        value={formatCurrency(flujoEfectivo.porMetodo.Efectivo)}
                        icon={<DollarSign className="text-amber-600"/>}
                        bgIcon="bg-amber-100"
                        borderColor="border-amber-500"
                    />
                    <MetricCard
                        title="Transferencia"
                        value={formatCurrency(flujoEfectivo.porMetodo.Transferencia)}
                        icon={<RefreshCw className="text-sky-600"/>}
                        bgIcon="bg-sky-100"
                        borderColor="border-sky-500"
                    />
                    <MetricCard
                        title="Tarjeta / QR / Point"
                        value={formatCurrency(flujoEfectivo.porMetodo.Tarjeta + flujoEfectivo.porMetodo.QR + flujoEfectivo.porMetodo.Point)}
                        icon={<CreditCard className="text-violet-600"/>}
                        bgIcon="bg-violet-100"
                        borderColor="border-violet-500"
                    />
                </div>

                {/* Tabla de Movimientos de Caja */}
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                            {mov.fecha?.toLocaleDateString?.('es-AR')}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">{mov.origen}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full ${
                                                mov.tipo === 'Cobro' ? 'bg-violet-100 text-violet-800' :
                                                mov.tipo === 'Egreso' ? 'bg-rose-100 text-rose-800' :
                                                'bg-emerald-100 text-emerald-800'
                                            }`}>
                                                {mov.tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{mov.metodo}</td>
                                        <td className={`px-6 py-4 text-right text-sm font-bold ${mov.monto < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {formatCurrency(mov.monto)}
                                        </td>
                                    </tr>
                                ))}
                                {flujoEfectivo.movimientos.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">
                                            No hay movimientos de caja en este período.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                </>
                )}
            </div>
        </div>
    );
}

// --- Componente Auxiliar UI ---
const MetricCard = ({ title, value, icon, bgIcon, borderColor, subtext }) => (
    <div className={`bg-white p-5 rounded-2xl shadow-md border-l-4 ${borderColor} flex flex-col justify-between h-full transition-transform hover:scale-[1.02]`}>
        <div className="flex items-start gap-4"> 
            <div className={`p-2.5 rounded-xl ${bgIcon}`}>{icon}</div>
            <div className="min-w-0 flex-1"> 
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{title}</p>
            </div>
        </div>
        <div className="mt-4">
            <p className="text-2xl font-extrabold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{value}</p>
            {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
    </div>
);

export default ReporteGeneral;