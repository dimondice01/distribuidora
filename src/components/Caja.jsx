import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';

// --- Iconografía ---
const CashIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><circle cx="12" cy="12" r="4"></circle><path d="M4 12h.01"></path><path d="M20 12h.01"></path></svg>;
const CreditCardIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const ArrowUpIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>;
const ArrowDownIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>;
const PrinterIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

const generateCashFlowReportHTML = (date, ingresosEfectivo, ingresosTransferencia, gastosEfectivo, gastosTransferencia, saldoAnterior, resumen) => {
    const ingresosEfectivoRows = ingresosEfectivo.map(v => `<tr><td>${v.clientName || v.clienteNombre}</td><td>${v.estado}</td><td style="text-align:right;">${formatCurrency(v.pagoEfectivo)}</td></tr>`).join('');
    const ingresosTransferenciaRows = ingresosTransferencia.map(v => `<tr><td>${v.clientName || v.clienteNombre}</td><td>${v.estado}</td><td style="text-align:right;">${formatCurrency(v.pagoTransferencia)}</td></tr>`).join('');
    const gastosEfectivoRows = gastosEfectivo.map(g => `<tr><td>${g.detalle}</td><td style="text-align:right;">${formatCurrency(g.monto)}</td></tr>`).join('');
    const gastosTransferenciaRows = gastosTransferencia.map(g => `<tr><td>${g.detalle}</td><td style="text-align:right;">${formatCurrency(g.monto)}</td></tr>`).join('');
    
    return `
    <html><head><title>Reporte de Caja - ${date}</title><style>body{font-family: Arial, sans-serif; margin: 20px;} h1, h2{color: #333;} table{width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px;} th, td{padding: 8px; border: 1px solid #ddd; text-align: left;} thead{background-color: #f2f2f2;} .summary{width: 50%; float: right;} .summary td{font-size: 1.1em;}</style></head>
    <body>
        <h1>Reporte de Flujo de Caja</h1>
        <h2>Fecha: ${date}</h2><hr/>
        <h3>Ingresos en Efectivo</h3>
        <table><thead><tr><th>Cliente</th><th>Estado</th><th style="text-align:right;">Monto</th></tr></thead><tbody>${ingresosEfectivoRows.length > 0 ? ingresosEfectivoRows : '<tr><td colspan="3">No hubo ingresos en efectivo.</td></tr>'}</tbody></table>
        <h3>Ingresos por Transferencia</h3>
        <table><thead><tr><th>Cliente</th><th>Estado</th><th style="text-align:right;">Monto</th></tr></thead><tbody>${ingresosTransferenciaRows.length > 0 ? ingresosTransferenciaRows : '<tr><td colspan="3">No hubo ingresos por transferencia.</td></tr>'}</tbody></table>
        <h3>Gastos en Efectivo</h3>
        <table><thead><tr><th>Detalle</th><th style="text-align:right;">Monto</th></tr></thead><tbody>${gastosEfectivoRows.length > 0 ? gastosEfectivoRows : '<tr><td colspan="2">No hubo gastos en efectivo.</td></tr>'}</tbody></table>
        <h3>Gastos por Transferencia</h3>
        <table><thead><tr><th>Detalle</th><th style="text-align:right;">Monto</th></tr></thead><tbody>${gastosTransferenciaRows.length > 0 ? gastosTransferenciaRows : '<tr><td colspan="2">No hubo gastos por transferencia.</td></tr>'}</tbody></table>
        <hr/>
        <table class="summary">
            <tr><td>Saldo Anterior (Efectivo):</td><td style="text-align:right;">${formatCurrency(saldoAnterior)}</td></tr>
            <tr><td>(+) Ingresos en Efectivo:</td><td style="text-align:right;">${formatCurrency(resumen.totalEfectivo)}</td></tr>
            <tr><td>(-) Gastos en Efectivo:</td><td style="text-align:right;">-${formatCurrency(resumen.totalGastosEfectivo)}</td></tr>
            <tr style="font-weight: bold; font-size: 1.2em; border-top: 2px solid #333;"><td>Saldo Final Esperado en Caja:</td><td style="text-align:right;">${formatCurrency(resumen.balanceNetoEfectivo)}</td></tr>
            <tr style="font-size: 1em; border-top: 1px dashed #ccc;"><td style="padding-top: 15px;">Monto total Transferencia:</td><td style="text-align:right; padding-top: 15px;">${formatCurrency(resumen.totalTransferencia - resumen.totalGastosTransferencia)}</td></tr>
        </table>
    </body></html>`;
};

const printHTML = (htmlContent) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};

