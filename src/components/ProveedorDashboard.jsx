import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, writeBatch, doc, limit, startAfter, endBefore, limitToLast, onSnapshot, deleteDoc, updateDoc, increment, runTransaction, Timestamp } from 'firebase/firestore';
import { useFirestore } from '../hooks/useFirestore';
import { toast } from 'react-toastify';
import Button from './Button';

const ProveedorDashboard = ({ proveedor, onBack }) => {
    const { tenantId, getTenantCollection, getTenantDoc, db } = useFirestore();
    const [compras, setCompras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingCompra, setViewingCompra] = useState(null);
    
    // PAGINACIÓN
    const [lastDoc, setLastDoc] = useState(null);
    const [firstDoc, setFirstDoc] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 10;

    const loadCompras = async (direction = 'next') => {
        if (!tenantId || !proveedor?.id) return;
        setLoading(true);
        try {
            let q = query(
                getTenantCollection('compras'),
                where('proveedorId', '==', proveedor.id),
                orderBy('fecha', 'desc')
            );

            if (direction === 'next' && lastDoc) {
                q = query(q, startAfter(lastDoc), limit(PAGE_SIZE));
            } else if (direction === 'prev' && firstDoc) {
                q = query(q, endBefore(firstDoc), limitToLast(PAGE_SIZE));
            } else {
                q = query(q, limit(PAGE_SIZE));
            }

            const snap = await getDocs(q);
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            if (docs.length > 0) {
                setFirstDoc(snap.docs[0]);
                setLastDoc(snap.docs[snap.docs.length - 1]);
                setCompras(docs);
                setHasMore(docs.length === PAGE_SIZE);
            } else {
                if (page === 1) setCompras([]);
                setHasMore(false);
            }
        } catch (e) {
            console.error(e);
            toast.error("Error al cargar historial");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadCompras(); }, [tenantId, proveedor?.id]);

    const handleNext = () => { if (hasMore) { setPage(p => p + 1); loadCompras('next'); } };
    const handlePrev = () => { if (page > 1) { setPage(p => p - 1); loadCompras('prev'); } };

    const handleDelete = async (compra) => {
        if (!window.confirm(`¿Seguro que deseas ELIMINAR la factura ${compra.nroFactura || 'S/N'}? Se revertirá el stock de los productos.`)) return;

        try {
            const batch = writeBatch(db);
            for (const item of compra.items || []) {
                const productRef = getTenantDoc('productos', item.id);
                const prodSnap = await getDocs(query(getTenantCollection('productos'), where('__name__', '==', item.id)));
                if (!prodSnap.empty) {
                    const currentStock = prodSnap.docs[0].data().stock || 0;
                    batch.update(productRef, { stock: Math.max(0, currentStock - item.cantidad) });
                }
            }
            batch.delete(getTenantDoc('compras', compra.id));
            await batch.commit();
            toast.success("Factura eliminada y stock revertido.");
            loadCompras();
        } catch (e) { toast.error("Error al eliminar"); }
    };

    // --- MOTOR DE IMPRESIÓN (CLON DE FACTURACION.JSX ADAPTADO A COMPRAS) ---
    const printPurchaseInvoice = (compra, provider) => {
        const fechaImpresion = compra.fecha instanceof Timestamp ? compra.fecha.toDate() : (compra.fecha || new Date());
        
        const itemsHtml = (compra.items || []).map(item => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-weight: 500;">${item.nombre}</td>
                <td style="text-align: center; padding: 12px;">${item.cantidad}</td>
                <td style="text-align: right; padding: 12px; color: #64748b;">$${item.costoUnitario?.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
                <td style="text-align: right; padding: 12px; font-weight: 700;">$${(item.cantidad * item.costoUnitario).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            </tr>
        `).join('');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>FACTURA DE COMPRA #${compra.nroFactura || compra.id.substring(0,8).toUpperCase()}</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 40px; font-size: 13px; color: #1e293b; background: #f8fafc; }
                    .invoice-box { max-width: 850px; margin: auto; padding: 40px; background: white; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
                    
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px; margin-bottom: 30px; }
                    .company-info { width: 55%; }
                    
                    /* LOGO NOAR ERP SYSTEM */
                    .logo-container { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
                    .logo-icon { width: 35px; height: 35px; background: #0f172a; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fbbf24; font-weight: 900; font-size: 20px; }
                    .logo-text { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
                    .logo-sub { color: #d97706; font-weight: 300; letter-spacing: 2px; font-size: 14px; margin-left: 2px; }

                    .invoice-data { text-align: right; width: 40%; }
                    .title-tag { display: inline-block; background: #f1f5f9; color: #64748b; padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
                    
                    .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
                    .info-card { background: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #6366f1; }
                    .info-title { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
                    
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; padding: 12px; background: #f8fafc; text-align: left; }
                    
                    .total-box { margin-top: 40px; padding-top: 20px; border-top: 2px solid #f1f5f9; display: flex; justify-content: flex-end; }
                    .total-amount { font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
                    
                    .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
                    @media print { body { background: white; padding: 0; } .invoice-box { border: none; box-shadow: none; max-width: 100%; } }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <div class="header">
                        <div class="company-info">
                            <div class="logo-container">
                                <div class="logo-icon">N</div>
                                <div class="logo-text">NOAR <span class="logo-sub">ERP</span></div>
                            </div>
                            <p style="margin: 0; line-height: 1.6;">
                                <strong>RECEPTOR: DIMONDICE DISTRIBUIDORA</strong><br>
                                CUIT: 30-71458962-9<br>
                                Condición IVA: Responsable Inscripto<br>
                                Buenos Aires, Argentina
                            </p>
                        </div>
                        <div class="invoice-data">
                            <span class="title-tag">Registro de Operación</span>
                            <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #0f172a;">FACTURA DE COMPRA</h1>
                            <p style="margin: 10px 0 0 0; font-weight: 600; color: #64748b;">
                                Nro: ${compra.nroFactura || 'INV-'+compra.id.substring(0,8).toUpperCase()}<br>
                                Fecha: ${fechaImpresion.toLocaleDateString('es-AR', { dateStyle: 'long' })}
                            </p>
                        </div>
                    </div>

                    <div class="info-grid">
                        <div class="info-card">
                            <div class="info-title">Proveedor (Emisor)</div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase;">${provider.nombre}</h3>
                            <p style="margin: 5px 0 0 0; color: #475569; font-weight: 500;">
                                CUIT: ${provider.cuit || 'S/D'}<br>
                                Condición: Responsable Inscripto
                            </p>
                        </div>
                        <div className="info-card" style="border-left-color: #94a3b8;">
                            <div class="info-title">Metadata de Auditoría</div>
                            <p style="margin: 0; color: #475569; font-size: 11px;">
                                ID Sistema: ${compra.id.toUpperCase()}<br>
                                Estado: <strong>${compra.estado}</strong><br>
                                Usuario Carga: Administrador
                            </p>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th width="50%">Producto / Insumo</th>
                                <th width="15%" style="text-align: center;">Cantidad</th>
                                <th width="15%" style="text-align: right;">Costo Unit.</th>
                                <th width="20%" style="text-align: right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="total-box">
                        <div style="text-align: right;">
                            <span style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Importe Total Neto Auditado</span>
                            <div class="total-amount">$${compra.total?.toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
                        </div>
                    </div>

                    <div class="footer">
                        Este documento es un registro interno de mercadería auditada generado por <strong>Noar ERP System</strong>.
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        // Esperamos a que carguen estilos (Inter Google Fonts etc si hubiera) y disparamos
        setTimeout(() => {
            printWindow.print();
        }, 800);
    };

    // --- VISTA DE PÁGINA COMPLETA (ESTACIÓN DE AUDITORÍA INDUSTRIAL) ---
    const FullInvoiceView = ({ compra, onBackToList }) => {
        return (
            <div className="flex flex-col h-full bg-slate-50 animate-fade-in overflow-hidden print:bg-white">
                {/* Barra de Control Superior (No Print) */}
                <header className="bg-white px-10 py-6 border-b border-slate-200 flex justify-between items-center z-30 shadow-sm print:hidden">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={onBackToList} 
                            className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all active:scale-95 shadow-lg group"
                        >
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            <span className="text-xs font-black uppercase tracking-widest">Volver</span>
                        </button>
                        <div className="h-8 w-px bg-slate-200" />
                        <div>
                            <h3 className="text-xl font-black text-slate-800 leading-none">Auditoría Operativa</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">SISTEMA DE COMPRAS v2.0</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="secondary" onClick={() => printPurchaseInvoice(compra, proveedor)} className="!rounded-xl text-[10px] font-black tracking-widest uppercase shadow-xl">
                            Imprimir Factura de Compra
                        </Button>
                    </div>
                </header>

                {/* Vista en Pantalla (Dashboard Pro) - No Print */}
                <div className="flex-1 flex flex-col overflow-hidden print:hidden">
                    <div className="p-10 grid grid-cols-1 md:grid-cols-4 gap-6 bg-white border-b border-slate-100">
                        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Operación</p>
                            <p className="text-3xl font-black text-indigo-600 tracking-tighter">${compra.total?.toLocaleString('es-AR', {minimumFractionDigits: 2})}</p>
                        </div>
                        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nro Comprobante</p>
                            <p className="text-xl font-black text-slate-800 tracking-tight uppercase">#{compra.nroFactura || 'INV-'+compra.id.slice(0,6).toUpperCase()}</p>
                        </div>
                        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado</p>
                            <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                compra.estado === 'PAGADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                                {compra.estado}
                            </span>
                        </div>
                        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha Arca</p>
                            <p className="text-lg font-black text-slate-700 uppercase">{compra.fecha?.toDate().toLocaleDateString('es-AR')}</p>
                        </div>
                    </div>

                    <main className="flex-1 p-10 overflow-y-auto no-scrollbar scroll-smooth">
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">PRODUCTO</th>
                                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">CANT.</th>
                                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">COSTO u.</th>
                                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">SUBTOTAL</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50/50">
                                    {compra.items?.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-indigo-50/30 transition-all">
                                            <td className="px-10 py-6 font-extrabold text-slate-800 uppercase text-sm">{item.nombre}</td>
                                            <td className="px-10 py-6 text-center font-black text-slate-700">{item.cantidad}</td>
                                            <td className="px-10 py-6 text-right font-mono text-slate-500">${item.costoUnitario?.toLocaleString('es-AR')}</td>
                                            <td className="px-10 py-6 text-right font-black text-slate-950">${(item.cantidad * item.costoUnitario).toLocaleString('es-AR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </main>
                </div>
            </div>
        );
    };

    // --- RENDERIZADO CONDICIONAL DE PÁGINA ---
    if (viewingCompra) {
        return <FullInvoiceView compra={viewingCompra} onBackToList={() => setViewingCompra(null)} />;
    }

    return (
        <div className="flex flex-col h-full animate-fade-in bg-white overflow-hidden rounded-t-[4rem]">
            {/* CABECERA 'PROLIJA' (ULTRA-CLEAN) */}
            <header className="bg-white/80 backdrop-blur-md px-12 py-10 flex justify-between items-center z-20 border-b border-slate-100/50">
                <div className="flex items-center gap-10">
                    <button onClick={onBack} className="w-14 h-14 bg-indigo-50 border-2 border-transparent hover:border-indigo-100 flex items-center justify-center rounded-[1.5rem] text-indigo-600 transition-all active:scale-90 shadow-sm">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">{proveedor?.nombre}</h2>
                        <div className="flex items-center gap-4">
                             <div className="flex bg-slate-100/50 px-3 py-1 rounded-full items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Panel de Auditoría</span>
                             </div>
                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{proveedor?.cuit || 'S/N CUIT'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-8">
                    <div className="relative group overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 p-0.5 rounded-[2.5rem] shadow-2xl shadow-orange-200">
                        <div className="bg-white rounded-[2.4rem] px-10 py-6 text-right min-w-[240px]">
                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1.5 block">Saldo Pendiente</p>
                            <div className="flex items-center justify-end gap-3">
                                <span className="text-orange-500 text-2xl font-black opacity-30">$</span>
                                <p className="text-4xl font-black text-orange-600 tracking-tighter">${proveedor?.saldo?.toLocaleString('es-AR') || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* CONTENEDOR DE LISTA DE FACTURAS (MODERNO) */}
            <main className="flex-1 px-12 py-8 overflow-y-auto no-scrollbar scroll-smooth bg-slate-50/30">
                <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] overflow-hidden">
                    <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-4">
                            <span className="w-8 h-px bg-slate-200" />
                            Historial de Compras
                            <span className="w-8 h-px bg-slate-200" />
                        </h4>
                        <div className="flex gap-2">
                             <div className="bg-slate-50 px-4 py-2 rounded-xl text-[10px] font-black text-slate-400 uppercase">Boletas registradas: {compras.length}</div>
                        </div>
                    </div>

                    <table className="w-full text-left table-auto">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-300 uppercase tracking-widest">Emisión</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-300 uppercase tracking-widest">Documento</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-300 uppercase tracking-widest">Importe Total</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-300 uppercase tracking-widest text-center">Gestión Fiscal</th>
                                <th className="px-10 py-6 text-[10px] font-black text-slate-300 uppercase tracking-widest text-right">Saldo Deuda</th>
                                <th className="px-10 w-20"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50/50">
                            {loading && page === 1 ? (
                                <tr><td colSpan="6" className="py-40 text-center text-slate-200 font-black uppercase text-[10px] animate-pulse">Sincronizando Archivos...</td></tr>
                            ) : compras.length === 0 ? (
                                <tr><td colSpan="6" className="py-40 text-center">
                                    <p className="text-slate-300 font-bold italic tracking-wide">No se encontraron boletas en el historial.</p>
                                </td></tr>
                            ) : (
                                compras.map(c => (
                                    <tr key={c.id} className="hover:bg-indigo-50/20 transition-all group animate-fade-in-up">
                                        <td className="px-10 py-8">
                                            <p className="font-black text-slate-700 text-lg">{c.fecha?.toDate().toLocaleDateString()}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{c.fecha?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} HS</p>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-3">
                                                 <div className="w-2 h-8 bg-indigo-400 rounded-full opacity-30 group-hover:opacity-100 transition-all" />
                                                 <p className="font-black text-slate-900 tracking-tight text-xl">{c.nroFactura || 'INV-'+c.id.slice(0,4)}</p>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <p className="text-2xl font-black text-slate-800 tracking-tighter">${c.total?.toLocaleString('es-AR')}</p>
                                        </td>
                                        <td className="px-10 py-8 text-center">
                                            <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                                c.estado === 'PAGADA' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                                c.estado === 'PARCIAL' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                            }`}>
                                                {c.estado}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <p className={`text-2xl font-black ${c.saldo > 0 ? 'text-orange-600' : 'text-slate-300'}`}>${c.saldo?.toLocaleString('es-AR')}</p>
                                        </td>
                                        <td className="px-10 py-8 text-right opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <div className="flex justify-end gap-4">
                                                <button onClick={() => setViewingCompra(c)} className="w-12 h-12 bg-white border border-slate-100 text-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white hover:shadow-xl hover:shadow-indigo-100 transition-all">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                                <button onClick={() => handleDelete(c)} className="w-12 h-12 bg-white border border-slate-100 text-slate-300 rounded-2xl flex items-center justify-center hover:bg-rose-600 hover:text-white hover:border-transparent hover:shadow-xl hover:shadow-rose-100 transition-all">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* PAGINACIÓN 'ENTERPRISE' */}
                    <footer className="px-10 py-10 bg-slate-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                             <div className="px-4 py-1.5 bg-white border border-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">SISTEMA DE AUDITORÍA v2.0</div>
                             <p className="text-[10px] font-black text-slate-300 uppercase">Pág. {page}</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={handlePrev} disabled={page === 1} className="px-8 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-500 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-30 transition-all flex items-center gap-2 uppercase tracking-widest">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7 7-7" /></svg>
                                Anterior
                            </button>
                            <button onClick={handleNext} disabled={!hasMore} className="px-8 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-indigo-600 hover:bg-indigo-600 hover:text-white disabled:opacity-30 transition-all flex items-center gap-2 uppercase tracking-widest shadow-sm">
                                Siguiente
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </footer>
                </div>
            </main>
        </div>
    );
};

export default ProveedorDashboard;
