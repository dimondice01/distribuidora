import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js';
import { 
    collection, 
    onSnapshot, 
    query, 
    where, 
    Timestamp, 
    orderBy, 
    writeBatch, 
    doc,
    getDocs 
} from 'firebase/firestore';
import { toast } from 'react-toastify';
import Button from './Button'; 

// --- Iconografía (Lucide Style) ---
const CashIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>;
const CreditCardIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
const BankIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21v-7m8 0v7m6-7v7M2 10l10-5 10 5v4h-2v-4H4v4H2v-4z"/></svg>;
const ArrowUpIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
const ArrowDownIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
const PrinterIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
const HistoryIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>;
const TrashIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
const WalletIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>;

const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

// --- Generador de Reporte HTML (Detallado) ---
const generateCashFlowReportHTML = (date, shiftName, ingresosEfectivo, ingresosTransferencia, ingresosTarjeta, gastosEfectivo, gastosTransferencia, saldoAnterior, resumen) => {
    const ingresosEfectivoRows = ingresosEfectivo.map(v => `<tr><td>${v.clientName || v.clienteNombre}</td><td>${v.tipo === 'rendicion_cobranza' ? 'Rendición Cobranzas' : (v.tipo === 'rendicion' ? 'Rendición Ruta' : 'Venta Mostrador')}</td><td style="text-align:right;">${formatCurrency(v.pagoEfectivo)}</td></tr>`).join('');
    const ingresosTransferenciaRows = ingresosTransferencia.map(v => `<tr><td>${v.clientName || v.clienteNombre}</td><td>${v.tipo === 'rendicion_cobranza' ? 'Rendición Cobranzas' : (v.tipo === 'rendicion' ? 'Rendición Ruta' : 'Venta Mostrador')}</td><td style="text-align:right;">${formatCurrency(v.pagoTransferencia)}</td></tr>`).join('');
    
    // Tabla de Tarjetas con Nro Cupón
    const ingresosTarjetaRows = ingresosTarjeta.map(v => `<tr><td>${v.clientName || v.clienteNombre}</td><td>${v.nroCupon || 'S/D'}</td><td style="text-align:right;">${formatCurrency(v.pagoTarjeta)}</td></tr>`).join('');
    
    const gastosEfectivoRows = gastosEfectivo.map(g => `<tr><td>${g.detalle}</td><td style="text-align:right;">${formatCurrency(g.monto)}</td></tr>`).join('');
    
    return `
    <html><head><title>Reporte de Caja - ${date}</title><style>body{font-family: sans-serif; padding: 20px;} table{width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px;} th, td{padding: 8px; border-bottom: 1px solid #ddd; text-align: left;} .text-right { text-align: right; } .summary-box { background: #f8f9fa; padding: 15px; margin-top: 20px; border-radius: 8px; border: 1px solid #ddd; } .section-title { margin-top: 20px; border-bottom: 2px solid #eee; padding-bottom: 5px; color: #555; }</style></head>
    <body>
        <h1>Reporte de Caja: ${date}</h1>
        <p>Turno: <strong>${shiftName}</strong></p>
        
        <h3 class="section-title">Ingresos Efectivo</h3>
        <table><thead><tr><th>Origen</th><th>Tipo</th><th class="text-right">Monto</th></tr></thead><tbody>${ingresosEfectivoRows || '<tr><td colspan="3">Sin movimientos</td></tr>'}</tbody></table>
        
        <h3 class="section-title">Ingresos Transferencia</h3>
        <table><thead><tr><th>Origen</th><th>Tipo</th><th class="text-right">Monto</th></tr></thead><tbody>${ingresosTransferenciaRows || '<tr><td colspan="3">Sin movimientos</td></tr>'}</tbody></table>

        <h3 class="section-title">Ingresos Tarjeta (Crédito/Débito)</h3>
        <table><thead><tr><th>Origen</th><th>Nro. Cupón</th><th class="text-right">Monto</th></tr></thead><tbody>${ingresosTarjetaRows || '<tr><td colspan="3">Sin movimientos</td></tr>'}</tbody></table>

        <h3 class="section-title">Egresos (Efectivo)</h3>
        <table><thead><tr><th>Detalle</th><th class="text-right">Monto</th></tr></thead><tbody>${gastosEfectivoRows || '<tr><td colspan="2">Sin movimientos</td></tr>'}</tbody></table>

        <div class="summary-box">
            <p><strong>Saldo Inicial (Efectivo):</strong> ${formatCurrency(saldoAnterior)}</p>
            <p><strong>(+) Ingresos Efvo:</strong> ${formatCurrency(resumen.totalEfectivo)}</p>
            <p><strong>(-) Gastos Efvo:</strong> -${formatCurrency(resumen.totalGastosEfectivo)}</p>
            <hr/>
            <h2>Saldo Final Caja (Físico): ${formatCurrency(resumen.balanceNetoEfectivo)}</h2>
            <br/>
            <p style="color: #666; font-size: 12px;">Otros Ingresos (No afectan caja física):</p>
            <p><strong>Transferencias:</strong> ${formatCurrency(resumen.totalTransferencia)}</p>
            <p><strong>Tarjetas:</strong> ${formatCurrency(resumen.totalTarjeta)}</p>
        </div>
    </body></html>`;
};

