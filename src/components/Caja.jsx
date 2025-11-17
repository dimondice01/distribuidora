import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js';
// Se añade 'addDoc', 'writeBatch', 'doc' y 'getDocs'
import { 
    collection, 
    onSnapshot, 
    query, 
    where, 
    Timestamp, 
    orderBy, 
    addDoc, 
    writeBatch, 
    doc,
    getDocs 
} from 'firebase/firestore';
import { toast } from 'react-toastify';

// --- Iconografía (Se añade TrashIcon) ---
const CashIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><circle cx="12" cy="12" r="4"></circle><path d="M4 12h.01"></path><path d="M20 12h.01"></path></svg>;
const CreditCardIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const ArrowUpIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>;
const ArrowDownIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>;
const PrinterIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const HistoryIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M1 12h4"/><path d="M19 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>;
// --- NUEVO ICONO ---
const TrashIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;


const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

// --- Generador de Reporte HTML (sin cambios estructurales) ---
const generateCashFlowReportHTML = (date, shiftName, ingresosEfectivo, ingresosTransferencia, gastosEfectivo, gastosTransferencia, saldoAnterior, resumen) => {
    const ingresosEfectivoRows = ingresosEfectivo.map(v => `<tr><td>${v.clientName || v.clienteNombre}</td><td>${v.estado}</td><td style="text-align:right;">${formatCurrency(v.pagoEfectivo)}</td></tr>`).join('');
    const ingresosTransferenciaRows = ingresosTransferencia.map(v => `<tr><td>${v.clientName || v.clienteNombre}</td><td>${v.estado}</td><td style="text-align:right;">${formatCurrency(v.pagoTransferencia)}</td></tr>`).join('');
    const gastosEfectivoRows = gastosEfectivo.map(g => `<tr><td>${g.detalle}</td><td style="text-align:right;">${formatCurrency(g.monto)}</td></tr>`).join('');
    const gastosTransferenciaRows = gastosTransferencia.map(g => `<tr><td>${g.detalle}</td><td style="text-align:right;">${formatCurrency(g.monto)}</td></tr>`).join('');
    
    return `
    <html><head><title>Reporte de Caja - ${date} (${shiftName})</title><style>body{font-family: Arial, sans-serif; margin: 20px;} h1, h2, h3{color: #333;} table{width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px;} th, td{padding: 8px; border: 1px solid #ddd; text-align: left;} thead{background-color: #f2f2f2;} .summary{width: 50%; float: right;} .summary td{font-size: 1.1em;}</style></head>
    <body>
        <h1>Reporte de Flujo de Caja</h1>
        <h2>Fecha: ${date} - Turno: ${shiftName}</h2><hr/>
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
    const printWindow = window.open('', '_blank', 'height=800,width=600');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};

function Caja() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [ventasDia, setVentasDia] = useState([]); // *Todas* las ventas del día
    const [gastosDia, setGastosDia] = useState([]); // *Todos* los gastos del día
    const [saldoAnterior, setSaldoAnterior] = useState(0);
    const [loading, setLoading] = useState(true);
    const [cierresDeCaja, setCierresDeCaja] = useState([]); 
    const [activeTab, setActiveTab] = useState('diario'); 
    const [shiftName, setShiftName] = useState('Turno de Mañana');
    
    // --- NUEVO ESTADO PARA EL MODAL DE ELIMINACIÓN ---
    const [cierreToDelete, setCierreToDelete] = useState(null); 

    // Listener para el historial de cierres de caja (FIXED: Conversión robusta a Date)
    useEffect(() => {
        const q = query(collection(db, 'cierresDeCaja'), orderBy('fechaCierre', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCierresDeCaja(snapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    ...data, 
                    fechaCierre: data.fechaCierre && data.fechaCierre.toDate ? data.fechaCierre.toDate() : new Date(0) 
                };
            }));
        }, (error) => { console.error("Error al cargar historial de cierres:", error); });
        return unsubscribe;
    }, []);

    // --- CORRECCIÓN LÓGICA (Problema 1) ---
    // Este useEffect ahora carga *TODAS* las transacciones del día
    useEffect(() => {
        setLoading(true);
        const year = selectedDate.getFullYear(); const month = selectedDate.getMonth(); const day = selectedDate.getDate();
        const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
        
        const startOfDayTimestamp = Timestamp.fromDate(startOfDay); 
        const endOfDayTimestamp = Timestamp.fromDate(endOfDay);
        
        // 1. Consulta *TODAS* las Ventas del día
        const ventasQuery = query(collection(db, 'ventas'), 
            where('fecha', '>=', startOfDayTimestamp), 
            where('fecha', '<=', endOfDayTimestamp)
        );
        
        // 2. Consulta *TODOS* los Gastos del día
        const gastosQuery = query(collection(db, 'gastos'), 
            where('fechaGasto', '>=', startOfDayTimestamp), 
            where('fechaGasto', '<=', endOfDayTimestamp)
        );
        
        let ventasLoaded = false; let gastosLoaded = false;
        const checkLoading = () => { if (ventasLoaded && gastosLoaded) setLoading(false); };
        
        const unsubVentas = onSnapshot(ventasQuery, (snapshot) => { 
            setVentasDia(snapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    ...data, 
                    fecha: data.fecha && data.fecha.toDate ? data.fecha.toDate() : new Date(0) 
                };
            })); 
            ventasLoaded = true; checkLoading(); 
        }, (error) => { console.error("Error al cargar ventas:", error); ventasLoaded = true; checkLoading(); });
        
        const unsubGastos = onSnapshot(gastosQuery, (snapshot) => { 
            setGastosDia(snapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    ...data, 
                    fecha: data.fechaGasto && data.fechaGasto.toDate ? data.fechaGasto.toDate() : new Date(0)
                };
            })); 
            gastosLoaded = true; checkLoading(); 
        }, (error) => { console.error("Error al cargar gastos:", error); gastosLoaded = true; checkLoading(); });
        
        return () => { unsubVentas(); unsubGastos(); };
    }, [selectedDate]);


    // --- LÓGICA CLAVE (Problema 1 Corregido) ---
    // Filtramos las transacciones (ventasDia, gastosDia) basándonos en los cierres (cierresDeCaja)
    const { resumen, currentShiftVentas, currentShiftGastos } = useMemo(() => {
        const fechaContable = selectedDate.toISOString().split('T')[0];
        
        // 1. Obtener todos los IDs de cierres ya realizados para este día.
        const closedCierreIds = new Set(
            cierresDeCaja
                .filter(c => c.fechaContable === fechaContable)
                .map(c => c.id)
        );

        // 2. Filtrar transacciones que NO están en esa lista de IDs.
        const relevantVentas = ventasDia.filter(v => 
            (v.estado === 'Pagada' || v.estado === 'Adeuda') && 
            !closedCierreIds.has(v.cierreId)
        );
        
        const relevantGastos = gastosDia.filter(g => 
            !closedCierreIds.has(g.cierreId)
        );
        
        // 3. Calcular resumen (Solo con las transacciones del turno actual)
        const totalEfectivo = relevantVentas.reduce((sum, v) => sum + (v.pagoEfectivo || 0), 0);
        const totalTransferencia = relevantVentas.reduce((sum, v) => sum + (v.pagoTransferencia || 0), 0);
        
        const totalGastosEfectivo = relevantGastos.filter(g => g.metodoPago === 'Efectivo' || !g.metodoPago).reduce((sum, g) => sum + (g.monto || 0), 0);
        const totalGastosTransferencia = relevantGastos.filter(g => g.metodoPago === 'Transferencia').reduce((sum, g) => sum + (g.monto || 0), 0);

        const totalGastos = totalGastosEfectivo + totalGastosTransferencia;
        const balanceNetoEfectivo = saldoAnterior + totalEfectivo - totalGastosEfectivo;
        
        const summary = { totalEfectivo, totalTransferencia, totalGastosEfectivo, totalGastosTransferencia, totalGastos, balanceNetoEfectivo };

        return { resumen: summary, currentShiftVentas: relevantVentas, currentShiftGastos: relevantGastos };
    }, [ventasDia, gastosDia, saldoAnterior, cierresDeCaja, selectedDate]);
    // --- FIN LÓGICA CLAVE ---

    const handleDateChange = (e) => {
        const dateString = e.target.value;
        const [year, month, day] = dateString.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day)); 
    };
    
    // --- LÓGICA DE CIERRE (Problema 1 Corregido) ---
    const handleCloseAndGenerateReport = async () => {
        const dateString = selectedDate.toLocaleDateString('es-AR', { timeZone: 'UTC' });
        const fechaContable = selectedDate.toISOString().split('T')[0];
        
        if (!shiftName.trim()) {
            toast.error('Por favor, ingresa un nombre de Turno (ej: Mañana, Tarde, Final).');
            return;
        }

        // 1. Generar el reporte impreso (PDF) con los datos del turno actual
        const ingresosEfectivo = currentShiftVentas.filter(v => v.pagoEfectivo > 0);
        const ingresosTransferencia = currentShiftVentas.filter(v => v.pagoTransferencia > 0);
        const gastosEfectivo = currentShiftGastos.filter(g => g.metodoPago === 'Efectivo' || !g.metodoPago);
        const gastosTransferencia = currentShiftGastos.filter(g => g.metodoPago === 'Transferencia');
        const html = generateCashFlowReportHTML(dateString, shiftName, ingresosEfectivo, ingresosTransferencia, gastosEfectivo, gastosTransferencia, saldoAnterior, resumen);
        printHTML(html);

        // 2. Crear el documento de cierre de caja
        const closureData = {
            fechaCierre: Timestamp.now(), 
            fechaContable: fechaContable, 
            turno: shiftName, 
            saldoAnteriorEfectivo: saldoAnterior,
            ingresosEfectivo: resumen.totalEfectivo,
            gastosEfectivo: resumen.totalGastosEfectivo,
            balanceFinalEfectivo: resumen.balanceNetoEfectivo,
            ingresosTransferencia: resumen.totalTransferencia,
            gastosTransferencia: resumen.totalGastosTransferencia,
            totalNetoTransferencia: resumen.totalTransferencia - resumen.totalGastosTransferencia,
            conteoVentas: currentShiftVentas.length, 
            conteoGastos: currentShiftGastos.length, 
        };

        try {
            // 3. Iniciar un WriteBatch para la transacción
            const batch = writeBatch(db);
            
            // 3.1. Crear el nuevo documento de cierre
            const cierreRef = doc(collection(db, 'cierresDeCaja'));
            batch.set(cierreRef, closureData);
            
            // 3.2. Marcar todas las ventas del turno como cerradas (asignar cierreId)
            currentShiftVentas.forEach(venta => {
                const ventaRef = doc(db, 'ventas', venta.id);
                batch.update(ventaRef, { cierreId: cierreRef.id });
            });
            
            // 3.3. Marcar todos los gastos del turno como cerrados (asignar cierreId)
            currentShiftGastos.forEach(gasto => {
                const gastoRef = doc(db, 'gastos', gasto.id);
                batch.update(gastoRef, { cierreId: cierreRef.id });
            });

            // 4. Ejecutar la transacción
            await batch.commit();

            toast.success(`Caja del ${dateString} - ${shiftName} cerrada y guardada con éxito!`);
            
            // 5. Preparar el estado para el siguiente turno
            setSaldoAnterior(resumen.balanceNetoEfectivo); 
            setShiftName('');

        } catch (error) {
            console.error("Error al guardar el cierre de caja:", error);
            toast.error("Error al guardar el cierre de caja. Revisa la consola.");
        }
    };
    
    // --- NUEVO HANDLER: Eliminar Cierre de Caja ---
    const handleDeleteCierre = async () => {
        if (!cierreToDelete) return;
        
        toast.info("Procesando eliminación...");
        
        try {
            const batch = writeBatch(db);
            const cierreId = cierreToDelete.id;

            // 1. Encontrar y desvincular Ventas
            const ventasQuery = query(collection(db, 'ventas'), where('cierreId', '==', cierreId));
            const ventasSnapshot = await getDocs(ventasQuery);
            ventasSnapshot.forEach(doc => {
                batch.update(doc.ref, { cierreId: null });
            });

            // 2. Encontrar y desvincular Gastos
            const gastosQuery = query(collection(db, 'gastos'), where('cierreId', '==', cierreId));
            const gastosSnapshot = await getDocs(gastosQuery);
            gastosSnapshot.forEach(doc => {
                batch.update(doc.ref, { cierreId: null });
            });

            // 3. Eliminar el Cierre
            const cierreRef = doc(db, 'cierresDeCaja', cierreId);
            batch.delete(cierreRef);

            // 4. Ejecutar
            await batch.commit();
            
            toast.success(`Cierre de turno "${cierreToDelete.turno}" eliminado. Las transacciones se han liberado.`);
            setCierreToDelete(null);

        } catch (error) {
            console.error("Error al eliminar el cierre:", error);
            toast.error("Error al eliminar el cierre.");
            setCierreToDelete(null);
        }
    };


    return (
        <div className="p-6 bg-gray-100 min-h-screen font-sans">
            <header className="flex flex-wrap justify-between items-center mb-6 gap-4 border-b-2 pb-4">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2"><CashIcon className="w-8 h-8 text-indigo-600"/> Gestión de Caja</h1>
                <div className="flex items-center gap-4">
                    {activeTab === 'diario' && (
                        <div className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-md">
                            <label className="font-semibold text-gray-700">Fecha a Consultar:</label>
                            <input 
                                type="date" 
                                onChange={handleDateChange} 
                                value={selectedDate.toISOString().split('T')[0]} 
                                className="p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    )}
                </div>
            </header>

            <div className="flex border-b border-gray-200 mb-6">
                <TabButton name="diario" activeTab={activeTab} setActiveTab={setActiveTab} label="Flujo de Caja Diario" icon={<CashIcon className="w-5 h-5"/>} />
                <TabButton name="historial" activeTab={activeTab} setActiveTab={setActiveTab} label="Historial de Cierres" icon={<HistoryIcon className="w-5 h-5"/>} />
            </div>

            <div className="mt-4">
                {activeTab === 'diario' && (
                    <CashFlowView 
                        loading={loading}
                        resumen={resumen}
                        saldoAnterior={saldoAnterior}
                        setSaldoAnterior={setSaldoAnterior}
                        shiftName={shiftName}
                        setShiftName={setShiftName}
                        handleCloseAndGenerateReport={handleCloseAndGenerateReport}
                        currentShiftVentas={currentShiftVentas}
                        currentShiftGastos={currentShiftGastos}
                    />
                )}
                {activeTab === 'historial' && (
                    <HistoryView 
                        cierresDeCaja={cierresDeCaja} 
                        onDeleteRequest={setCierreToDelete} // <-- Pasar el handler
                    />
                )}
            </div>

            {/* --- NUEVO MODAL DE CONFIRMACIÓN DE ELIMINACIÓN --- */}
            {cierreToDelete && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            ¿Seguro que quieres eliminar el cierre del turno <strong>{cierreToDelete.turno}</strong> (Fecha: {new Date(cierreToDelete.fechaContable + 'T12:00:00Z').toLocaleDateString('es-AR')})?
                        </p>
                        <p className="mt-2 text-sm font-bold text-red-600">
                            Esta acción liberará todas las ventas y gastos asociados a este turno, volviéndolos a marcar como PENDIENTES.
                        </p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button type="button" onClick={() => setCierreToDelete(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Cancelar
                            </button>
                            <button type="button" onClick={handleDeleteCierre} className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700">
                                Eliminar Cierre
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Componentes Estables Extraídos para evitar la pérdida de foco (Problema 2 resuelto) ---

const HistoryView = ({ cierresDeCaja, onDeleteRequest }) => ( // <-- Recibe onDeleteRequest
    <div className="bg-white p-6 rounded-xl shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-700 mb-6 border-b pb-3 flex items-center gap-2"><HistoryIcon className="text-indigo-600"/> Historial de Cierres de Caja</h2>
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-200">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Fecha Contable</th>
                        <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Cerrado en</th>
                        <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Turno</th> 
                        <th className="px-6 py-3 font-semibold text-right text-gray-600 uppercase">I. Efectivo</th>
                        <th className="px-6 py-3 font-semibold text-right text-gray-600 uppercase">G. Efectivo</th>
                        <th className="px-6 py-3 font-semibold text-right text-indigo-600 uppercase">Saldo Final (Efectivo)</th>
                        <th className="px-6 py-3 font-semibold text-center text-gray-600 uppercase">Movs.</th>
                        <th className="px-6 py-3 font-semibold text-center text-gray-600 uppercase">Acciones</th> {/* <-- NUEVA COLUMNA */}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {cierresDeCaja.map((cierre) => {
                        const fechaContable = new Date(cierre.fechaContable + 'T12:00:00Z').toLocaleDateString('es-AR');
                        const fechaCierre = cierre.fechaCierre ? cierre.fechaCierre.toLocaleDateString('es-AR') : 'N/A';
                        return (
                            <tr key={cierre.id} className="hover:bg-indigo-50">
                                <td className="px-6 py-4 font-mono text-gray-600">{fechaContable}</td>
                                <td className="px-6 py-4 text-gray-800">{fechaCierre}</td>
                                <td className="px-6 py-4 font-semibold text-gray-700">{cierre.turno || 'Día Completo'}</td> 
                                <td className="px-6 py-4 text-green-600 font-bold text-right">{formatCurrency(cierre.ingresosEfectivo)}</td>
                                <td className="px-6 py-4 text-red-600 font-bold text-right">{formatCurrency(cierre.gastosEfectivo)}</td>
                                <td className="px-6 py-4 font-bold text-xl text-indigo-700 text-right">{formatCurrency(cierre.balanceFinalEfectivo)}</td>
                                <td className="px-6 py-4 text-center text-gray-500">{cierre.conteoVentas || 0}V/{cierre.conteoGastos || 0}G</td>
                                {/* --- NUEVO TD CON BOTÓN --- */}
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => onDeleteRequest(cierre)} 
                                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100"
                                        title="Eliminar Cierre"
                                    >
                                        <TrashIcon />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {cierresDeCaja.length === 0 && <p className="text-center py-4 text-gray-500">No hay cierres de caja registrados aún.</p>}
        </div>
    </div>
);

const CashFlowView = ({ loading, resumen, saldoAnterior, setSaldoAnterior, shiftName, setShiftName, handleCloseAndGenerateReport, currentShiftVentas, currentShiftGastos }) => (
    <div className="animate-fade-in space-y-8">
        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
                title="Ingresos (Efectivo)" 
                value={formatCurrency(resumen.totalEfectivo)} 
                icon={<CashIcon className="text-white"/>}
                bgColor="bg-green-500"
                
            />
            <MetricCard 
                title="Ingresos (Transferencia)" 
                value={formatCurrency(resumen.totalTransferencia)} 
                icon={<CreditCardIcon className="text-white"/>}
                bgColor="bg-blue-500"
            />
            <MetricCard 
                title="Total Gastos (Efectivo)" 
                value={formatCurrency(resumen.totalGastosEfectivo)} 
                icon={<ArrowDownIcon className="text-white"/>}
                bgColor="bg-red-500"
            />
            <MetricCard 
                title="Saldo Final (Efectivo)" 
                value={formatCurrency(resumen.balanceNetoEfectivo)} 
                icon={<ArrowUpIcon className="text-white"/>} 
                isHighlighted
                bgColor="bg-indigo-600"
            />
        </div>

        {loading ? <p className="text-center text-gray-500 mt-8">Cargando movimientos del día...</p> :
        <div className="space-y-8">
            {/* Panel de Cierre de Caja */}
            <div className="bg-white p-6 rounded-xl shadow-2xl border-t-4 border-indigo-600">
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-3">Cierre de Turno/Día</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    
                    {/* Campo 1: Saldo Anterior */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Saldo Inicial (Efectivo)</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-lg font-bold text-gray-400">$</span>
                            <input 
                                type="number" 
                                value={saldoAnterior} 
                                onChange={e => setSaldoAnterior(parseFloat(e.target.value) || 0)} 
                                className="w-full p-3 pl-8 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Campo 2: Nombre del Turno */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">Nombre del Turno</label>
                        <input 
                            type="text" 
                            value={shiftName} 
                            onChange={e => setShiftName(e.target.value)} 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors" 
                            placeholder="Ej: Mañana, Tarde, Juan"
                        />
                    </div>

                    {/* Botón 3: Cerrar Caja */}
                    <button 
                        onClick={handleCloseAndGenerateReport} 
                        disabled={!shiftName.trim()}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-xl hover:bg-indigo-700 transition-all transform hover:scale-[1.01] disabled:bg-gray-400 h-12"
                    >
                        <PrinterIcon/> 
                        Cerrar Caja y Generar Reporte
                    </button>
                </div>
                {!shiftName.trim() && <p className="mt-2 text-sm text-red-500">El nombre del turno es obligatorio para el cierre.</p>}
            </div>

            {/* Listas de Movimientos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <MovementList 
                    title="Ingresos del Turno" 
                    items={currentShiftVentas.filter(v => v.pagoEfectivo > 0 || v.pagoTransferencia > 0)} 
                    renderItem={v => (
                        <div className="flex justify-between items-center">
                            <p>{v.clientName || v.clienteNombre} <span className='text-xs text-gray-500 ml-2'>({v.estado})</span></p>
                            <p>
                                <span className="font-semibold text-base mr-3">{formatCurrency((v.pagoEfectivo || 0) + (v.pagoTransferencia || 0))}</span>
                                <span className={`text-xs font-bold ${v.pagoEfectivo > 0 ? 'text-green-800' : 'text-blue-800'}`}>
                                    {v.pagoEfectivo > 0 ? 'Efectivo' : 'Transferencia'}
                                </span>
                            </p>
                        </div>
                    )}
                    icon={<ArrowUpIcon className="text-green-600"/>}
                    headerBg="bg-green-50"
                />
                <MovementList 
                    title="Gastos del Turno" 
                    items={currentShiftGastos} 
                    renderItem={g => (
                        <div className="flex justify-between items-center">
                            <p>{g.detalle}</p>
                            <p>
                                <span className="font-semibold text-base text-red-600 mr-3">{formatCurrency(g.monto)}</span> 
                                <span className={`text-xs font-bold ${g.metodoPago === 'Efectivo' || !g.metodoPago ? 'text-red-800' : 'text-blue-800'}`}>
                                    {g.metodoPago || 'Efectivo'}
                                </span>
                            </p>
                        </div>
                    )}
                    icon={<ArrowDownIcon className="text-red-600"/>}
                    headerBg="bg-red-50"
                />
            </div>
        </div>
        }
    </div>
);

const TabButton = ({ name, activeTab, setActiveTab, label, icon }) => {
    const isActive = name === activeTab;
    return (
        <button 
            onClick={() => setActiveTab(name)} 
            className={`flex items-center gap-2 px-6 py-3 text-base font-semibold transition-colors duration-200 ${
                isActive 
                ? 'border-b-4 border-indigo-600 text-indigo-700 bg-white shadow-inner-top'
                : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'
            }`}
        >
            {React.cloneElement(icon, { className: `w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}` })} {label}
        </button>
    );
};

// --- CORRECCIÓN FINAL DE ESTRUCTURA Y ALINEACIÓN (Problema 3 resuelto) ---
const MetricCard = ({ title, value, icon, isHighlighted = false, bgColor }) => (
    <div className={`bg-white p-6 rounded-xl shadow-lg border-l-4 ${isHighlighted ? 'border-indigo-600 shadow-2xl' : 'border-gray-200'} flex flex-col justify-between h-full`}>
        {/* Row 1: Icono y Título Alineados Arriba */}
        <div className="flex items-start gap-4"> 
            <div className={`p-3 rounded-xl ${bgColor}`}>{icon}</div>
            <div className="min-w-0 flex-1"> 
                <p className="text-sm text-gray-500 font-medium">{title}</p>
            </div>
        </div>
        
        {/* Row 2: Valor de la Moneda (Bloque Inferior) */}
        <div className="mt-3">
            <p className={`text-2xl font-bold ${isHighlighted ? 'text-indigo-700' : 'text-gray-800'} whitespace-nowrap overflow-hidden text-ellipsis`}>{value}</p>
        </div>
    </div>
);

// --- SUGERENCIA UI/UX APLICADA ---
const MovementList = ({ title, items, renderItem, icon, headerBg }) => (
    <div className="bg-white p-6 rounded-xl shadow-2xl">
        {/* Se usa headerBg para darle color al título de la lista */}
        <div className={`-mt-6 -mx-6 p-4 rounded-t-xl mb-4 flex items-center gap-2 font-bold ${headerBg || 'bg-gray-50'} border-b`}>
            {icon} 
            <h3 className="text-xl text-gray-700">
                {title} 
                <span className='ml-3 px-3 py-0.5 text-xs font-bold rounded-full bg-white text-gray-600 shadow-inner'>{items.length}</span>
            </h3>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {items.length === 0 ? <p className="text-gray-500 italic text-center py-4">No hay movimientos para mostrar.</p> : items.map(item => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg text-sm border-l-4 border-transparent hover:border-indigo-400 transition-all shadow-sm">
                    {renderItem(item)}
                </div>
            ))}
        </div>
    </div>
);

export default Caja;