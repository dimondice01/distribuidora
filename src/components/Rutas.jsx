import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, where, doc, writeBatch, Timestamp, addDoc, getDocs, orderBy, updateDoc, runTransaction } from 'firebase/firestore';

// 🛑 NUEVAS IMPORTACIONES REQUERIDAS DEL SDK DE FIREBASE FUNCTIONS
import { getFunctions, httpsCallable } from 'firebase/functions'; 

// Inicializamos el cliente de Cloud Functions (asumiendo que ya tienes inicializado Firebase en tu app)
// Si tu región de Cloud Functions no es la default, usa: getFunctions(app, 'tu-region')
const functions = getFunctions(); 
const emitirFacturas = httpsCallable(functions, 'emitirFacturasReparto');


// --- Iconografía Profesional (ACTUALIZADA con Reordenamiento) ---
const PlusIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TruckIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17H5a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5"/><path d="M15 17h4.5a2 2 0 0 0 2-2V9.5a2 2 0 0 0-2-2H18"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
const CheckCircleIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const XIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const PrinterIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const ChevronDownIcon = (props) => <svg {...props} className="transition-transform duration-300" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>;
const EyeIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
const EditIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
const ArchiveIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><path d="M10 12h4"/><path d="M22 4H2v4h20z"/></svg>;
const ArrowUpIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>;
const ArrowDownIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7 7-7-7"/><path d="M12 5v14"/></svg>;
const AlertTriangle = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;


const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

// --- CORRECCIÓN PDF (ID de Producto) ---
const generateLoadingReportHTML = (invoices, routeName, repartidorNombre) => {
    const productSummary = new Map();
    invoices.forEach(invoice => {
        (invoice.items || []).forEach(item => {
            // Usamos el 'productId' si existe, si no (si es undefined o null), 
            // usamos el 'nombre' del producto como clave única.
            const key = item.productId || item.nombre; 

            if (!key) {
                console.warn("Item sin clave (productId o nombre) encontrado:", item);
                return; // Saltar este item
            }

            const existing = productSummary.get(key);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                productSummary.set(key, { nombre: item.nombre, quantity: item.quantity });
            }
        });
    });
    const productList = Array.from(productSummary.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const itemsRows = productList.map(item => `<tr><td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td><td style="padding: 8px; border: 1px solid #ddd;">${item.nombre}</td></tr>`).join('');
    return `<html><head><title>Reporte de Carga - ${routeName}</title><style>body{font-family: Arial, sans-serif; margin: 20px;} h1, h2, h3 {color: #333;} table{width: 100%; border-collapse: collapse; margin-top: 20px;} th, td{padding: 12px; text-align: left;} thead{background-color: #f2f2f2;}</style></head><body><h1>Reporte de Carga para Depósito</h1><h2>Ruta: ${routeName}</h2><h3>Repartidor: ${repartidorNombre}</h3><p>Fecha de Emisión: ${new Date().toLocaleString('es-AR')}</p><hr/><table><thead><tr><th style="width:150px;">Cantidad a Cargar</th><th>Producto</th></tr></thead><tbody>${itemsRows}</tbody></table></body></html>`;
};
// --- FIN CORRECCIÓN PDF ---


const generateSettlementReportHTML = (route, invoices) => {
    const resumenCobros = invoices.reduce((acc, fac) => {
        acc.efectivo += fac.pagoEfectivo || 0;
        acc.transferencia += fac.pagoTransferencia || 0;
        acc.saldoPendiente += fac.saldoPendiente || 0;
        return acc;
    }, { efectivo: 0, transferencia: 0, saldoPendiente: 0 });
    const facturasRows = invoices.map(inv => `<tr><td style="padding: 8px; border: 1px solid #ddd;">${inv.clienteNombre}</td><td style="padding: 8px; border: 1px solid #ddd;">${inv.estado}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(inv.totalVenta)}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency((inv.pagoEfectivo || 0) + (inv.pagoTransferencia || 0))}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: red;">${formatCurrency(inv.saldoPendiente)}</td></tr>`).join('');
    const devoluciones = invoices.filter(inv => inv.estado === 'Anulada');
    const devolucionesSummary = new Map();
    devoluciones.forEach(invoice => {
        (invoice.items || []).forEach(item => {
            const key = item.productId || item.nombre; // Usar nombre como fallback
            if (!key) return;
            const existing = devolucionesSummary.get(key);
            if (existing) { existing.quantity += item.quantity; } else { devolucionesSummary.set(key, { nombre: item.nombre, quantity: item.quantity }); }
        });
    });
    const devolucionesRows = Array.from(devolucionesSummary.values()).map(item => `<tr><td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td><td style="padding: 8px; border: 1px solid #ddd;">${item.nombre}</td></tr>`).join('');
    return `<html><head><title>Reporte de Rendición - ${route.nombre}</title><style>body{font-family: Arial, sans-serif; margin: 20px;} h1, h2, h3 {color: #333;} table{width: 100%; border-collapse: collapse; margin-top: 20px;} th, td{padding: 12px; text-align: left;} thead{background-color: #f2f2f2;}</style></head><body><h1>Reporte de Rendición de Ruta</h1><h2>Ruta: ${route.nombre}</h2><h3>Repartidor: ${route.repartidorNombre}</h3><p>Fecha de Cierre: ${new Date().toLocaleString('es-AR')}</p><hr/><h3>Resumen Financiero</h3><p><strong>Total Cobrado en Efectivo:</strong> ${formatCurrency(resumenCobros.efectivo)}</p><p><strong>Total Recibido por Transferencia:</strong> ${formatCurrency(resumenCobros.transferencia)}</p><p><strong>Total Saldo Pendiente:</strong><span style="color: red;"> ${formatCurrency(resumenCobros.saldoPendiente)}</span></p><p><strong>TOTAL A RENDIR (Efectivo): ${formatCurrency(resumenCobros.efectivo)}</strong></p><hr/><h3>Desglose de Facturas</h3><table><thead><tr><th>Cliente</th><th>Estado Final</th><th style="text-align: right;">Total Factura</th><th style="text-align: right;">Monto Cobrado</th><th style="text-align: right;">Saldo</th></tr></thead><tbody>${facturasRows}</tbody></table>${devoluciones.length > 0 ? `<hr/><h3>Mercadería Devuelta (para reingresar a stock)</h3><table><thead><tr><th style="width:150px;">Cantidad</th><th>Producto</th></tr></thead><tbody>${devolucionesRows}</tbody></table>` : ''}</body></html>`;
};
const printHTML = (htmlContent) => {
    const printWindow = window.open('', '_blank', 'height=800,width=600');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};