const printHTML = (htmlContent) => {
    const printWindow = window.open('', '_blank', 'height=800,width=600');
    if(printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
    }
};

function Caja() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [ventasPorFecha, setVentasPorFecha] = useState([]);
    const [gastosDia, setGastosDia] = useState([]);
    const [saldoAnterior, setSaldoAnterior] = useState(0);
    const [loading, setLoading] = useState(true);
    const [cierresDeCaja, setCierresDeCaja] = useState([]); 
    const [activeTab, setActiveTab] = useState('diario'); 
    const [shiftName, setShiftName] = useState('Turno de Mañana');
    const [cierreToDelete, setCierreToDelete] = useState(null); 

    useEffect(() => {
        const q = query(collection(db, 'cierresDeCaja'), orderBy('fechaCierre', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCierresDeCaja(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        setLoading(true);
        const startOfDay = new Date(selectedDate); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate); endOfDay.setHours(23, 59, 59, 999);
        const startTS = Timestamp.fromDate(startOfDay); 
        const endTS = Timestamp.fromDate(endOfDay);
        
        const qFecha = query(collection(db, 'ventas'), where('fecha', '>=', startTS), where('fecha', '<=', endTS));
        const qGastos = query(collection(db, 'gastos'), where('fechaGasto', '>=', startTS), where('fechaGasto', '<=', endTS));
        
        const unsub1 = onSnapshot(qFecha, (snap) => setVentasPorFecha(snap.docs.map(d => ({ id: d.id, ...d.data(), fecha: d.data().fecha?.toDate() }))));
        const unsub2 = onSnapshot(qGastos, (snap) => {
            setGastosDia(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => { unsub1(); unsub2(); };
    }, [selectedDate]);

    const { resumen, currentShiftVentas, currentShiftGastos } = useMemo(() => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const closedIds = new Set(cierresDeCaja.filter(c => c.fechaContable?.startsWith(dateStr)).map(c => c.id));

        const relevantVentas = ventasPorFecha.filter(v => {
            if (v.cierreId && closedIds.has(v.cierreId)) return false;

            // Filtro estricto: Solo ventas con algún pago > 0
            const totalPagadoReal = (parseFloat(v.pagoEfectivo) || 0) + (parseFloat(v.pagoTransferencia) || 0) + (parseFloat(v.pagoTarjeta) || 0);
            if (totalPagadoReal <= 0.01) return false; 

            if (v.tipo === 'cobro') return true;
            if (v.tipo === 'cobranza') return false; 
            if (v.tipo === 'venta' && v.rutaId) return true; 

            if (v.tipo === 'rendicion_cobranza') return true;
            if (v.tipo === 'rendicion') return true;
            if (v.tipo === 'venta' && !v.rutaId) return true;

            return false; 
        });
        
        const relevantGastos = gastosDia.filter(g => !g.cierreId);

        const totalEfectivo = relevantVentas.reduce((sum, v) => sum + (parseFloat(v.pagoEfectivo) || 0), 0);
        const totalTransferencia = relevantVentas.reduce((sum, v) => sum + (parseFloat(v.pagoTransferencia) || 0), 0);
        const totalTarjeta = relevantVentas.reduce((sum, v) => sum + (parseFloat(v.pagoTarjeta) || 0), 0);
        
        const totalGastosEfectivo = relevantGastos.filter(g => g.metodoPago === 'Efectivo' || !g.metodoPago).reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0);
        const totalGastosTransferencia = relevantGastos.filter(g => g.metodoPago === 'Transferencia').reduce((sum, g) => sum + (parseFloat(g.monto) || 0), 0);

        return { 
            resumen: { 
                totalEfectivo, totalTransferencia, totalTarjeta,
                totalGastosEfectivo, totalGastosTransferencia, 
                balanceNetoEfectivo: saldoAnterior + totalEfectivo - totalGastosEfectivo 
            }, 
            currentShiftVentas: relevantVentas, 
            currentShiftGastos: relevantGastos 
        };
    }, [ventasPorFecha, gastosDia, saldoAnterior, cierresDeCaja, selectedDate]);

    // --- FUNCIÓN INTELIGENTE: IMPRESIÓN HISTÓRICA DETALLADA ---
    const handlePrintHistory = async (cierre) => {
        const loadingToast = toast.loading("Generando reporte detallado...");
        try {
            // 1. Recuperar todas las ventas asociadas a este cierre
            const qVentas = query(collection(db, 'ventas'), where('cierreId', '==', cierre.id));
            const snapshotVentas = await getDocs(qVentas);
            const ventasCierre = snapshotVentas.docs.map(d => d.data());

            // 2. Recuperar todos los gastos asociados
            const qGastos = query(collection(db, 'gastos'), where('cierreId', '==', cierre.id));
            const snapshotGastos = await getDocs(qGastos);
            const gastosCierre = snapshotGastos.docs.map(d => d.data());

            // 3. Clasificar para el reporte detallado
            const iE = ventasCierre.filter(v => v.pagoEfectivo > 0);
            const iT = ventasCierre.filter(v => v.pagoTransferencia > 0);
            const iC = ventasCierre.filter(v => v.pagoTarjeta > 0);

            const gE = gastosCierre.filter(g => g.metodoPago !== 'Transferencia');
            const gT = gastosCierre.filter(g => g.metodoPago === 'Transferencia');

            // 4. Reconstruir objeto resumen para la función de HTML
            const resumenReconstruido = {
                totalEfectivo: cierre.ingresosEfectivo || 0,
                totalTransferencia: cierre.ingresosTransferencia || 0,
                totalTarjeta: cierre.ingresosTarjeta || 0,
                totalGastosEfectivo: cierre.gastosEfectivo || 0,
                totalGastosTransferencia: cierre.gastosTransferencia || 0,
                balanceNetoEfectivo: cierre.balanceFinalEfectivo || 0
            };

            // 5. Generar HTML completo
            const html = generateCashFlowReportHTML(
                cierre.fechaContable, 
                cierre.turno, 
                iE, iT, iC, 
                gE, gT, 
                cierre.saldoAnteriorEfectivo, 
                resumenReconstruido
            );

            toast.dismiss(loadingToast);
            printHTML(html);

        } catch (error) {
            console.error(error);
            toast.dismiss(loadingToast);
            toast.error("Error al recuperar detalles del cierre.");
        }
    };

    const handleCloseAndGenerateReport = async () => {
        if (!shiftName.trim()) { toast.error('Falta nombre de Turno'); return; }
        
        const closureData = {
            fechaCierre: Timestamp.now(),
            fechaContable: selectedDate.toISOString().split('T')[0],
            turno: shiftName,
            saldoAnteriorEfectivo: saldoAnterior,
            
            ingresosEfectivo: resumen.totalEfectivo,
            gastosEfectivo: resumen.totalGastosEfectivo,
            balanceFinalEfectivo: resumen.balanceNetoEfectivo, 
            
            ingresosTransferencia: resumen.totalTransferencia,
            gastosTransferencia: resumen.totalGastosTransferencia,
            ingresosTarjeta: resumen.totalTarjeta, // Guardamos el total de tarjetas
            
            conteoVentas: currentShiftVentas.length
        };

        try {
            const batch = writeBatch(db);
            const ref = doc(collection(db, 'cierresDeCaja'));
            batch.set(ref, closureData);
            
            currentShiftVentas.forEach(v => batch.update(doc(db, 'ventas', v.id), { cierreId: ref.id }));
            currentShiftGastos.forEach(g => batch.update(doc(db, 'gastos', g.id), { cierreId: ref.id }));
            
            await batch.commit();
            
            // Generamos reporte para el momento del cierre
            const iE = currentShiftVentas.filter(v => v.pagoEfectivo > 0);
            const iT = currentShiftVentas.filter(v => v.pagoTransferencia > 0);
            const iC = currentShiftVentas.filter(v => v.pagoTarjeta > 0);
            
            const gE = currentShiftGastos.filter(g => g.metodoPago !== 'Transferencia');
            const gT = currentShiftGastos.filter(g => g.metodoPago === 'Transferencia');
            
            printHTML(generateCashFlowReportHTML(closureData.fechaContable, shiftName, iE, iT, iC, gE, gT, saldoAnterior, resumen));
            
            toast.success("Caja cerrada.");
            setSaldoAnterior(resumen.balanceNetoEfectivo);
            setShiftName('');
        } catch (e) { console.error(e); toast.error("Error al cerrar"); }
    };

    const handleDeleteCierre = async () => {
        if(!cierreToDelete) return;
        try {
            const batch = writeBatch(db);
            const qV = query(collection(db, 'ventas'), where('cierreId', '==', cierreToDelete.id));
            const sV = await getDocs(qV); sV.forEach(d => batch.update(d.ref, { cierreId: null }));
            const qG = query(collection(db, 'gastos'), where('cierreId', '==', cierreToDelete.id));
            const sG = await getDocs(qG); sG.forEach(d => batch.update(d.ref, { cierreId: null }));
            batch.delete(doc(db, 'cierresDeCaja', cierreToDelete.id));
            await batch.commit();
            toast.success("Cierre eliminado.");
            setCierreToDelete(null);
        } catch(e) { console.error(e); toast.error("Error"); }
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen font-sans text-gray-800">
            <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg"><WalletIcon className="w-8 h-8 text-white"/></div>
                        Gestión de Caja
                    </h1>
                    <p className="text-gray-500 mt-1 ml-14">Control de flujo de caja central</p>
                </div>
                {activeTab === 'diario' && (
                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-500 uppercase">Fecha:</span>
                        <input type="date" onChange={(e) => {
                            const [y, m, d] = e.target.value.split('-').map(Number);
                            setSelectedDate(new Date(y, m - 1, d));
                        }} value={selectedDate.toISOString().split('T')[0]} className="font-bold text-indigo-700 bg-transparent outline-none cursor-pointer"/>
                    </div>
                )}
            </header>

            <div className="flex justify-center mb-8">
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 inline-flex">
                    <TabButton name="diario" activeTab={activeTab} setActiveTab={setActiveTab} label="Flujo Diario" icon={<CashIcon/>} />
                    <TabButton name="historial" activeTab={activeTab} setActiveTab={setActiveTab} label="Historial Cierres" icon={<HistoryIcon/>} />
                </div>
            </div>

            <div className="animate-fade-in">
                {activeTab === 'diario' && (
                    <CashFlowView 
                        loading={loading} resumen={resumen} saldoAnterior={saldoAnterior} setSaldoAnterior={setSaldoAnterior}
                        shiftName={shiftName} setShiftName={setShiftName} handleCloseAndGenerateReport={handleCloseAndGenerateReport}
                        currentShiftVentas={currentShiftVentas} currentShiftGastos={currentShiftGastos}
                    />
                )}
                {activeTab === 'historial' && (
                    // Pasamos la nueva función inteligente de impresión
                    <HistoryView cierresDeCaja={cierresDeCaja} onDeleteRequest={setCierreToDelete} onPrintRequest={handlePrintHistory} />
                )}
            </div>
            
            {cierreToDelete && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-6 text-center">
                        <TrashIcon className="w-12 h-12 text-red-500 mx-auto mb-4"/>
                        <h3 className="text-lg font-bold">¿Eliminar Cierre?</h3>
                        <p className="text-gray-500 mt-2 mb-6">Se liberarán las transacciones.</p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="secondary" onClick={() => setCierreToDelete(null)}>Cancelar</Button>
                            <Button variant="danger" onClick={handleDeleteCierre}>Eliminar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Componentes Visuales ---
const CashFlowView = ({ loading, resumen, saldoAnterior, setSaldoAnterior, shiftName, setShiftName, handleCloseAndGenerateReport, currentShiftVentas, currentShiftGastos }) => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <MetricCard title="Ingresos Efectivo" value={formatCurrency(resumen.totalEfectivo)} icon={<ArrowUpIcon className="text-emerald-600"/>} bgIcon="bg-emerald-100" />
            <MetricCard title="Ingresos Bancos" value={formatCurrency(resumen.totalTransferencia)} icon={<BankIcon className="text-blue-600"/>} bgIcon="bg-blue-100" />
            <MetricCard title="Ingresos Tarjeta" value={formatCurrency(resumen.totalTarjeta)} icon={<CreditCardIcon className="text-purple-600"/>} bgIcon="bg-purple-100" />
            <MetricCard title="Salida Efectivo" value={formatCurrency(resumen.totalGastosEfectivo)} icon={<ArrowDownIcon className="text-rose-600"/>} bgIcon="bg-rose-100" />
            <MetricCard title="Saldo Final Caja" value={formatCurrency(resumen.balanceNetoEfectivo)} icon={<CashIcon className="text-white"/>} bgIcon="bg-indigo-600" isPrimary />
        </div>

        {loading ? <div className="py-20 text-center text-gray-400 animate-pulse">Cargando...</div> :
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-1 bg-white p-6 rounded-2xl shadow-lg border border-gray-100 h-fit">
                <h3 className="text-lg font-bold text-gray-800 mb-4">🔐 Panel de Cierre</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Saldo Anterior (Efectivo)</label>
                        <input type="number" value={saldoAnterior} onChange={e => setSaldoAnterior(parseFloat(e.target.value) || 0)} className="w-full p-2 bg-gray-50 border rounded-lg font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Turno</label>
                        <input type="text" value={shiftName} onChange={e => setShiftName(e.target.value)} className="w-full p-2 bg-gray-50 border rounded-lg" />
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <p className="text-xs text-indigo-600 font-medium mb-1">Resumen a Cerrar:</p>
                        <p className="text-2xl font-black text-indigo-800">{formatCurrency(resumen.balanceNetoEfectivo)}</p>
                        <p className="text-[10px] text-indigo-400 mt-1">Solo Efectivo Físico</p>
                    </div>
                    <Button onClick={handleCloseAndGenerateReport} disabled={!shiftName.trim()} className="w-full py-3" icon={<PrinterIcon className="w-5 h-5"/>}>CERRAR CAJA</Button>
                </div>
            </div>

            <div className="xl:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <MovementList title="Ingresos" count={currentShiftVentas.length} items={currentShiftVentas} type="income" />
                    <MovementList title="Gastos" count={currentShiftGastos.length} items={currentShiftGastos} type="expense" />
                </div>
            </div>
        </div>
        }
    </div>
);

const HistoryView = ({ cierresDeCaja, onDeleteRequest, onPrintRequest }) => (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50"><h2 className="text-lg font-bold text-gray-800">Historial</h2></div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50"><tr><th className="px-6 py-3">Fecha</th><th className="px-6 py-3 text-right">Saldo Final</th><th className="px-6 py-3 text-center">Acciones</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                    {cierresDeCaja.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium">{new Date(c.fechaContable + 'T12:00:00Z').toLocaleDateString('es-AR')}</td>
                            <td className="px-6 py-4 text-right font-bold">{formatCurrency(c.balanceFinalEfectivo)}</td>
                            <td className="px-6 py-4 text-center flex justify-center gap-2">
                                <button onClick={() => onPrintRequest(c)} className="text-gray-400 hover:text-indigo-600"><PrinterIcon className="w-4 h-4"/></button>
                                <button onClick={() => onDeleteRequest(c)} className="text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const TabButton = ({ name, activeTab, setActiveTab, label, icon }) => (
    <button onClick={() => setActiveTab(name)} className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${name === activeTab ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
        {React.cloneElement(icon, { className: `w-4 h-4 ${name === activeTab ? 'text-white' : 'text-gray-400'}` })} {label}
    </button>
);

const MetricCard = ({ title, value, icon, bgIcon, isPrimary }) => (
    <div className={`p-5 rounded-2xl border ${isPrimary ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-gray-100 shadow-sm'} flex flex-col justify-between`}>
        <div className="flex justify-between items-start">
            <div><p className={`text-xs font-bold uppercase ${isPrimary ? 'text-indigo-200' : 'text-gray-400'}`}>{title}</p><p className="text-2xl font-bold mt-1">{value}</p></div>
            <div className={`p-2 rounded-xl ${isPrimary ? 'bg-white/20' : bgIcon}`}>{icon}</div>
        </div>
    </div>
);

const MovementList = ({ title, count, items, type }) => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col h-96">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className={`text-sm font-bold uppercase ${type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{title}</h3><span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-gray-400 border border-gray-200">{count}</span></div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {items.map(item => {
                let metodo = 'Efectivo';
                if (item.pagoTransferencia > 0) metodo = 'Transf.';
                if (item.pagoTarjeta > 0) metodo = 'Tarjeta';
                if (item.metodoPago === 'Transferencia') metodo = 'Transf.';

                return (
                <div key={item.id} className="p-3 bg-white border border-gray-100 rounded-xl flex justify-between items-center">
                    <div><p className="font-bold text-gray-800 text-sm">{item.clientName || item.clienteNombre || item.detalle}</p><p className="text-xs text-gray-400 font-medium">{item.tipo === 'rendicion' ? 'Rendición de Ruta' : (item.tipo === 'rendicion_cobranza' ? 'Rendición Vendedor' : (item.estado || 'Gasto'))}</p></div>
                    <div className="text-right"><p className={`font-bold text-sm ${type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency((item.pagoEfectivo || item.monto || 0) + (item.pagoTransferencia || 0) + (item.pagoTarjeta || 0))}</p><span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{metodo}</span></div>
                </div>
            )})}
        </div>
    </div>
);

export default Caja;