function Caja() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [ventasDia, setVentasDia] = useState([]);
    const [gastosDia, setGastosDia] = useState([]);
    const [saldoAnterior, setSaldoAnterior] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const year = selectedDate.getFullYear(); const month = selectedDate.getMonth(); const day = selectedDate.getDate();
        const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        const startOfDayTimestamp = Timestamp.fromDate(startOfDay); const endOfDayTimestamp = Timestamp.fromDate(endOfDay);
        const ventasQuery = query(collection(db, 'ventas'), where('fecha', '>=', startOfDayTimestamp), where('fecha', '<=', endOfDayTimestamp));
        const gastosQuery = query(collection(db, 'gastos'), where('fechaGasto', '>=', startOfDayTimestamp), where('fechaGasto', '<=', endOfDayTimestamp));
        let ventasLoaded = false; let gastosLoaded = false;
        const checkLoading = () => { if (ventasLoaded && gastosLoaded) setLoading(false); };
        const unsubVentas = onSnapshot(ventasQuery, (snapshot) => { setVentasDia(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); ventasLoaded = true; checkLoading(); }, (error) => { console.error("Error al cargar ventas:", error); ventasLoaded = true; checkLoading(); });
        const unsubGastos = onSnapshot(gastosQuery, (snapshot) => { setGastosDia(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); gastosLoaded = true; checkLoading(); }, (error) => { console.error("Error al cargar gastos:", error); gastosLoaded = true; checkLoading(); });
        return () => { unsubVentas(); unsubGastos(); };
    }, [selectedDate]);

    const resumen = useMemo(() => {
        const totalEfectivo = ventasDia.reduce((sum, v) => sum + (v.pagoEfectivo || 0), 0);
        const totalTransferencia = ventasDia.reduce((sum, v) => sum + (v.pagoTransferencia || 0), 0);
        
        // --- CORRECCIÓN: Los gastos sin método de pago se asumen como efectivo ---
        const totalGastosEfectivo = gastosDia.filter(g => g.metodoPago === 'Efectivo' || !g.metodoPago).reduce((sum, g) => sum + (g.monto || 0), 0);
        const totalGastosTransferencia = gastosDia.filter(g => g.metodoPago === 'Transferencia').reduce((sum, g) => sum + (g.monto || 0), 0);

        const totalGastos = totalGastosEfectivo + totalGastosTransferencia;
        const balanceNetoEfectivo = saldoAnterior + totalEfectivo - totalGastosEfectivo;
        
        return { totalEfectivo, totalTransferencia, totalGastosEfectivo, totalGastosTransferencia, totalGastos, balanceNetoEfectivo };
    }, [ventasDia, gastosDia, saldoAnterior]);

    const handleDateChange = (e) => {
        const dateString = e.target.value;
        const [year, month, day] = dateString.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
    };
    
    const handleGenerateReport = () => {
        const dateString = selectedDate.toLocaleDateString('es-AR', { timeZone: 'UTC' });
        const ingresosEfectivo = ventasDia.filter(v => v.pagoEfectivo > 0);
        const ingresosTransferencia = ventasDia.filter(v => v.pagoTransferencia > 0);
        // --- CORRECCIÓN: Se aplica la misma lógica para el reporte impreso ---
        const gastosEfectivo = gastosDia.filter(g => g.metodoPago === 'Efectivo' || !g.metodoPago);
        const gastosTransferencia = gastosDia.filter(g => g.metodoPago === 'Transferencia');
        const html = generateCashFlowReportHTML(dateString, ingresosEfectivo, ingresosTransferencia, gastosEfectivo, gastosTransferencia, saldoAnterior, resumen);
        printHTML(html);
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen font-sans">
            <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Flujo de Caja Diario</h1>
                <div className="flex items-center gap-4">
                    <label className="font-semibold">Seleccionar Fecha:</label>
                    <input type="date" onChange={handleDateChange} value={selectedDate.toISOString().split('T')[0]} className="p-2 border rounded-md shadow-sm"/>
                </div>
            </header>

            {loading ? <p className="text-center text-gray-500">Cargando movimientos del día...</p> :
            <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard title="Ingresos (Efectivo)" value={formatCurrency(resumen.totalEfectivo)} icon={<CashIcon className="text-green-500"/>}/>
                    <MetricCard title="Ingresos (Transferencia)" value={formatCurrency(resumen.totalTransferencia)} icon={<CreditCardIcon className="text-blue-500"/>}/>
                    <MetricCard title="Total Gastos (Todos)" value={formatCurrency(resumen.totalGastos)} icon={<ArrowDownIcon className="text-red-500"/>}/>
                    <MetricCard title="Balance Neto (Efectivo)" value={formatCurrency(resumen.balanceNetoEfectivo)} icon={<ArrowUpIcon className="text-indigo-500"/>} isHighlighted/>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <label className="text-sm font-semibold text-gray-600 block">Saldo Caja Anterior (Manual)</label>
                        <input type="number" value={saldoAnterior} onChange={e => setSaldoAnterior(parseFloat(e.target.value) || 0)} className="p-2 border rounded-md" placeholder="0.00"/>
                    </div>
                    <button onClick={handleGenerateReport} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700">
                        <PrinterIcon/> Generar Reporte Caja Diario
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <MovementList title="Ingresos del Día" items={ventasDia.filter(v => v.pagoEfectivo > 0 || v.pagoTransferencia > 0)} renderItem={v => <p>{v.clientName || v.clienteNombre}: <span className="font-semibold">{formatCurrency((v.pagoEfectivo || 0) + (v.pagoTransferencia || 0))}</span> ({v.pagoEfectivo > 0 ? 'Efectivo' : 'Transferencia'})</p>}/>
                    <MovementList title="Gastos del Día" items={gastosDia} renderItem={g => <p>{g.detalle}: <span className="font-semibold">{formatCurrency(g.monto)}</span> <span className="text-xs text-gray-500">({g.metodoPago || 'Efectivo'})</span></p>}/>
                </div>
            </div>
            }
        </div>
    );
}

const MetricCard = ({ title, value, icon, isHighlighted = false }) => (
    <div className={`bg-white p-6 rounded-xl shadow-lg ${isHighlighted ? 'border-2 border-indigo-500' : ''}`}>
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${isHighlighted ? 'bg-indigo-100' : 'bg-gray-100'}`}>{icon}</div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-3xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    </div>
);

const MovementList = ({ title, items, renderItem }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">{title} ({items.length})</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
            {items.length === 0 ? <p className="text-gray-500">No hay movimientos para mostrar.</p> : items.map(item => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-md text-sm">{renderItem(item)}</div>
            ))}
        </div>
    </div>
);

export default Caja;