function useFirestoreSubscription(firestoreQuery) {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!firestoreQuery) { setData([]); setIsLoading(false); return; }
        setIsLoading(true);
        const unsubscribe = onSnapshot(firestoreQuery, (snapshot) => {
            const resolvedData = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data(),
                fecha: doc.data().fecha?.toDate(),
                fechaCreacion: doc.data().fechaCreacion?.toDate(),
            }));
            setData(resolvedData); setIsLoading(false);
        }, (err) => { setError(err); setIsLoading(false); console.error(err); });
        return () => unsubscribe();
    }, [firestoreQuery]);
    return { data, isLoading, error };
}

function Rutas() {
    const [isPlannerOpen, setIsPlannerOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [activeTab, setActiveTab] = useState('planificacion');

    const routesQuery = useMemo(() => query(collection(db, 'rutas'), where('estado', '!=', 'Archivada'), orderBy('fechaCreacion', 'desc')), []);
    const invoicesQuery = useMemo(() => query(collection(db, 'ventas'), where('estado', '!=', 'Archivada')), []);
    const repartidoresQuery = useMemo(() => query(collection(db, 'vendedores')), []);
    const clientesQuery = useMemo(() => query(collection(db, 'clientes')), []);
    const zonasQuery = useMemo(() => query(collection(db, 'zonas')), []);
    
    const { data: routes, isLoading: routesLoading } = useFirestoreSubscription(routesQuery);
    const { data: allInvoices, isLoading: invoicesLoading } = useFirestoreSubscription(invoicesQuery);
    const { data: repartidores, isLoading: repartidoresLoading } = useFirestoreSubscription(repartidoresQuery);
    const { data: clientes, isLoading: clientesLoading } = useFirestoreSubscription(clientesQuery);
    const { data: zonas, isLoading: zonasLoading } = useFirestoreSubscription(zonasQuery);
    
    const enrichedInvoices = useMemo(() => {
        return allInvoices.map(invoice => {
            const cliente = clientes.find(c => c.id === invoice.clienteId);
            return { 
                ...invoice, 
                clienteNombre: cliente?.nombre || invoice.clientName || 'N/A', 
                clienteDireccion: cliente?.direccion || 'N/A', 
                zonaId: cliente?.zonaId || null, 
                cliente: cliente || null // 🛑 Incluimos el objeto cliente completo para datos AFIP (DocNro, TipoDoc)
            };
        });
    }, [allInvoices, clientes]);

    const pendingInvoices = useMemo(() => enrichedInvoices.filter(inv => inv.estado === 'Pendiente de Entrega'), [enrichedInvoices]);
    
    const handleCreateNewRoute = async () => {
        const today = new Date();
        const dateString = today.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const existingRoutes = routes.filter(r => r.nombre && r.nombre.startsWith(`Ruta del ${dateString}`)).length;
        const newRouteName = `Ruta del ${dateString} (${existingRoutes + 1})`;
        const newRoute = {
            nombre: newRouteName, fechaCreacion: Timestamp.now(), estado: 'Planificada',
            repartidorId: null, repartidorNombre: null, facturas: [],
            resumen: { totalFacturas: 0, totalACobrar: 0, paradas: 0 }
        };
        try {
            const docRef = await addDoc(collection(db, 'rutas'), newRoute);
            setSelectedRoute({ id: docRef.id, ...newRoute });
            setIsPlannerOpen(true);
        } catch (error) { console.error("Error al crear la ruta:", error); }
    };
    const handleOpenPlanner = (route) => { setSelectedRoute(route); setIsPlannerOpen(true); };
    const handleClosePlanner = () => { setIsPlannerOpen(false); setSelectedRoute(null); };
    
    const handleCancelRoute = async (routeToCancel) => {
        if (!window.confirm(`¿Estás seguro de anular la ruta "${routeToCancel.nombre}"? Esto devolverá todas las facturas a 'Pendiente de Entrega'.`)) return;

        try {
            await runTransaction(db, async (transaction) => {
                const routeRef = doc(db, 'rutas', routeToCancel.id);

                transaction.update(routeRef, {
                    estado: 'Anulada',
                    fechaAnulacion: Timestamp.now(),
                    resumen: { ...routeToCancel.resumen, estadoFinal: 'Anulada' }
                });

                for (const facturaRef of (routeToCancel.facturas || [])) {
                    const invoiceRef = doc(db, 'ventas', facturaRef.id);
                    transaction.update(invoiceRef, { 
                        estado: 'Pendiente de Entrega', 
                        rutaId: null 
                    });
                }
            });
            alert(`Ruta "${routeToCancel.nombre}" ha sido ANULADA y sus facturas liberadas.`);
            handleClosePlanner();
        } catch (error) {
            console.error("Error al anular la ruta:", error);
            alert("Error al anular la ruta: " + error.message);
        }
    };

    if (routesLoading || invoicesLoading || repartidoresLoading || clientesLoading || zonasLoading) {
        return <div className="text-center p-10 text-gray-500 font-semibold">Cargando datos...</div>;
    }

    const planificadas = routes.filter(r => r.estado === 'Planificada');
    const enCurso = routes.filter(r => r.estado === 'En Curso');
    const rendicion = routes.filter(r => r.estado === 'Completada' || r.estado === 'Adeuda');
    const anuladas = routes.filter(r => r.estado === 'Anulada'); 

    return (
        <div className="p-6 bg-gray-100 min-h-screen font-sans">
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; opacity: 0; }
                .animate-fade-in-fast { animation: fade-in 0.3s ease-out forwards; opacity: 0; }
                .animate-fade-in-scale { animation: fade-in-scale 0.3s ease-out forwards; opacity: 0; }
                @keyframes fade-in-scale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
            
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-gray-800">Gestión de Rutas</h1>
                <button onClick={handleCreateNewRoute} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-xl hover:bg-indigo-700 transition-all transform hover:scale-[1.02] active:scale-95">
                    <PlusIcon /> Crear Nueva Ruta
                </button>
            </header>
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <TabButton name="planificacion" activeTab={activeTab} onClick={setActiveTab}>Planificación ({planificadas.length})</TabButton>
                    <TabButton name="en_curso" activeTab={activeTab} onClick={setActiveTab}>En Curso ({enCurso.length})</TabButton>
                    <TabButton name="rendicion" activeTab={activeTab} onClick={setActiveTab}>Rendición ({rendicion.length})</TabButton>
                    <TabButton name="anuladas" activeTab={activeTab} onClick={setActiveTab} color="red">Anuladas ({anuladas.length})</TabButton>
                </nav>
            </div>
            {activeTab === 'planificacion' && <RouteList routes={planificadas} onOpenPlanner={handleOpenPlanner} title="Rutas en Planificación" allInvoices={enrichedInvoices} />}
            {activeTab === 'en_curso' && <RouteList routes={enCurso} onOpenPlanner={handleOpenPlanner} title="Rutas en Curso" allInvoices={enrichedInvoices} />}
            {activeTab === 'rendicion' && <TabContentRendicion routes={rendicion} allInvoices={enrichedInvoices} />}
            {activeTab === 'anuladas' && <RouteList routes={anuladas} onOpenPlanner={handleOpenPlanner} title="Rutas Anuladas (Histórico)" allInvoices={enrichedInvoices} readOnly={true} />}

            {isPlannerOpen && (
                <RoutePlanner 
                    route={selectedRoute} 
                    onClose={handleClosePlanner} 
                    pendingInvoices={pendingInvoices} 
                    allEnrichedInvoices={enrichedInvoices}
                    repartidores={repartidores} 
                    zonas={zonas} 
                    onCancelRoute={handleCancelRoute}
                />
            )}

        </div>
    );
}

