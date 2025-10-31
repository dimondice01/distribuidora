import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js';
// Se añade 'addDoc' para guardar el cierre de caja
import { collection, onSnapshot, query, where, Timestamp, orderBy, addDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

// --- Iconografía ---
const CashIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><circle cx="12" cy="12" r="4"></circle><path d="M4 12h.01"></path><path d="M20 12h.01"></path></svg>;
const CreditCardIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const ArrowUpIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>;
const ArrowDownIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>;
const PrinterIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const HistoryIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M1 12h4"/><path d="M19 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>;

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
    const [cierresDeCaja, setCierresDeCaja] = useState([]); // Nuevo estado para el historial
    const [activeTab, setActiveTab] = useState('diario'); // Nuevo estado para la pestaña activa

    // Listener para el historial de cierres de caja
    useEffect(() => {
        const q = query(collection(db, 'cierresDeCaja'), orderBy('fechaCierre', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCierresDeCaja(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => { console.error("Error al cargar historial de cierres:", error); });
        return unsubscribe;
    }, []);

    // Listener para las ventas y gastos del día seleccionado
    useEffect(() => {
        setLoading(true);
        // Ajuste: Crear la fecha sin la zona horaria local para asegurar que cubre todo el día UTC
        const year = selectedDate.getFullYear(); const month = selectedDate.getMonth(); const day = selectedDate.getDate();
        const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        
        const startOfDayTimestamp = Timestamp.fromDate(startOfDay); 
        const endOfDayTimestamp = Timestamp.fromDate(endOfDay);
        
        const ventasQuery = query(collection(db, 'ventas'), where('fechaUltimoPago', '>=', startOfDayTimestamp), where('fechaUltimoPago', '<=', endOfDayTimestamp));
        const gastosQuery = query(collection(db, 'gastos'), where('fechaGasto', '>=', startOfDayTimestamp), where('fechaGasto', '<=', endOfDayTimestamp));
        
        let ventasLoaded = false; let gastosLoaded = false;
        const checkLoading = () => { if (ventasLoaded && gastosLoaded) setLoading(false); };
        
        const unsubVentas = onSnapshot(ventasQuery, (snapshot) => { 
            setVentasDia(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); 
            ventasLoaded = true; checkLoading(); 
        }, (error) => { console.error("Error al cargar ventas:", error); ventasLoaded = true; checkLoading(); });
        
        const unsubGastos = onSnapshot(gastosQuery, (snapshot) => { 
            setGastosDia(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); 
            gastosLoaded = true; checkLoading(); 
        }, (error) => { console.error("Error al cargar gastos:", error); gastosLoaded = true; checkLoading(); });
        
        return () => { unsubVentas(); unsubGastos(); };
    }, [selectedDate]);

    // Resumen de cálculos
    const resumen = useMemo(() => {
        const totalEfectivo = ventasDia.reduce((sum, v) => sum + (v.pagoEfectivo || 0), 0);
        const totalTransferencia = ventasDia.reduce((sum, v) => sum + (v.pagoTransferencia || 0), 0);
        
        // CORRECCIÓN: Los gastos sin método de pago se asumen como efectivo
        const totalGastosEfectivo = gastosDia.filter(g => g.metodoPago === 'Efectivo' || !g.metodoPago).reduce((sum, g) => sum + (g.monto || 0), 0);
        const totalGastosTransferencia = gastosDia.filter(g => g.metodoPago === 'Transferencia').reduce((sum, g) => sum + (g.monto || 0), 0);

        const totalGastos = totalGastosEfectivo + totalGastosTransferencia;
        const balanceNetoEfectivo = saldoAnterior + totalEfectivo - totalGastosEfectivo;
        
        return { totalEfectivo, totalTransferencia, totalGastosEfectivo, totalGastosTransferencia, totalGastos, balanceNetoEfectivo };
    }, [ventasDia, gastosDia, saldoAnterior]);

    const handleDateChange = (e) => {
        const dateString = e.target.value;
        const [year, month, day] = dateString.split('-').map(Number);
        // Usa la fecha local (sin manipular UTC) para que el selector funcione correctamente
        setSelectedDate(new Date(year, month - 1, day)); 
    };
    
    const handleCloseAndGenerateReport = async () => {
        const dateString = selectedDate.toLocaleDateString('es-AR', { timeZone: 'UTC' });
        
        // 1. Verificar si la caja para esta fecha ya fue cerrada
        const fechaContable = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const alreadyClosed = cierresDeCaja.some(cierre => cierre.fechaContable === fechaContable);

        if (alreadyClosed) {
            toast.error(`La caja para el día ${dateString} ya fue cerrada. Consulta el historial.`);
            return;
        }

        // 2. Generar el reporte impreso (PDF)
        const ingresosEfectivo = ventasDia.filter(v => v.pagoEfectivo > 0);
        const ingresosTransferencia = ventasDia.filter(v => v.pagoTransferencia > 0);
        const gastosEfectivo = gastosDia.filter(g => g.metodoPago === 'Efectivo' || !g.metodoPago);
        const gastosTransferencia = gastosDia.filter(g => g.metodoPago === 'Transferencia');
        const html = generateCashFlowReportHTML(dateString, ingresosEfectivo, ingresosTransferencia, gastosEfectivo, gastosTransferencia, saldoAnterior, resumen);
        printHTML(html);

        // 3. Crear el documento de cierre de caja
        const closureData = {
            fechaCierre: Timestamp.now(), // Momento exacto del cierre
            fechaContable: fechaContable, // Fecha a la que corresponde el cierre (YYYY-MM-DD)
            saldoAnteriorEfectivo: saldoAnterior,
            ingresosEfectivo: resumen.totalEfectivo,
            gastosEfectivo: resumen.totalGastosEfectivo,
            balanceFinalEfectivo: resumen.balanceNetoEfectivo,
            ingresosTransferencia: resumen.totalTransferencia,
            gastosTransferencia: resumen.totalGastosTransferencia,
            totalNetoTransferencia: resumen.totalTransferencia - resumen.totalGastosTransferencia,
            conteoVentas: ventasDia.length,
            conteoGastos: gastosDia.length,
            // Opcional: Podrías guardar los IDs de las ventas y gastos aquí para trazabilidad
            // ventaIds: ventasDia.map(v => v.id),
            // gastoIds: gastosDia.map(g => g.id),
        };

        try {
            await addDoc(collection(db, 'cierresDeCaja'), closureData);
            toast.success(`Caja del ${dateString} cerrada y guardada con éxito!`);
        } catch (error) {
            console.error("Error al guardar el cierre de caja:", error);
            toast.error("Error al guardar el cierre de caja. Revisa la consola.");
        }
    };

    const HistoryView = () => (
        <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Historial de Cierres de Caja</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Fecha Contable</th>
                            <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Cerrado en</th>
                            <th className="px-6 py-3 font-semibold text-right text-gray-600 uppercase">I. Efectivo</th>
                            <th className="px-6 py-3 font-semibold text-right text-gray-600 uppercase">G. Efectivo</th>
                            <th className="px-6 py-3 font-semibold text-right text-gray-600 uppercase">Saldo Final (Efectivo)</th>
                            <th className="px-6 py-3 font-semibold text-center text-gray-600 uppercase">Movs.</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {cierresDeCaja.map((cierre) => {
                            const fechaContable = new Date(cierre.fechaContable + 'T12:00:00Z').toLocaleDateString('es-AR');
                            const fechaCierre = cierre.fechaCierre ? cierre.fechaCierre.toDate().toLocaleDateString('es-AR') : 'N/A';
                            return (
                                <tr key={cierre.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-gray-600">{fechaContable}</td>
                                    <td className="px-6 py-4 text-gray-800">{fechaCierre}</td>
                                    <td className="px-6 py-4 text-green-600 font-bold text-right">{formatCurrency(cierre.ingresosEfectivo)}</td>
                                    <td className="px-6 py-4 text-red-600 font-bold text-right">{formatCurrency(cierre.gastosEfectivo)}</td>
                                    <td className="px-6 py-4 font-bold text-indigo-600 text-right">{formatCurrency(cierre.balanceFinalEfectivo)}</td>
                                    <td className="px-6 py-4 text-center text-gray-500">{cierre.conteoVentas || 0}V/{cierre.conteoGastos || 0}G</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {cierresDeCaja.length === 0 && <p className="text-center py-4 text-gray-500">No hay cierres de caja registrados aún.</p>}
            </div>
        </div>
    );

    const CashFlowView = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Ingresos (Efectivo)" value={formatCurrency(resumen.totalEfectivo)} icon={<CashIcon className="text-green-500"/>}/>
                <MetricCard title="Ingresos (Transferencia)" value={formatCurrency(resumen.totalTransferencia)} icon={<CreditCardIcon className="text-blue-500"/>}/>
                <MetricCard title="Total Gastos (Todos)" value={formatCurrency(resumen.totalGastos)} icon={<ArrowDownIcon className="text-red-500"/>}/>
                <MetricCard title="Balance Neto (Efectivo)" value={formatCurrency(resumen.balanceNetoEfectivo)} icon={<ArrowUpIcon className="text-indigo-500"/>} isHighlighted/>
            </div>
            {loading ? <p className="text-center text-gray-500 mt-8">Cargando movimientos del día...</p> :
            <div className="space-y-8 animate-fade-in">
                <div className="bg-white p-4 rounded-lg shadow-md flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <label className="text-sm font-semibold text-gray-600 block">Saldo Caja Anterior (Manual)</label>
                        <input type="number" value={saldoAnterior} onChange={e => setSaldoAnterior(parseFloat(e.target.value) || 0)} className="p-2 border rounded-md" placeholder="0.00"/>
                    </div>
                    <button onClick={handleCloseAndGenerateReport} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700">
                        <PrinterIcon/> Cerrar Caja y Generar Reporte
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <MovementList title="Ingresos del Día" items={ventasDia.filter(v => v.pagoEfectivo > 0 || v.pagoTransferencia > 0)} renderItem={v => <p>{v.clientName || v.clienteNombre}: <span className="font-semibold">{formatCurrency((v.pagoEfectivo || 0) + (v.pagoTransferencia || 0))}</span> ({v.pagoEfectivo > 0 ? 'Efectivo' : 'Transferencia'})</p>}/>
                    <MovementList title="Gastos del Día" items={gastosDia} renderItem={g => <p>{g.detalle}: <span className="font-semibold">{formatCurrency(g.monto)}</span> <span className="text-xs text-gray-500">({g.metodoPago || 'Efectivo'})</span></p>}/>
                </div>
            </div>
            }
        </>
    );

    return (
        <div className="p-6 bg-gray-100 min-h-screen font-sans">
            <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Caja y Reportes</h1>
                <div className="flex items-center gap-4">
                    {/* El selector de fecha solo es visible en la pestaña diaria */}
                    {activeTab === 'diario' && (
                        <div className="flex items-center gap-4">
                            <label className="font-semibold">Seleccionar Fecha:</label>
                            <input type="date" onChange={handleDateChange} value={selectedDate.toISOString().split('T')[0]} className="p-2 border rounded-md shadow-sm"/>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex border-b border-gray-200 mb-6">
                <TabButton name="diario" activeTab={activeTab} setActiveTab={setActiveTab} label="Flujo de Caja Diario" icon={<CashIcon className="w-5 h-5"/>} />
                <TabButton name="historial" activeTab={activeTab} setActiveTab={setActiveTab} label="Historial de Cierres" icon={<HistoryIcon className="w-5 h-5"/>} />
            </div>

            <div className="mt-4">
                {activeTab === 'diario' && <CashFlowView />}
                {activeTab === 'historial' && <HistoryView />}
            </div>
        </div>
    );
}

const TabButton = ({ name, activeTab, setActiveTab, label, icon }) => {
    const isActive = name === activeTab;
    return (
        <button 
            onClick={() => setActiveTab(name)} 
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                isActive 
                ? 'border-b-2 border-indigo-600 text-indigo-600 bg-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
        >
            {icon} {label}
        </button>
    );
};

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
                // Se utiliza el ID del documento para la key
                <div key={item.id} className="p-3 bg-gray-50 rounded-md text-sm">{renderItem(item)}</div>
            ))}
        </div>
    </div>
);

export default Caja;