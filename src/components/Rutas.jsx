import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, where, doc, writeBatch, Timestamp, addDoc, updateDoc, runTransaction, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; 

// Inicializamos Cloud Functions
const functions = getFunctions(); 
const emitirFacturas = httpsCallable(functions, 'emitirFacturasReparto');

// --- ICONOGRAFÍA (Outline Premium) ---
const TruckIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17H5a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5"/><path d="M15 17h4.5a2 2 0 0 0 2-2V9.5a2 2 0 0 0-2-2H18"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
const SearchIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const PlusIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const XIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const ArrowRightIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const CheckCircleIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const PrinterIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const ArchiveIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>;
const ChevronDownIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const EditIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const EyeIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const TrashIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const SettingsIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

// --- UTILIDADES ---
const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

const printHTML = (htmlContent) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
    } else {
        alert("El navegador bloqueó la impresión. Por favor, deshabilite el bloqueador de pop-ups.");
    }
};

// --- GENERACIÓN DE PDFS (INTACTOS) ---
const generateLoadingReportHTML = (invoices, routeName, repartidorNombre) => {
    const productSummary = new Map();
    invoices.forEach(invoice => {
        (invoice.items || []).forEach(item => {
            const key = item.productId || item.nombre; 
            if (!key) return;
            const existing = productSummary.get(key);
            if (existing) { existing.quantity += item.quantity; } else { productSummary.set(key, { nombre: item.nombre, quantity: item.quantity }); }
        });
    });
    const productList = Array.from(productSummary.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    const itemsRows = productList.map(item => `<tr><td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td><td style="padding: 8px; border: 1px solid #ddd;">${item.nombre}</td></tr>`).join('');
    return `<html><head><title>Reporte de Carga - ${routeName}</title><style>body{font-family: Arial, sans-serif; margin: 20px;} h1, h2, h3 {color: #333;} table{width: 100%; border-collapse: collapse; margin-top: 20px;} th, td{padding: 12px; text-align: left;} thead{background-color: #f2f2f2;}</style></head><body><h1>Reporte de Carga para Depósito</h1><h2>Ruta: ${routeName}</h2><h3>Repartidor: ${repartidorNombre}</h3><p>Fecha de Emisión: ${new Date().toLocaleString('es-AR')}</p><hr/><table><thead><tr><th style="width:150px;">Cantidad a Cargar</th><th>Producto</th></tr></thead><tbody>${itemsRows}</tbody></table></body></html>`;
};

const generateInvoiceHtmlContent = (venta, clientDetails, zonaNombre) => {
    const fechaImpresion = venta.fecha ? (venta.fecha instanceof Date ? venta.fecha : new Date(venta.fecha.seconds * 1000)) : new Date();
    const itemsHtml = (venta.items || []).map(item => `
        <tr class="item"><td>${item.nombre}</td><td class="text-center">${item.quantity}</td><td class="text-right">${formatCurrency(item.precio)}</td><td class="text-right">${formatCurrency(item.quantity * item.precio)}</td></tr>
        ${item.promoAplicada ? `<tr class="promotion"><td colspan="4"><span class="promo-tag">Promo Aplicada:</span> ${item.promoAplicada}</td></tr>` : ''}
    `).join('');
    return `
        <div class="invoice-box" style="border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,.15); border-radius: 8px; padding: 30px; margin: auto;">
            <div class="header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div class="company-details" style="text-align: left;"><h1>Distribuidora La Llave</h1><p>Dirección, Ciudad<br>Teléfono: 3804-798844</p></div>
                <div class="invoice-details" style="text-align: right;">
                    <h2>FACTURA</h2>
                    <p><strong>Nº:</strong> ${venta.numeroFactura || venta.id.substring(0, 8)}<br><strong>Fecha:</strong> ${fechaImpresion.toLocaleDateString('es-AR')}<br><strong>Vendedor:</strong> ${venta.vendedorNombre || venta.vendedorName || 'N/A'}</p>
                </div>
            </div>
            <div class="client-info" style="margin-top: 30px; padding: 15px; background-color: #f7f7f7; border-radius: 5px;">
                <strong>Cliente:</strong> ${venta.clienteNombre || clientDetails.nombre || 'Consumidor Final'}<br><strong>Dirección:</strong> ${clientDetails.direccion || 'N/A'}<br><strong>Teléfono:</strong> ${clientDetails.telefono || 'N/A'} | <strong>CUIT/DNI:</strong> ${clientDetails.numeroDocumento || 'N/A'}<br><strong>Zona:</strong> ${zonaNombre}
            </div>
            <table class="details-table" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead><tr><th style="padding: 10px;">Producto</th><th class="text-center" style="padding: 10px; text-align: center;">Cant.</th><th class="text-right" style="padding: 10px; text-align: right;">P. Unit.</th><th class="text-right" style="padding: 10px; text-align: right;">Subtotal</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <table class="totals-table" style="width: 40%; margin-left: 60%; margin-top: 20px;"><tr class="total"><td style="padding: 8px;">TOTAL</td><td class="text-right" style="padding: 8px; text-align: right;">${formatCurrency(venta.totalVenta)}</td></tr></table>
            ${venta.observaciones ? `<div class="mt-4 p-3 border rounded-md text-sm bg-gray-50"><strong>Observaciones:</strong> ${venta.observaciones}</div>` : ''}
            <div class="footer" style="margin-top: 30px; text-align: center; font-size: 10px; color: #888;">Gracias por su compra. El estado de esta factura es: <strong>${venta.estado}</strong>.</div>
        </div>`;
};

const generateSettlementReportHTML = (route, invoices) => {
    const resumen = invoices.reduce((acc, fac) => {
        acc.efectivo += fac.pagoEfectivo || 0;
        acc.transferencia += fac.pagoTransferencia || 0;
        acc.saldoPendiente += fac.saldoPendiente || 0;
        acc.totalVenta += fac.totalVenta || 0;
        return acc;
    }, { efectivo: 0, transferencia: 0, saldoPendiente: 0, totalVenta: 0 });

    const devolucionesSummary = new Map();
    invoices.forEach(invoice => {
        if (invoice.estado === 'Anulada') {
            (invoice.items || []).forEach(item => {
                const qty = item.originalQuantity || item.quantity;
                if (!qty) return;
                const key = item.productId || item.nombre;
                const existing = devolucionesSummary.get(key) || { nombre: item.nombre, quantity: 0 };
                devolucionesSummary.set(key, { ...existing, quantity: existing.quantity + qty });
            });
        } else {
            (invoice.items || []).forEach(item => {
                const original = item.originalQuantity !== undefined ? item.originalQuantity : item.quantity;
                const final = item.quantity;
                const diff = original - final;
                if (diff > 0) {
                    const key = item.productId || item.nombre;
                    const existing = devolucionesSummary.get(key) || { nombre: item.nombre, quantity: 0 };
                    devolucionesSummary.set(key, { ...existing, quantity: existing.quantity + diff });
                }
            });
        }
    });

    const devolucionesRows = Array.from(devolucionesSummary.values()).map(item => `<tr><td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td><td style="padding: 8px; border: 1px solid #ddd;">${item.nombre}</td></tr>`).join('');
    const facturasRows = invoices.map(inv => `<tr><td style="padding: 8px; border: 1px solid #ddd;">${inv.clienteNombre}</td><td style="padding: 8px; border: 1px solid #ddd;">${inv.estado}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(inv.totalVenta)}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(inv.pagoEfectivo || 0)}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(inv.pagoTransferencia || 0)}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: red;">${formatCurrency(inv.saldoPendiente)}</td></tr>`).join('');

    return `<html><head><title>Rendición - ${route.nombre}</title><style>body{font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333;} h1, h2, h3 {color: #2c3e50;} table{width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px;} th, td{padding: 10px; text-align: left; border-bottom: 1px solid #eee;} th{background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; font-size: 11px; color: #7f8c8d;} .box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 20px; background: #fafafa; } .amount { text-align: right; } .danger { color: #e74c3c; } .success { color: #27ae60; }</style></head><body>
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3498db; padding-bottom: 10px;"><div><h1 style="margin:0;">Reporte de Rendición</h1><p style="margin:5px 0; color: #7f8c8d;">Ruta: <strong>${route.nombre}</strong> | Repartidor: <strong>${route.repartidorNombre}</strong></p></div><div style="text-align: right;"><p style="font-size: 12px;">Fecha Cierre: ${new Date().toLocaleString('es-AR')}</p></div></div>
        <h3>1. Resumen Financiero</h3><div class="box"><table style="margin:0;"><tr><td>Total Rendido en Efectivo:</td><td class="amount success" style="font-size: 16px;">${formatCurrency(resumen.efectivo)}</td></tr><tr><td>Total Rendido en Transferencias:</td><td class="amount success" style="font-size: 16px;">${formatCurrency(resumen.transferencia)}</td></tr><tr><td>Deuda (Saldo Pendiente):</td><td class="amount danger" style="font-size: 16px;">${formatCurrency(resumen.saldoPendiente)}</td></tr><tr style="border-top: 2px solid #ddd;"><td><strong>TOTAL GENERAL RUTA:</strong></td><td class="amount" style="font-size: 18px;"><strong>${formatCurrency(resumen.totalVenta)}</strong></td></tr></table></div>
        <h3>2. Control de Mercadería (Reingreso al Stock)</h3>${devolucionesRows.length > 0 ? `<table><thead><tr><th style="width:100px; text-align:center;">Cant. Devuelta</th><th>Producto</th></tr></thead><tbody>${devolucionesRows}</tbody></table>` : '<p style="font-style: italic; color: #7f8c8d;">No se registraron devoluciones.</p>'}
        <h3>3. Detalle por Cliente</h3><table><thead><tr><th>Cliente</th><th>Estado</th><th class="amount">Total</th><th class="amount">Efectivo</th><th class="amount">Transf.</th><th class="amount">Saldo</th></tr></thead><tbody>${facturasRows}</tbody></table>
        <div style="margin-top: 50px; border-top: 1px solid #ccc; padding-top: 10px; display: flex; justify-content: space-between;"><div style="text-align: center; width: 40%;"><p style="margin-top: 40px; border-top: 1px solid #000;">Firma Responsable Caja</p></div><div style="text-align: center; width: 40%;"><p style="margin-top: 40px; border-top: 1px solid #000;">Firma Repartidor</p></div></div></body></html>`;
};

// --- HOOK DE DATOS ---
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

// --- COMPONENTE PLANIFICADOR SPLIT VIEW PRO ---
const PlannerView = ({ route, onClose, allPendingInvoices, repartidores, zonas, vendors, onDispatch, isReadOnly = false }) => {
    const [filterZone, setFilterZone] = useState('');
    const [filterVendor, setFilterVendor] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoices, setSelectedInvoices] = useState(route.facturas || []);
    const [assignedRepartidor, setAssignedRepartidor] = useState(route.repartidorId || '');
    const [isDispatching, setIsDispatching] = useState(false);

    const availableInvoices = useMemo(() => {
        return allPendingInvoices.filter(inv => {
            const alreadySelected = selectedInvoices.some(sel => sel.id === inv.id);
            if (alreadySelected) return false;
            
            const matchesZone = filterZone ? inv.zonaId === filterZone : true;
            const matchesVendor = filterVendor ? inv.vendedorId === filterVendor : true;
            const matchesSearch = searchTerm 
                ? (inv.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   inv.clienteDireccion.toLowerCase().includes(searchTerm.toLowerCase()))
                : true;
            return matchesZone && matchesVendor && matchesSearch;
        }).sort((a, b) => (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0));
    }, [allPendingInvoices, selectedInvoices, filterZone, filterVendor, searchTerm]);

    const handleAddAllFiltered = () => setSelectedInvoices(prev => [...prev, ...availableInvoices]);
    const handleAddOne = (invoice) => setSelectedInvoices(prev => [...prev, invoice]);
    const handleRemoveOne = (invoiceId) => setSelectedInvoices(prev => prev.filter(inv => inv.id !== invoiceId));

    const routeSummary = useMemo(() => {
        const totalMoney = selectedInvoices.reduce((acc, curr) => acc + (curr.totalVenta || 0), 0);
        return { totalMoney, totalStops: selectedInvoices.length };
    }, [selectedInvoices]);

    const handleConfirmDispatch = async () => {
        if (!assignedRepartidor) return alert("Debes asignar un repartidor.");
        if (selectedInvoices.length === 0) return alert("La ruta está vacía.");
        setIsDispatching(true);
        try {
            await onDispatch(route.id, assignedRepartidor, selectedInvoices, routeSummary);
            onClose();
        } catch (error) {
            alert("Error al despachar: " + error.message);
            setIsDispatching(false);
        }
    };

    const isEditMode = route.estado === 'En Curso';

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4">
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* HEADER */}
                <div className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <TruckIcon className="text-indigo-600"/> {isReadOnly ? 'Monitor de Ruta' : (isEditMode ? 'Editar Ruta Activa' : 'Nueva Ruta')}
                        </h2>
                        <p className="text-xs text-gray-500 font-medium mt-1">ID: {route.nombre}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="flex-grow flex overflow-hidden">
                    {/* IZQUIERDA (Origen) */}
                    {!isReadOnly && (
                        <div className="w-5/12 flex flex-col border-r border-gray-100 bg-gray-50/50">
                            <div className="p-4 space-y-3 border-b border-gray-100 bg-white/50 backdrop-blur-md">
                                <div className="relative">
                                    <SearchIcon className="absolute left-3 top-2.5 text-gray-400 w-4 h-4"/>
                                    <input type="text" placeholder="Buscar cliente, dirección..." className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="flex gap-2">
                                    <select className="flex-1 py-2 px-3 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 focus:ring-2 focus:ring-indigo-500/20 outline-none" value={filterZone} onChange={e => setFilterZone(e.target.value)}>
                                        <option value="">Todas las Zonas</option>
                                        {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                    </select>
                                    <select className="flex-1 py-2 px-3 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 focus:ring-2 focus:ring-indigo-500/20 outline-none" value={filterVendor} onChange={e => setFilterVendor(e.target.value)}>
                                        <option value="">Todos los Vendedores</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.nombreCompleto}</option>)}
                                    </select>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{availableInvoices.length} PENDIENTES</span>
                                    <button onClick={handleAddAllFiltered} disabled={availableInvoices.length === 0} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <PlusIcon className="w-3 h-3"/> AGREGAR TODO
                                    </button>
                                </div>
                            </div>
                            <div className="flex-grow overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                {availableInvoices.map(inv => (
                                    <div key={inv.id} className="group bg-white border border-gray-100 rounded-xl p-3 hover:shadow-md hover:border-indigo-200 transition-all flex justify-between items-center cursor-pointer" onClick={() => handleAddOne(inv)}>
                                        <div className="min-w-0 flex-1 mr-2">
                                            <p className="font-bold text-gray-800 text-xs truncate">{inv.clienteNombre}</p>
                                            <p className="text-[10px] text-gray-500 truncate">{inv.clienteDireccion}</p>
                                            {inv.tipo === 'devolucion' && <span className="mt-1 inline-block text-[9px] font-bold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md border border-orange-100">DEVOLUCIÓN</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-700 text-xs">{formatCurrency(inv.totalVenta)}</span>
                                            <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><ArrowRightIcon className="w-3 h-3"/></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DERECHA (Destino) */}
                    <div className={`${isReadOnly ? 'w-full' : 'w-7/12'} flex flex-col bg-white relative`}>
                        <div className="p-4 border-b border-gray-100 bg-white z-10">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Repartidor Asignado</label>
                            <select className="w-full bg-gray-50 border border-gray-200 text-gray-800 font-medium rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-70" value={assignedRepartidor} onChange={e => setAssignedRepartidor(e.target.value)} disabled={isReadOnly}>
                                <option value="">-- Seleccionar Chofer --</option>
                                {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombreCompleto}</option>)}
                            </select>
                        </div>

                        <div className="flex-grow overflow-y-auto p-3 space-y-2 bg-gray-50/30 custom-scrollbar">
                            {selectedInvoices.map((inv, index) => (
                                <div key={inv.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex justify-between items-center group">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <span className="bg-indigo-50 text-indigo-600 font-bold text-[10px] w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 border border-indigo-100">{index + 1}</span>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-800 text-sm truncate">{inv.clienteNombre}</p>
                                            <p className="text-xs text-gray-500 truncate">{inv.clienteDireccion}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isReadOnly && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.estadoVisita === 'Pagada' ? 'bg-green-100 text-green-700' : inv.estadoVisita === 'Pendiente' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'}`}>{inv.estadoVisita || 'Pendiente'}</span>}
                                        <span className="font-bold text-gray-700 text-sm">{formatCurrency(inv.totalVenta)}</span>
                                        {!isReadOnly && (
                                            <button onClick={() => handleRemoveOne(inv.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"><XIcon className="w-4 h-4"/></button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {selectedInvoices.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                    <TruckIcon className="w-12 h-12 mb-2 text-gray-300"/>
                                    <p className="text-sm font-medium">La ruta está vacía</p>
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        {!isReadOnly && (
                            <div className="bg-white border-t border-gray-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex gap-6">
                                        <div className="text-xs text-gray-500">Paradas <span className="block text-lg font-bold text-gray-800">{routeSummary.totalStops}</span></div>
                                        <div className="text-xs text-gray-500">Total <span className="block text-lg font-bold text-indigo-600">{formatCurrency(routeSummary.totalMoney)}</span></div>
                                    </div>
                                </div>
                                <button onClick={handleConfirmDispatch} disabled={isDispatching || !assignedRepartidor || selectedInvoices.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2 active:scale-[0.99]">
                                    {isDispatching ? <span className="animate-pulse">Procesando...</span> : <><TruckIcon className="w-5 h-5"/> {isEditMode ? 'GUARDAR CAMBIOS' : 'CONFIRMAR Y DESPACHAR'}</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL RUTAS ---
function Rutas() {
    const [isPlannerOpen, setIsPlannerOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [activeTab, setActiveTab] = useState('planificacion');
    const [plannerReadOnly, setPlannerReadOnly] = useState(false); // Nuevo estado para modo lectura

    const routesQuery = useMemo(() => query(collection(db, 'rutas'), where('estado', '!=', 'Archivada'), orderBy('fechaCreacion', 'desc')), []);
    const invoicesQuery = useMemo(() => query(collection(db, 'ventas'), where('estado', '!=', 'Archivada')), []);
    const vendorsQuery = useMemo(() => query(collection(db, 'vendedores')), []);
    const clientesQuery = useMemo(() => query(collection(db, 'clientes')), []);
    const zonasQuery = useMemo(() => query(collection(db, 'zonas')), []);
    
    const { data: routes, isLoading: routesLoading } = useFirestoreSubscription(routesQuery);
    const { data: allInvoices, isLoading: invoicesLoading } = useFirestoreSubscription(invoicesQuery);
    const { data: allVendors, isLoading: vendorsLoading } = useFirestoreSubscription(vendorsQuery);
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
                numeroDocumento: cliente?.numeroDocumento,
                tipoDocumento: cliente?.tipoDocumento,
                vendedorId: invoice.vendedorId // Aseguramos que esto exista para el filtro
            };
        });
    }, [allInvoices, clientes]);

    const pendingInvoices = useMemo(() => enrichedInvoices.filter(inv => inv.estado === 'Pendiente de Entrega'), [enrichedInvoices]);
    const repartidoresOnly = useMemo(() => allVendors.filter(v => v.rango === 'Reparto' || v.rango === 'Administrador'), [allVendors]);

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
            setPlannerReadOnly(false);
            setIsPlannerOpen(true);
        } catch (error) { console.error("Error al crear la ruta:", error); }
    };

    const handleDispatchRoute = async (routeId, repartidorId, facturas, resumen) => {
        const repartidor = allVendors.find(r => r.id === repartidorId);
        const facturasAfipParaProcesar = facturas.filter(inv => inv.facturaAfip === true);
        
        const originalRoute = routes.find(r => r.id === routeId);
        const originalInvoiceIds = (originalRoute?.facturas || []).map(f => f.id);
        const newInvoiceIds = facturas.map(f => f.id);
        const removedInvoices = originalInvoiceIds.filter(id => !newInvoiceIds.includes(id));

        await runTransaction(db, async (transaction) => {
            const routeRef = doc(db, 'rutas', routeId);
            const facturasRutaData = facturas.map(f => ({ 
                id: f.id, clienteNombre: f.clienteNombre, clienteDireccion: f.clienteDireccion, 
                totalVenta: f.totalVenta, estadoVisita: f.estadoVisita || 'Pendiente' 
            }));

            transaction.update(routeRef, {
                estado: 'En Curso', repartidorId, repartidorNombre: repartidor?.nombreCompleto || 'N/A',
                facturas: facturasRutaData, resumen
            });

            facturas.forEach(invoice => {
                const invoiceRef = doc(db, 'ventas', invoice.id);
                transaction.update(invoiceRef, { estado: 'Repartiendo', rutaId: routeId });
            });

            removedInvoices.forEach(id => {
                const invoiceRef = doc(db, 'ventas', id);
                transaction.update(invoiceRef, { estado: 'Pendiente de Entrega', rutaId: null });
            });
        });

        if (facturasAfipParaProcesar.length > 0) {
            try { await emitirFacturas({ ventas: facturasAfipParaProcesar }); } catch (e) { alert("Error en AFIP: " + e.message); }
        }

        let allPrintContent = '';
        const loadingReportHtml = generateLoadingReportHTML(facturas, selectedRoute?.nombre, repartidor?.nombreCompleto);
        allPrintContent += `<div style="padding: 20px;">${loadingReportHtml}</div><div style="page-break-after: always;"></div>`;
        for (const factura of facturas) {
            const fullClient = clientes.find(c => c.id === factura.clienteId) || {};
            const zonaNombre = fullClient.zonaId ? (zonas.find(z => z.id === fullClient.zonaId)?.nombre || 'N/A') : 'N/A';
            const invoiceHtml = generateInvoiceHtmlContent(factura, fullClient, zonaNombre);
            allPrintContent += `<div style="padding: 20px;">${invoiceHtml}</div><div style="page-break-after: always;"></div>`;
        }
        printHTML(`<html><body>${allPrintContent}</body></html>`);
    };

    const handleCancelRoute = async (routeToCancel) => {
        if (!window.confirm(`¿ATENCIÓN: Anular la ruta "${routeToCancel.nombre}"?\n\nTodas las facturas volverán a estado 'Pendiente de Entrega'.`)) return;
        try {
            await runTransaction(db, async (transaction) => {
                const routeRef = doc(db, 'rutas', routeToCancel.id);
                transaction.update(routeRef, { estado: 'Anulada', fechaAnulacion: Timestamp.now() });
                for (const facturaRef of (routeToCancel.facturas || [])) {
                    const invoiceRef = doc(db, 'ventas', facturaRef.id);
                    transaction.update(invoiceRef, { estado: 'Pendiente de Entrega', rutaId: null });
                }
            });
            alert("Ruta anulada correctamente.");
        } catch (error) { console.error(error); alert("Error al anular."); }
    };

    const handleViewRoute = (route) => {
        setSelectedRoute(route);
        setPlannerReadOnly(true); // MODO SOLO LECTURA
        setIsPlannerOpen(true);
    };

    const handleEditInProgress = (route) => {
        setSelectedRoute(route);
        setPlannerReadOnly(false); // MODO EDICIÓN
        setIsPlannerOpen(true);
    };

    if (routesLoading || invoicesLoading || vendorsLoading || clientesLoading || zonasLoading) {
        return <div className="text-center p-10 text-gray-500 font-semibold">Cargando datos...</div>;
    }

    const planificadas = routes.filter(r => r.estado === 'Planificada');
    const enCurso = routes.filter(r => r.estado === 'En Curso');
    const rendicion = routes.filter(r => r.estado === 'Completada' || r.estado === 'Adeuda');
    const anuladas = routes.filter(r => r.estado === 'Anulada'); 

    return (
        <div className="p-8 bg-gray-50 min-h-screen font-sans">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestión Logística</h1>
                    <p className="text-gray-500 mt-1">Control de flota y entregas en tiempo real</p>
                </div>
                <button onClick={handleCreateNewRoute} className="flex items-center gap-3 px-6 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-xl hover:bg-black transition-all transform hover:scale-105 active:scale-95">
                    <PlusIcon className="text-white" /> Nueva Ruta
                </button>
            </header>

            {/* TABS PREMIUM (SEGMENTED CONTROL STYLE) */}
            <div className="flex justify-center mb-10">
                <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 inline-flex relative">
                    <TabButton name="planificacion" activeTab={activeTab} onClick={setActiveTab}>Planificación ({planificadas.length})</TabButton>
                    <TabButton name="en_curso" activeTab={activeTab} onClick={setActiveTab}>En Curso ({enCurso.length})</TabButton>
                    <TabButton name="rendicion" activeTab={activeTab} onClick={setActiveTab}>Rendición ({rendicion.length})</TabButton>
                    <TabButton name="anuladas" activeTab={activeTab} onClick={setActiveTab}>Histórico</TabButton>
                </div>
            </div>

            <div className="animate-fade-in">
                {activeTab === 'planificacion' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {planificadas.map(route => (
                            <RouteCard 
                                key={route.id} 
                                route={route} 
                                onOpenPlanner={() => { setSelectedRoute(route); setPlannerReadOnly(false); setIsPlannerOpen(true); }} 
                                allInvoices={enrichedInvoices} 
                            />
                        ))}
                        {planificadas.length === 0 && <EmptyState message="No hay rutas pendientes de planificación." />}
                    </div>
                )}

                {activeTab === 'en_curso' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {enCurso.map(route => (
                            <RouteCard 
                                key={route.id} 
                                route={route} 
                                onOpenPlanner={() => handleViewRoute(route)} 
                                onEdit={() => handleEditInProgress(route)}
                                onCancel={() => handleCancelRoute(route)}
                                allInvoices={enrichedInvoices} 
                                readOnly={false}
                            />
                        ))}
                        {enCurso.length === 0 && <EmptyState message="No hay camiones en la calle ahora mismo." />}
                    </div>
                )}

                {activeTab === 'rendicion' && <TabContentRendicion routes={rendicion} allInvoices={enrichedInvoices} />}
                
                {activeTab === 'anuladas' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {anuladas.map(route => <RouteCard key={route.id} route={route} onOpenPlanner={() => handleViewRoute(route)} allInvoices={enrichedInvoices} readOnly />)}
                    </div>
                )}
            </div>

            {isPlannerOpen && selectedRoute && (
                <PlannerView 
                    route={selectedRoute} 
                    onClose={() => { setIsPlannerOpen(false); setSelectedRoute(null); }} 
                    allPendingInvoices={pendingInvoices}
                    repartidores={repartidoresOnly} 
                    zonas={zonas}
                    vendors={allVendors}
                    onDispatch={handleDispatchRoute}
                    isReadOnly={plannerReadOnly}
                />
            )}
        </div>
    );
}

// --- COMPONENTES UI ---
const TabButton = ({ name, activeTab, onClick, children }) => {
    const isActive = activeTab === name;
    return (
        <button 
            onClick={() => onClick(name)} 
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${isActive ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
        >
            {children}
        </button>
    );
};

const EmptyState = ({ message }) => (
    <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm opacity-80">
        <div className="bg-gray-50 p-4 rounded-full mb-4"><TruckIcon className="w-8 h-8 text-gray-300"/></div>
        <p className="text-gray-400 font-medium">{message}</p>
    </div>
);

const RouteCard = ({ route, onOpenPlanner, allInvoices, readOnly, onEdit, onCancel }) => {
    const { estado, nombre, repartidorNombre, facturas } = route;
    const liveStats = useMemo(() => {
        const routeInvoiceIds = (facturas || []).map(f => f.id);
        const currentInvoices = allInvoices.filter(inv => routeInvoiceIds.includes(inv.id));
        const total = currentInvoices.length;
        const completed = currentInvoices.filter(i => i.estado !== 'Repartiendo' && i.estado !== 'Pendiente de Entrega').length;
        const progress = total > 0 ? (completed / total) * 100 : 0;
        return { total, completed, progress };
    }, [facturas, allInvoices]);

    const statusConfig = {
        'Planificada': { color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
        'En Curso': { color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
        'Completada': { color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
        'Adeuda': { color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
        'Anulada': { color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    };
    const status = statusConfig[estado] || statusConfig['Planificada'];

    return (
        <div className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex flex-col relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`}></span> {estado}
                </span>
                {estado === 'Planificada' && !readOnly && (
                    <button onClick={onOpenPlanner} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"><EditIcon/></button>
                )}
            </div>

            <div className="relative z-10">
                <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{nombre}</h3>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1"><TruckIcon className="w-3 h-3"/> {repartidorNombre || 'Sin asignar'}</p>
            </div>

            {/* Barra de Progreso Minimalista */}
            {(estado === 'En Curso' || estado === 'Completada' || estado === 'Adeuda') && (
                <div className="mt-6 mb-2">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1.5">
                        <span>PROGRESO</span>
                        <span>{Math.round(liveStats.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ease-out ${status.dot}`} style={{width: `${liveStats.progress}%`}}></div>
                    </div>
                </div>
            )}

            {/* BOTONERA DE ACCIONES FLOTANTES (SOLO EN CURSO) */}
            {estado === 'En Curso' && !readOnly && (
                <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-dashed border-gray-100">
                    <button onClick={onOpenPlanner} title="Monitorizar" className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:scale-110 transition-all shadow-sm border border-blue-100">
                        <EyeIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={onEdit} title="Editar Ruta" className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center hover:bg-yellow-100 hover:scale-110 transition-all shadow-sm border border-yellow-100">
                        <EditIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={onCancel} title="Anular" className="w-10 h-10 rounded-full bg-white text-gray-300 flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all border border-gray-100">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
            )}

            {estado === 'Planificada' && !readOnly && (
                <button onClick={onOpenPlanner} className="mt-6 w-full py-3 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-md">
                    GESTIONAR <ArrowRightIcon className="w-3 h-3"/>
                </button>
            )}
        </div>
    );
};

// --- COMPONENTE RENDICIÓN (MESA DE CONTROL CLEAN) ---
const TabContentRendicion = ({ routes, allInvoices }) => {
    const [expandedRouteId, setExpandedRouteId] = useState(null);
    const [blindCounts, setBlindCounts] = useState({}); 

    const handleBlindCountChange = (routeId, field, value) => {
        setBlindCounts(prev => ({...prev, [routeId]: { ...prev[routeId], [field]: parseFloat(value) || 0 }}));
    };

    const handleArchiveRoute = async (route) => {
        const counts = blindCounts[route.id] || { efectivo: 0, transferencia: 0 };
        if (!window.confirm(`¿Confirmar cierre de ruta?\n\nEsta acción es irreversible y actualizará el stock de devoluciones.`)) return;
        try {
            await updateDoc(doc(db, 'rutas', route.id), { estado: 'Archivada', fechaCierre: Timestamp.now(), rendicionFinal: counts });
            alert("Ruta cerrada y archivada.");
        } catch (e) { console.error(e); alert("Error al cerrar."); }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {routes.map(route => {
                const routeInvoices = allInvoices.filter(i => (route.facturas || []).some(f => f.id === i.id));
                const totals = routeInvoices.reduce((acc, i) => ({
                    efectivo: acc.efectivo + (i.pagoEfectivo || 0),
                    transferencia: acc.transferencia + (i.pagoTransferencia || 0),
                    pendiente: acc.pendiente + (i.saldoPendiente || 0)
                }), { efectivo: 0, transferencia: 0, pendiente: 0 });

                const isExpanded = expandedRouteId === route.id;
                const diffEfectivo = (blindCounts[route.id]?.efectivo || 0) - totals.efectivo;

                return (
                    <div key={route.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md">
                        <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}>
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-50 p-3 rounded-full text-blue-600"><TruckIcon className="w-6 h-6"/></div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{route.nombre}</h3>
                                    <p className="text-sm text-gray-500 font-medium">{route.repartidorNombre}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right hidden md:block">
                                    <span className="text-xs font-bold text-gray-400 uppercase block mb-0.5">A Rendir (Total)</span>
                                    <span className="text-xl font-bold text-gray-900">{formatCurrency(totals.efectivo + totals.transferencia)}</span>
                                </div>
                                <button className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-gray-200' : ''}`}>
                                    <ChevronDownIcon className="w-5 h-5 text-gray-600"/>
                                </button>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="bg-gray-50/50 border-t border-gray-100 p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* PANEL DE INGRESO (ARQUEO) */}
                                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                        <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-6">1. Arqueo de Valores (Mesa de Entrada)</h4>
                                        <div className="space-y-5">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Efectivo Contado</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-3.5 text-gray-400 font-bold">$</span>
                                                    <input type="number" className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="0.00" onChange={e => handleBlindCountChange(route.id, 'efectivo', e.target.value)} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Transferencias</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-3.5 text-gray-400 font-bold">$</span>
                                                    <input type="number" className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="0.00" value={blindCounts[route.id]?.transferencia || ''} onChange={e => handleBlindCountChange(route.id, 'transferencia', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PANEL DE RESULTADO */}
                                    <div className="flex flex-col justify-between">
                                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-4 flex-grow">
                                            <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-6">2. Validación de Caja</h4>
                                            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-50">
                                                <span className="text-gray-500 font-medium">Sistema dice (Efectivo):</span>
                                                <span className="font-bold text-gray-900">{formatCurrency(totals.efectivo)}</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-6">
                                                <span className="text-gray-500 font-medium">Ingresado (Real):</span>
                                                <span className="font-bold text-blue-600">{formatCurrency(blindCounts[route.id]?.efectivo || 0)}</span>
                                            </div>
                                            <div className={`p-4 rounded-xl flex justify-between items-center ${diffEfectivo === 0 ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : diffEfectivo > 0 ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
                                                <div className="flex items-center gap-2">
                                                    {diffEfectivo === 0 ? <CheckCircleIcon className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                                                    <span className="font-bold uppercase text-sm tracking-wide">{diffEfectivo === 0 ? 'BALANCEADO' : diffEfectivo > 0 ? 'SOBRANTE' : 'FALTANTE'}</span>
                                                </div>
                                                <span className="font-extrabold text-xl">{formatCurrency(Math.abs(diffEfectivo))}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-3">
                                            <button onClick={() => printHTML(generateSettlementReportHTML(route, routeInvoices))} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all flex justify-center items-center gap-2">
                                                <PrinterIcon className="w-5 h-5 text-gray-400"/> Reporte
                                            </button>
                                            <button onClick={() => handleArchiveRoute(route)} className="flex-[2] py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all flex justify-center items-center gap-2">
                                                <ArchiveIcon className="w-5 h-5"/> Cerrar Ruta
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
            {routes.length === 0 && <EmptyState message="No hay rutas pendientes de rendición." />}
        </div>
    );
};

export default Rutas;