const TabButton = ({ name, activeTab, onClick, children, color = 'indigo' }) => (
    <button onClick={() => onClick(name)} className={`${activeTab === name ? `border-${color}-500 text-${color}-600` : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}>
        {children}
    </button>
);

const RouteList = ({ routes, onOpenPlanner, title, allInvoices, readOnly = false }) => (
    <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">{title}</h2>
        {routes.length === 0 ? <p className="text-gray-500 italic">No hay rutas en este estado.</p> : (
            <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {routes.map(route => (<RouteCard key={route.id} route={route} onOpenPlanner={() => onOpenPlanner(route)} allInvoices={allInvoices} readOnly={readOnly} />))}
            </main>
        )}
    </div>
);

const getStatusBadge = (estado) => {
    const base = "px-2.5 py-1 text-xs font-bold rounded-full inline-block uppercase tracking-wider";
    const colors = { 
        'Planificada': "bg-yellow-100 text-yellow-800", 'En Curso': "bg-blue-100 text-blue-800",
        'Completada': "bg-green-100 text-green-800", 'Adeuda': "bg-orange-100 text-orange-800",
        'Anulada': "bg-red-100 text-red-800", 'Repartiendo': "bg-blue-100 text-blue-800",
        'Pagada': "bg-green-100 text-green-800", 
        'Pendiente de Entrega': "bg-yellow-100 text-yellow-800", 
        'Anulada (Visita)': "bg-red-100 text-red-800",
    };
    return `${base} ${colors[estado] || "bg-gray-100 text-gray-800"}`;
};

const TabContentRendicion = ({ routes, allInvoices }) => {
    const [expandedRouteId, setExpandedRouteId] = useState(null);

    const resumenCajaDiaria = useMemo(() => {
        return routes.reduce((acc, route) => {
            const routeInvoiceIds = (route.facturas || []).map(f => f.id);
            const currentRouteInvoices = allInvoices.filter(inv => routeInvoiceIds.includes(inv.id));
            currentRouteInvoices.forEach(fac => {
                acc.efectivo += fac.pagoEfectivo || 0;
                acc.transferencia += fac.pagoTransferencia || 0;
                acc.saldoPendiente += fac.saldoPendiente || 0;
            });
            return acc;
        }, { efectivo: 0, transferencia: 0, saldoPendiente: 0 });
    }, [routes, allInvoices]);

    const handleArchiveAll = async () => {
        if (routes.length === 0 || !window.confirm(`¿Cerrar caja y archivar ${routes.length} rutas? Esta acción es irreversible.`)) return;
        const batch = writeBatch(db);
        routes.forEach(route => batch.update(doc(db, 'rutas', route.id), { estado: 'Archivada' }));
        try {
            await batch.commit();
            alert('Caja cerrada y todas las rutas fueron archivadas con éxito.');
        } catch (error) { console.error("Error al archivar todas las rutas: ", error); alert("Error masivo al archivar las rutas."); }
    };
    
    const handleArchiveOne = async (routeToArchive) => {
        if (!window.confirm(`¿Archivar solo la ruta "${routeToArchive.nombre}"?`)) return;
        try {
            await updateDoc(doc(db, 'rutas', routeToArchive.id), { estado: 'Archivada' });
            alert('Ruta archivada con éxito.');
        } catch (error) { console.error("Error al archivar la ruta: ", error); alert("Error al archivar la ruta."); }
    };

    if (routes.length === 0) { 
        return <div className="text-center text-gray-500 py-8 bg-white rounded-lg shadow italic">No hay rutas finalizadas para la rendición de hoy.</div>;
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-2xl border-l-8 border-indigo-600">
                <div className="flex flex-wrap justify-between items-center gap-4 border-b pb-4 mb-4">
                    <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2"><TruckIcon/> Rendición de Caja del Día</h2>
                    <button onClick={handleArchiveAll} className="flex items-center justify-center gap-3 px-6 py-3 bg-slate-700 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all transform hover:scale-[1.02]">
                        <ArchiveIcon className="w-5 h-5" /> Cerrar Caja y Archivar Todo
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="bg-green-50 p-5 rounded-xl border border-green-200"><p className="text-sm text-green-700 font-semibold uppercase">Efectivo a Rendir</p><p className="text-4xl font-extrabold text-green-900 mt-1">{formatCurrency(resumenCajaDiaria.efectivo)}</p></div>
                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-200"><p className="text-sm text-blue-700 font-semibold uppercase">Total Transferencias</p><p className="text-4xl font-extrabold text-blue-900 mt-1">{formatCurrency(resumenCajaDiaria.transferencia)}</p></div>
                    <div className="bg-red-50 p-5 rounded-xl border border-red-200"><p className="text-sm text-red-700 font-semibold uppercase">Deuda Generada Hoy</p><p className="text-4xl font-extrabold text-red-900 mt-1">{formatCurrency(resumenCajaDiaria.saldoPendiente)}</p></div>
                </div>
            </div>

            {routes.map(route => {
                const routeInvoiceIds = (route.facturas || []).map(f => f.id);
                const currentRouteInvoices = allInvoices.filter(inv => routeInvoiceIds.includes(inv.id));
                const resumenFinanciero = currentRouteInvoices.reduce((acc, fac) => {
                    acc.efectivo += fac.pagoEfectivo || 0;
                    acc.transferencia += fac.pagoTransferencia || 0;
                    acc.saldoPendiente += fac.saldoPendiente || 0;
                    return acc;
                }, { efectivo: 0, transferencia: 0, saldoPendiente: 0 });
                const isExpanded = expandedRouteId === route.id;
                const handlePrintSettlement = () => printHTML(generateSettlementReportHTML(route, currentRouteInvoices));

                return (
                    <div key={route.id} className="bg-white rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl">
                        <button onClick={() => setExpandedRouteId(isExpanded ? null : route.id)} className="w-full text-left p-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                        {route.nombre} {route.estado === 'Adeuda' && <span className="text-sm font-bold uppercase text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full">ADEUDA</span>}
                                    </h3>
                                    <p className="text-base text-gray-500 mt-1">Repartidor: <span className="font-semibold">{route.repartidorNombre}</span></p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Total Efectivo Rendido</p>
                                        <span className="font-bold text-2xl text-green-600">{formatCurrency(resumenFinanciero.efectivo)}</span>
                                    </div>
                                    <ChevronDownIcon style={{ transform: `rotate(${isExpanded ? '180deg' : '0deg'})` }} />
                                </div>
                            </div>
                        </button>
                        {isExpanded && (
                            <div className="px-6 pb-6 animate-fade-in-fast">
                                <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-center mb-6 bg-gray-50 p-4 rounded-lg">
                                    <div className="bg-white p-3 rounded-lg"><p className="text-sm text-gray-600">Paradas</p><p className="text-2xl font-bold text-gray-900">{(route.facturas || []).length}</p></div>
                                    <div className="bg-white p-3 rounded-lg"><p className="text-sm text-green-800">Efectivo Cobrado</p><p className="text-2xl font-bold text-green-900">{formatCurrency(resumenFinanciero.efectivo)}</p></div>
                                    <div className="bg-white p-3 rounded-lg"><p className="text-sm text-blue-800">Transferencias</p><p className="text-2xl font-bold text-blue-900">{formatCurrency(resumenFinanciero.transferencia)}</p></div>
                                    <div className="bg-white p-3 rounded-lg"><p className="text-sm text-red-800">Saldo Pendiente</p><p className="text-2xl font-bold text-red-900">{formatCurrency(resumenFinanciero.saldoPendiente)}</p></div>
                                </div>
                                <h4 className="font-bold text-md text-gray-700 mt-6 mb-2">Detalle de Facturas</h4>
                                <div className="overflow-y-auto max-h-72 border border-gray-200 rounded-xl shadow-inner">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-100 sticky top-0"><tr>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Cliente</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
                                            <th className="px-4 py-3 text-right font-semibold text-gray-600">Total Factura</th>
                                            <th className="px-4 py-3 text-right font-semibold text-gray-600">Monto Cobrado</th>
                                            <th className="px-4 py-3 text-right font-semibold text-gray-600">Saldo Pendiente</th>
                                        </tr></thead>
                                        <tbody className="bg-white">
                                            {currentRouteInvoices.map(inv => (
                                                <tr key={inv.id} className="border-t hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-800">{inv.clienteNombre}</td>
                                                    <td className="px-4 py-3"><span className={getStatusBadge(inv.estado)}>{inv.estado}</span></td>
                                                    <td className="px-4 py-3 text-right">{formatCurrency(inv.totalVenta)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency((inv.pagoEfectivo || 0) + (inv.pagoTransferencia || 0))}</td>
                                                    <td className={`px-4 py-3 text-right font-bold ${inv.saldoPendiente > 0 ? 'text-red-600' : 'text-gray-500'}`}>{formatCurrency(inv.saldoPendiente)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center mt-6 border-t pt-4">
                                    <button onClick={handlePrintSettlement} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all shadow-md">
                                        <PrinterIcon /> Imprimir Rendición
                                    </button>
                                    <button onClick={() => handleArchiveOne(route)} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-all shadow-md">
                                        <ArchiveIcon className="w-5 h-5" /> Archivar Solo Esta Ruta
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const RouteCard = ({ route, onOpenPlanner, allInvoices, readOnly }) => {
    const { estado, nombre, repartidorNombre, facturas, fechaCreacion } = route;
    const liveStats = useMemo(() => {
        if (!allInvoices) return { paradasCompletadas: 0, totalParadas: (facturas || []).length, progreso: 0, dineroCobrado: 0, proximaParada: 'N/A' };
        
        const routeInvoiceIds = new Set((facturas || []).map(f => f.id));
        const currentRouteInvoices = allInvoices.filter(inv => routeInvoiceIds.has(inv.id));
        
        const paradasCompletadas = currentRouteInvoices.filter(inv => inv.estado !== 'Repartiendo' && inv.estado !== 'Pendiente de Entrega').length;
        const totalParadas = currentRouteInvoices.length;
        const progreso = totalParadas > 0 ? (paradasCompletadas / totalParadas) * 100 : 0;
        const dineroCobrado = currentRouteInvoices.reduce((sum, inv) => sum + (inv.pagoEfectivo || 0) + (inv.pagoTransferencia || 0), 0);
        
        let proximaParada = 'Finalizada';
        const nextStopInvoice = (facturas || []).find(planned => {
            const live = currentRouteInvoices.find(i => i.id === planned.id);
            return live?.estado === 'Repartiendo';
        });
        if (nextStopInvoice) {
            proximaParada = nextStopInvoice.clienteNombre;
        } else if (estado === 'En Curso' && progreso < 100) {
            const pendingStop = (facturas || []).find(planned => {
                const live = currentRouteInvoices.find(i => i.id === planned.id);
                return live?.estado === 'Repartiendo' || live?.estado === 'Pendiente de Entrega';
            });
            proximaParada = pendingStop ? pendingStop.clienteNombre : 'Monitorear App';
        }

        return { paradasCompletadas, totalParadas, progreso, dineroCobrado, proximaParada };
    }, [facturas, allInvoices, estado]);

    const statusInfo = {
        'Planificada': { color: 'yellow', icon: <EditIcon className="inline-block w-5 h-5" />, text: 'Planificar Ruta' },
        'En Curso': { color: 'blue', icon: <EyeIcon className="inline-block w-5 h-5" />, text: 'Monitorear Ruta' },
        'Completada': { color: 'green', icon: <CheckCircleIcon className="inline-block w-5 h-5" />, text: 'Ver Rendición' },
        'Adeuda': { color: 'orange', icon: <AlertTriangle className="inline-block w-5 h-5" />, text: 'Ver Rendición' },
        'Anulada': { color: 'red', icon: <XIcon className="inline-block w-5 h-5" />, text: 'Ver Detalle' },
    };
    const currentStatus = statusInfo[estado] || { color: 'gray', icon: '?', text: 'Abrir Detalle' };

    return (
        <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col animate-fade-in hover:-translate-y-1 border-t-8" style={{borderColor: `var(--color-${currentStatus.color}-500, #4f46e5)`}}>
            <div className="p-5 flex-grow">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-${currentStatus.color}-100 text-${currentStatus.color}-800 mb-3`}>
                    <TruckIcon className="w-4 h-4" /> {estado}
                </div>
                <h3 className="text-xl font-bold text-gray-800 truncate">{nombre}</h3>
                <p className="text-sm text-gray-500 h-5 mt-1">Repartidor: <span className='font-semibold'>{repartidorNombre || 'Sin asignar'}</span></p>
                <p className="text-xs text-gray-400 mt-1">Creada el: {fechaCreacion.toLocaleDateString('es-AR')}</p>

                {(estado === 'En Curso' || estado === 'Completada' || estado === 'Adeuda') && (
                    <div className="mt-4 space-y-2 text-sm text-gray-700 border-t pt-3">
                        <p><strong>Dinero Cobrado:</strong> <span className="font-bold text-green-600">{formatCurrency(liveStats.dineroCobrado)}</span></p>
                        <p className="truncate"><strong>Próxima/Última Parada:</strong> <span className="font-semibold text-indigo-600">{liveStats.proximaParada}</span></p>
                    </div>
                )}
                
                <div className="mt-4">
                    <div className="flex justify-between text-sm font-medium text-gray-600">
                        <span>Progreso</span>
                        <span>{liveStats.paradasCompletadas} / {liveStats.totalParadas} paradas</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1 overflow-hidden">
                        <div className={`bg-${currentStatus.color}-600 h-2.5 rounded-full transition-all duration-500`} style={{ width: `${liveStats.progreso}%` }}></div>
                    </div>
                </div>
            </div>
            <div className="mt-auto p-4 bg-gray-50 border-t rounded-b-xl">
                <button onClick={onOpenPlanner} className="w-full flex justify-center items-center gap-2 text-center font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                    {currentStatus.icon} {currentStatus.text}
                </button>
            </div>
        </div>
    );
};


// --- RoutePlanner con la lógica de integración AFIP ---
const RoutePlanner = ({ route, onClose, pendingInvoices, repartidores, zonas, onCancelRoute, allEnrichedInvoices }) => {

    const isReadOnly = route.estado === 'En Curso' || route.estado === 'Completada' || route.estado === 'Adeuda' || route.estado === 'Anulada';
    const canCancel = route.estado === 'Planificada' || route.estado === 'En Curso';
    const [stagedInvoices, setStagedInvoices] = useState(route.facturas || []);
    const [assignedRepartidor, setAssignedRepartidor] = useState(route.repartidorId || '');
    const [selectedZone, setSelectedZone] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [afipStatus, setAfipStatus] = useState(null); // 🛑 NUEVO ESTADO PARA FEEDBACK AFIP

    useEffect(() => {
        if (isReadOnly && route.repartidorId) {
            setAssignedRepartidor(route.repartidorId);
        }
    }, [isReadOnly, route.repartidorId]);

    const filteredPendingInvoices = useMemo(() => {
        return pendingInvoices.filter(invoice => {
            const isInRoute = stagedInvoices.some(staged => staged.id === invoice.id);
            const zoneMatch = !selectedZone || invoice.zonaId === selectedZone;
            return !isInRoute && zoneMatch;
        });
    }, [pendingInvoices, stagedInvoices, selectedZone]);

    const routeSummary = useMemo(() => {
        const totalFacturas = stagedInvoices.length;
        const totalACobrar = stagedInvoices.reduce((sum, inv) => sum + (inv.totalVenta || 0), 0);
        return { totalFacturas, totalACobrar };
    }, [stagedInvoices]);
    
    const addInvoiceToRoute = (invoice) => { 
        if (!isReadOnly && !stagedInvoices.some(i => i.id === invoice.id)) { 
            setStagedInvoices(prev => [...prev, invoice]); 
        }
    };
    const removeInvoiceFromRoute = (invoiceId) => { 
        if (!isReadOnly) setStagedInvoices(prev => prev.filter(inv => inv.id !== invoiceId)); 
    };

    // Lista ordenada por fecha
    const sortedStagedInvoices = useMemo(() => {
        const hydratedList = stagedInvoices.map(inv => {
            return allEnrichedInvoices.find(fullInv => fullInv.id === inv.id) || inv;
        });

        hydratedList.sort((a, b) => {
            const dateA = a.fechaCreacion || a.fecha || new Date(0);
            const dateB = b.fechaCreacion || b.fecha || new Date(0);
            return dateA.getTime() - dateB.getTime();
        });

        return hydratedList;
    }, [stagedInvoices, allEnrichedInvoices]);
    

    // 🛑 FUNCIÓN CRÍTICA CON INTEGRACIÓN AFIP 🛑
    const handleSaveAndDispatch = async () => {
        if (isReadOnly) return;
        if (!assignedRepartidor || sortedStagedInvoices.length === 0) { alert("Selecciona facturas y un repartidor."); return; }
        
        setIsSaving(true);
        setAfipStatus(null); 
        const repartidor = repartidores.find(r => r.id === assignedRepartidor);

        // 1. Prepara las facturas con todos los datos necesarios para CF y Ruta
        const facturasCompletasParaRuta = sortedStagedInvoices.map(inv => {
            return {
                id: inv.id, 
                clienteId: inv.clienteId, 
                clienteNombre: inv.clienteNombre,
                clienteDireccion: inv.clienteDireccion, 
                totalVenta: inv.totalVenta,
                items: inv.items || [], 
                estadoVisita: 'Pendiente', 
                tipo: inv.tipo || 'venta',
                facturaAfip: inv.facturaAfip || false, // <--- CAMPO CRÍTICO
                // Datos del cliente para AFIP (se asume que están en el objeto 'cliente' enriquecido)
                numeroDocumento: inv.cliente?.numeroDocumento,
                tipoDocumento: inv.cliente?.tipoDocumento,
            };
        });
        
        // 2. Identificar ventas que requieren facturación AFIP
        const facturasAfipParaProcesar = facturasCompletasParaRuta.filter(inv => inv.facturaAfip === true);

        try {
            // 3. Transacción de Firestore (Actualiza Rutas y Ventas a 'Repartiendo')
            await runTransaction(db, async (transaction) => {
                const routeRef = doc(db, 'rutas', route.id);
                const routeDoc = await transaction.get(routeRef);
                if (!routeDoc.exists() || routeDoc.data().estado !== 'Planificada') {
                    throw new Error("La ruta ya fue modificada o despachada por otro usuario.");
                }

                // Datos minimos para guardar en el array 'facturas' de la ruta
                const facturasRutaData = facturasCompletasParaRuta.map(f => ({ 
                    id: f.id, 
                    clienteNombre: f.clienteNombre, 
                    clienteDireccion: f.clienteDireccion, 
                    totalVenta: f.totalVenta,
                    estadoVisita: f.estadoVisita 
                }));

                transaction.update(routeRef, {
                    estado: 'En Curso', repartidorId: assignedRepartidor,
                    repartidorNombre: repartidor?.nombreCompleto || 'N/A',
                    facturas: facturasRutaData, 
                    resumen: routeSummary,
                });
                
                facturasCompletasParaRuta.forEach(invoice => {
                    const invoiceRef = doc(db, 'ventas', invoice.id);
                    transaction.update(invoiceRef, { estado: 'Repartiendo', rutaId: route.id });
                });
            });

            // 4. LLAMADA A CLOUD FUNCTION (Facturación AFIP)
            if (facturasAfipParaProcesar.length > 0) {
                setAfipStatus(`Facturando ${facturasAfipParaProcesar.length} ventas AFIP... Esto puede tardar unos segundos.`);

                const result = await emitirFacturas({ ventas: facturasAfipParaProcesar });
                
                console.log("Resultado de la facturación AFIP:", result.data);
                
                const errores = result.data.filter(r => r.status === 'Error');
                if (errores.length > 0) {
                    setAfipStatus(`🛑 ERROR: ${errores.length} ventas no fueron facturadas por AFIP. Revisa los logs!`);
                    alert(`ATENCIÓN: Se despachó la ruta, pero ${errores.length} facturas AFIP fallaron. Revisa los logs de Firebase.`);
                } else {
                    setAfipStatus(`✅ Facturación AFIP exitosa para ${facturasAfipParaProcesar.length} ventas.`);
                }
            } else {
                console.log("No hay ventas marcadas para facturación AFIP en esta ruta.");
                setAfipStatus("Facturación AFIP no requerida.");
            }
            
            // 5. Reporte de Carga e Impresión
            const htmlContent = generateLoadingReportHTML(facturasCompletasParaRuta, route.nombre, repartidor?.nombreCompleto);
            printHTML(htmlContent);
            
            // 6. Cerrar
            setTimeout(onClose, 2000);

        } catch (error) {
            console.error("Error al despachar la ruta:", error);
            alert("Error al despachar la ruta: " + error.message);
            setAfipStatus(`Error en el proceso: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 animate-fade-in">
            <div className="bg-gray-100 w-11/12 max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-scale">
                <header className="p-5 bg-white border-b flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">{route.nombre}</h2>
                        <span className={`text-sm font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${getStatusBadge(route.estado)}`}>{route.estado}</span>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-red-100 text-gray-700 hover:text-red-600 transition-colors"><XIcon /></button>
                </header>
                <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
                    {/* Columna de Facturas Pendientes (Solo Planificación) */}
                    {!isReadOnly && (
                        <div className="w-full md:w-1/3 border-r bg-white p-4 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-700 mb-4 flex-shrink-0">
                                Facturas Pendientes ({filteredPendingInvoices.length})
                            </h3>
                            <div className="mb-4 flex-shrink-0">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Zona:</label>
                                <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} className="w-full p-2 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500">
                                    <option value="">Todas las Zonas</option>
                                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                </select>
                            </div>
                            <div className="overflow-y-auto flex-grow space-y-3 pr-2">
                                {filteredPendingInvoices.map(invoice => (
                                    <button key={invoice.id} onClick={() => addInvoiceToRoute(invoice)} className="w-full p-3 border border-gray-200 bg-white rounded-xl text-left hover:bg-indigo-50 hover:border-indigo-400 transition-all shadow-md flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-gray-800 truncate">{invoice.clienteNombre}</p>
                                            <p className="text-xs text-gray-500 truncate">{invoice.clienteDireccion}</p>
                                            {invoice.tipo === 'devolucion' && (
                                            <span className="mt-1 text-xs font-bold uppercase px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                                             INTERCAMBIO / DEVOLUCIÓN
                                              </span>
                                              )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-bold text-base text-indigo-600">{formatCurrency(invoice.totalVenta)}</p>
                                            <PlusIcon className="text-indigo-500 w-4 h-4 mt-1" />
                                        </div>
                                    </button>
                                ))}
                                {filteredPendingInvoices.length === 0 && <p className="text-gray-500 text-sm mt-4 italic text-center">No hay facturas pendientes en esta zona.</p>}
                            </div>
                        </div>
                    )}
                    {/* Columna de Paradas en Ruta (Planificación / Monitoreo) */}
                    <div className={`w-full ${!isReadOnly ? 'md:w-2/3' : 'md:w-full'} p-4 flex flex-col`}>
                        <div className="bg-white rounded-xl shadow-lg p-4 flex-grow flex flex-col">
                            <h4 className="font-bold text-xl mb-4 text-gray-700 flex-shrink-0 border-b pb-2">
                                Lista de Paradas ({sortedStagedInvoices.length})
                            </h4>
                            <div className="flex-grow overflow-y-auto bg-gray-50 rounded-lg p-3 space-y-3">
                                {sortedStagedInvoices.length === 0 && <p className="text-center text-gray-500 mt-8 italic">Añade facturas para planificar la ruta.</p>}
                                
                                {sortedStagedInvoices.map((invoice, index) => (
                                    <div key={invoice.id} className="flex items-center p-3 border border-gray-100 bg-white rounded-lg shadow-sm transition-shadow hover:shadow-md">
                                        <span className="text-2xl font-extrabold text-indigo-600 mr-4 w-8 flex-shrink-0 text-center">{index + 1}</span>
                                        <div className="flex-grow">
                                            <p className="font-semibold text-gray-800">{invoice.clienteNombre}</p>
                                            <p className="text-xs text-gray-500 truncate">{invoice.clienteDireccion}</p>
                                               {invoice.tipo === 'devolucion' && (
                                         <span className="mt-1 text-xs font-bold uppercase px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                                              INTERCAMBIO / DEVOLUCIÓN
                                           </span>
                                        )}
                                        </div>
                                        <div className="text-right flex items-center gap-2 flex-shrink-0">
                                            {isReadOnly && <span className={getStatusBadge(invoice.estadoVisita || 'Pendiente')}>{invoice.estadoVisita || 'Pendiente'}</span>}
                                            <span className="font-bold text-gray-700 ml-2">{formatCurrency(invoice.totalVenta)}</span>
                                            
                                            {/* Botón de Eliminar (Solo Planificación) */}
                                            {!isReadOnly && (
                                                <button onClick={() => removeInvoiceFromRoute(invoice.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors ml-2"><XIcon width={16} height={16} /></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <footer className="p-5 bg-white border-t flex justify-between items-center flex-shrink-0">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center">
                                <label className="mr-3 font-semibold text-gray-700">Asignar a:</label>
                                <select value={assignedRepartidor} onChange={(e) => setAssignedRepartidor(e.target.value)} className="border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2" disabled={isReadOnly}>
                                    <option value="" disabled>Seleccionar repartidor...</option>
                                    {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombreCompleto}</option>)}
                                </select>
                            </div>
                            <div className="font-semibold text-gray-700 border-l pl-4">Paradas: <span className="font-bold text-2xl text-indigo-600">{routeSummary.totalFacturas}</span></div>
                            <div className="font-semibold text-gray-700 border-l pl-4">Total a Cobrar: <span className="font-bold text-2xl text-indigo-600">{formatCurrency(routeSummary.totalACobrar)}</span></div>
                        </div>
                        {/* 🛑 FEEDBACK DE ESTADO AFIP */}
                         {afipStatus && (
                            <div className={`mt-2 px-3 py-1 rounded-lg text-sm font-semibold ${afipStatus.startsWith('✅') ? 'bg-green-100 text-green-700' : afipStatus.startsWith('🛑') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {afipStatus}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {canCancel && (
                            <button onClick={() => onCancelRoute(route)} className="flex items-center gap-2 px-5 py-3 bg-red-100 text-red-600 font-bold rounded-xl shadow-md hover:bg-red-200 transition-all">
                                <XIcon className="w-5 h-5"/> Anular Ruta
                            </button>
                        )}
                        {!isReadOnly && (
                            <button onClick={handleSaveAndDispatch} className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all disabled:bg-gray-400 transform hover:scale-[1.02]" disabled={!assignedRepartidor || stagedInvoices.length === 0 || isSaving}>
                                {isSaving ? 'Despachando y Facturando...' : <><TruckIcon />Guardar y Despachar</>}
                            </button>
                        )}
                        {isReadOnly && (
                            <button onClick={onClose} className="flex items-center gap-2 px-5 py-3 bg-gray-600 text-white font-bold rounded-xl shadow-lg hover:bg-gray-700 transition-all">
                                Cerrar Monitor
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default Rutas;