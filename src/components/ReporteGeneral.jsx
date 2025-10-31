import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../firebase.js'; 
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';

// --- Iconos SVG (Internos) ---
const TrendingUp = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 6 13.5 15.5 10 12 1 21"></polyline><path d="M22 6h-6v6"/></svg>;
const TrendingDown = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>;
const DollarSign = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const FileText = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M10 10h5"/><path d="M10 14h5"/><path d="M10 18h3"/></svg>;
const Calendar = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const ReportIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="12" y1="9" x2="12.01" y2="9"/></svg>;
const AlertCircle = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

// --- Constantes de Estado ---
const RENDER_STATUS = {
    PAGADA: 'Pagada',
    ADEUDA: 'Adeuda',
    ANULADA: 'Anulada',
    PENDIENTE: 'Pendiente de Pago',
    REPARTIENDO: 'Repartiendo'
};

// --- Funciones de Formato y Cálculo ---
const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

// --- Componente Principal ---
const ReporteGeneral = () => {
    const [ventas, setVentas] = useState([]);
    const [gastos, setGastos] = useState([]); 
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('Diario'); 
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showDetail, setShowDetail] = useState(false); 

    // --- Carga de Datos ---
    useEffect(() => {
        const unsubscribeVentas = onSnapshot(query(collection(db, 'ventas'), orderBy('fecha', 'desc')), (snapshot) => {
            setVentas(snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                fecha: doc.data().fecha ? doc.data().fecha.toDate() : new Date(0) 
            })));
        }, (err) => { console.error("Error cargando ventas:", err); setError("Error al cargar datos de ventas."); });

        // --- LISTENER PARA GASTOS ---
        const unsubscribeGastos = onSnapshot(query(collection(db, 'gastos'), orderBy('fechaGasto', 'desc')), (snapshot) => {
            setGastos(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                fecha: doc.data().fechaGasto ? doc.data().fechaGasto.toDate() : new Date(0)
            })));
        }, (err) => { console.error("Error cargando gastos:", err); setError("Error al cargar datos de gastos."); });

        return () => {
            unsubscribeVentas();
            unsubscribeGastos();
        };
    }, []);


    // --- Lógica de Agregación y Cálculo Gerencial (ACTUALIZADA con Margen Bruto) ---
    const reportMetrics = useMemo(() => {
        let filteredVentas = ventas.filter(v => v.estado !== RENDER_STATUS.ANULADA); 
        let filteredGastos = gastos;

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start) {
            start.setHours(0, 0, 0, 0);
            filteredVentas = filteredVentas.filter(v => v.fecha >= start);
            filteredGastos = filteredGastos.filter(g => g.fecha >= start); 
        }
        if (end) {
            end.setHours(23, 59, 59, 999);
            filteredVentas = filteredVentas.filter(v => v.fecha <= end);
            filteredGastos = filteredGastos.filter(g => g.fecha <= end); 
        }
        
        const totalVenta = filteredVentas.reduce((sum, v) => sum + (v.totalVenta || 0), 0);
        const totalCosto = filteredVentas.reduce((sum, v) => sum + (v.totalCosto || 0), 0);
        const totalSaldoPendiente = filteredVentas.reduce((sum, v) => sum + (v.saldoPendiente || 0), 0);
        const totalGastos = filteredGastos.reduce((sum, g) => sum + (g.monto || 0), 0);

        // NUEVO: Margen Bruto (Venta Bruta - Costo de Mercadería)
        const totalGrossProfit = totalVenta - totalCosto;

        // La ganancia neta (resultado final)
        const totalNetProfit = totalGrossProfit - totalGastos;
        
        return {
            totalVenta,
            totalCosto,
            totalGrossProfit, // <-- AÑADIDO
            totalNetProfit,
            totalGastos,
            totalSaldoPendiente,
            ventasDetalle: filteredVentas
        };

    }, [ventas, gastos, startDate, endDate]);
    
    // --- Lógica de Impresión de Resumen (ACTUALIZADA) ---
    const handlePrintSummary = () => {
        // Se extrae totalGrossProfit de reportMetrics
        const { totalVenta, totalNetProfit, totalSaldoPendiente, totalCosto, totalGastos, totalGrossProfit } = reportMetrics; 
        const dateRange = startDate && endDate 
            ? `Del ${new Date(startDate).toLocaleDateString('es-AR', {timeZone: 'UTC'})} al ${new Date(endDate).toLocaleDateString('es-AR', {timeZone: 'UTC'})}` 
            : 'Acumulado Total';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html><head><title>Informe Gerencial: ${dateRange}</title><style>
                body {font-family: Arial, sans-serif; margin: 0; padding: 25px; font-size: 11pt; color: #333;}
                .summary-box {width: 100%; max-width: 700px; margin: 0; border: 1px solid #ddd; padding: 20px; border-radius: 8px;}
                .metric {display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #eee;}
                .metric:last-of-type {border-bottom: none;}
                h2 {margin-top: 0; padding-bottom: 10px; border-bottom: 2px solid #333;}
                .highlight {font-weight: bold; font-size: 14pt;}
                .notes {margin-top: 20px; font-size: 9pt; color: #888;}
            </style></head>
            <body>
                <div class="summary-box">
                    <h2>Informe General de Finanzas</h2>
                    <p style="margin-bottom: 20px;"><strong>Período:</strong> ${dateRange}</p>
                    <div class="metric">
                        <span>VENTA TOTAL BRUTA (Facturado)</span>
                        <span class="highlight">${formatCurrency(totalVenta)}</span>
                    </div>
                    <div class="metric">
                        <span>(-) COSTO TOTAL DE VENTA</span>
                        <span>-${formatCurrency(totalCosto)}</span>
                    </div>
                    <div class="metric" style="border-bottom: 2px solid #bbb;">
                        <span class="highlight" style="color: #4B5563;">MARGEN BRUTO (Venta - Costo)</span>
                        <span class="highlight">${formatCurrency(totalGrossProfit)}</span>
                    </div>
                    <div class="metric" style="border-top: 1px dashed #ccc;">
                        <span>(-) GASTOS OPERACIONALES</span>
                        <span>-${formatCurrency(totalGastos)}</span>
                    </div>
                    <div class="metric">
                        <strong>GANANCIA NETA FINAL</strong>
                        <strong class="highlight" style="color: #10B981;">${formatCurrency(totalNetProfit)}</strong>
                    </div>
                    <div style="border-top: 1px solid #333; padding-top: 15px; margin-top: 15px;">
                        <div class="metric">
                            <span style="font-size: 12pt;">DEUDA GLOBAL PENDIENTE (Cuentas por Cobrar)</span>
                            <span class="highlight" style="color: #DC3545;">${formatCurrency(totalSaldoPendiente)}</span>
                        </div>
                    </div>
                    <div class="notes">Informe generado el: ${new Date().toLocaleDateString('es-AR')}.</div>
                </div>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // --- Componentes UI ---
    const KPICard = ({ title, value, icon: Icon, color, delay }) => (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in" style={{ animationDelay: `${delay * 100}ms` }}>
            <div className="flex justify-between items-start">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
                <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>
                    <Icon size={20} />
                </div>
            </div>
            <p className={`mt-4 text-3xl font-extrabold text-gray-800`}>
                {formatCurrency(value)}
            </p>
        </div>
    );

    return (
        <div className="p-4 sm:p-8 bg-gray-50 min-h-screen font-sans">
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; opacity: 0; }
            `}</style>

            <h1 className="text-3xl font-bold text-gray-900 mb-6">
                <ReportIcon className="inline-block mr-2 align-text-bottom"/> Reporte General de Finanzas
            </h1>
            <p className="text-gray-600 mb-8">
                Panel de control ejecutivo consolidado. (Mostrando ventas no anuladas).
            </p>

            <div className="bg-white p-4 rounded-xl shadow-lg mb-6 flex flex-wrap gap-4 items-end justify-between">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="min-w-[150px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Calendar className="mr-1"/> Fecha Inicio</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500"/>
                    </div>
                    <div className="min-w-[150px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Calendar className="mr-1"/> Fecha Fin</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500"/>
                    </div>
                    <button onClick={() => { setStartDate(''); setEndDate(''); setError(null); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Limpiar Fechas</button>
                </div>
                <button onClick={handlePrintSummary} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
                    <FileText className="mr-2"/> Imprimir Resumen
                </button>
            </div>

            {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-lg animate-fade-in">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
                <KPICard title="Venta Total Bruta" value={reportMetrics.totalVenta} icon={DollarSign} color="blue" delay={0}/>
                <KPICard title="Costo de Mercadería" value={reportMetrics.totalCosto} icon={DollarSign} color="gray" delay={1}/>
                {/* NUEVA TARJETA: Margen Bruto */}
                <KPICard title="Ganancia Bruta (Venta-Costo)" value={reportMetrics.totalGrossProfit} icon={TrendingUp} color="yellow" delay={2} /> 
                <KPICard title="Gastos Operacionales" value={reportMetrics.totalGastos} icon={TrendingDown} color="orange" delay={3} />
                <KPICard title="Ganancia Neta (Final)" value={reportMetrics.totalNetProfit} icon={TrendingUp} color="green" delay={4} />
                <KPICard title="Deuda Global (Pendiente)" value={reportMetrics.totalSaldoPendiente} icon={AlertCircle} color="red" delay={5}/>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Desglose de Ventas en Período</h2>
                    <button onClick={() => setShowDetail(!showDetail)} className="px-4 py-1 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors">{showDetail ? 'Ocultar Detalle' : 'Mostrar Detalle'}</button>
                </div>
                {showDetail && (
                    <div className="overflow-x-auto animate-fade-in">
                        <table className="min-w-full text-sm divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase"># Factura</th>
                                    <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Fecha</th>
                                    <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Vendedor</th>
                                    <th className="px-6 py-3 font-semibold text-center text-gray-600 uppercase">Estado</th>
                                    <th className="px-6 py-3 font-semibold text-right text-gray-600 uppercase">Venta Total</th>
                                    <th className="px-6 py-3 font-semibold text-right text-red-600 uppercase">Saldo Pendiente</th>
                                    <th className="px-6 py-3 font-semibold text-right text-green-600 uppercase">Ganancia Bruta (Venta-Costo)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reportMetrics.ventasDetalle.map(venta => (
                                    <tr key={venta.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-gray-600">#{venta.numeroFactura}</td>
                                        <td className="px-6 py-4 text-gray-800">{venta.fecha.toLocaleDateString('es-AR')}</td>
                                        <td className="px-6 py-4 text-gray-600">{venta.vendedorNombre}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                                                venta.estado === RENDER_STATUS.PAGADA ? 'bg-green-100 text-green-800' :
                                                venta.estado === RENDER_STATUS.ADEUDA ? 'bg-yellow-100 text-yellow-800' :
                                                venta.estado === RENDER_STATUS.REPARTIENDO ? 'bg-indigo-100 text-indigo-800' :
                                                venta.estado === RENDER_STATUS.PENDIENTE ? 'bg-gray-200 text-gray-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {venta.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">{formatCurrency(venta.totalVenta)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-red-700">{formatCurrency(venta.saldoPendiente)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-700">{formatCurrency(venta.totalVenta - venta.totalCosto)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReporteGeneral;