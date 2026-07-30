import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, where, doc, writeBatch, Timestamp, addDoc, updateDoc, runTransaction, orderBy, deleteDoc, increment, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { useFirestore } from '../hooks/useFirestore';
import { useTenant } from '../contexts/TenantContext';
import { useShift } from '../contexts/ShiftContext';
import { toast } from 'react-toastify';
import RouteMapMonitor from './RouteMapMonitor';

// Inicializamos Cloud Functions
const functions = getFunctions(getApp(), 'southamerica-west1');
const emitirFacturas = httpsCallable(functions, 'emitirFacturasReparto');

// --- ICONOGRAFÍA (Outline Premium) ---
const TruckIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17H5a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5"/><path d="M15 17h4.5a2 2 0 0 0 2-2V9.5a2 2 0 0 0-2-2H18"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
const SearchIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const PlusIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const XIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const ArrowRightIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const PrinterIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const ArchiveIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>;
const ChevronDownIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const EditIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const EyeIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const TrashIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const ClipboardCheckIcon = (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M9 14l2 2 4-4"></path></svg>;

// --- UTILIDADES ---
const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

// Mide la altura real (en mm) que ocupará el HTML de una factura al imprimirse,
// renderizándola oculta con el mismo ancho/fuente que usa la hoja A4 (190mm útiles
// con margen 10mm). Así se puede decidir si entra en media hoja o necesita una
// hoja A4 completa, sin adivinar por cantidad de ítems.
const PX_POR_MM = 96 / 25.4;
const medirAlturaFacturaMM = (html) => {
    const contenedor = document.createElement('div');
    contenedor.style.cssText = 'position:absolute; left:-9999px; top:0; width:718px;';
    contenedor.innerHTML = `<style>*{box-sizing:border-box;} .invoice-footer{display:flex;border-top:2px solid #1e293b;background:#fff;}</style><div style="padding:6px; font-family: Arial, Helvetica, sans-serif;">${html}</div>`;
    document.body.appendChild(contenedor);
    const alturaPx = contenedor.scrollHeight;
    document.body.removeChild(contenedor);
    return alturaPx / PX_POR_MM;
};

// Formatea la fecha de AFIP YYYYMMDD a DD/MM/YYYY
const formatAfipDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
};

const printHTML = (htmlContent) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        // Aumentamos el tiempo de espera para asegurar que el QR se renderice
        setTimeout(() => printWindow.print(), 1500);
    } else {
        toast.warn("El navegador bloqueó la impresión. Deshabilite el bloqueador de pop-ups.");
    }
};

// --- GENERACIÓN DE PDFS ---
const normalizeKey = (str) => (str || '').toString().trim().toLowerCase();

const generateLoadingReportHTML = (invoices, routeName, repartidorNombre, productCategoryLookup = { byId: new Map(), byName: new Map() }, zonaMap = new Map()) => {
    const resolveCategoria = (item) => {
        return productCategoryLookup.byId.get(item.productId)
            ?? productCategoryLookup.byName.get(normalizeKey(item.nombre))
            ?? 'Sin Categoría';
    };

    const zonasCubiertas = Array.from(new Set(invoices.map(inv => zonaMap.get(inv.zonaId) || 'Sin Zona'))).sort((a, b) => a.localeCompare(b));

    const productSummary = new Map();
    invoices.forEach(invoice => {
        (invoice.items || []).forEach(item => {
            const key = item.productId || item.nombre;
            if (!key) return;
            const subtotalItem = (item.precio || 0) * (item.quantity || 0);
            const existing = productSummary.get(key);
            if (existing) {
                existing.quantity += item.quantity;
                existing.subtotal += subtotalItem;
            } else {
                productSummary.set(key, { nombre: item.nombre, quantity: item.quantity, subtotal: subtotalItem, categoria: resolveCategoria(item) });
            }
        });
    });

    // Agrupamos por categoría para que el depósito arme la carga sector por sector
    const groups = new Map();
    Array.from(productSummary.values()).forEach(p => {
        if (!groups.has(p.categoria)) groups.set(p.categoria, []);
        groups.get(p.categoria).push(p);
    });
    const categoryNames = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    const totalUnidades = Array.from(productSummary.values()).reduce((acc, p) => acc + (p.quantity || 0), 0);
    const totalGeneral = Array.from(productSummary.values()).reduce((acc, p) => acc + (p.subtotal || 0), 0);

    const itemsRows = categoryNames.map(catNombre => {
        const catHeaderRow = `<div class="cat-row">${catNombre}</div>`;
        const productos = groups.get(catNombre).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const rows = productos.map(item => {
            const precioUnit = item.quantity ? item.subtotal / item.quantity : 0;
            return `
            <div class="grid-row">
                <div class="c">${item.nombre}</div>
                <div class="c right strong">${item.quantity}</div>
                <div class="c right">${formatCurrency(precioUnit)}</div>
                <div class="c right strong">${formatCurrency(item.subtotal)}</div>
            </div>`;
        }).join('');
        return catHeaderRow + rows;
    }).join('');

    // Nota técnica: este reporte usaba una <table> real, pero Chrome tiene un bug conocido
    // al exportar tablas a PDF (calcula mal el ancho/alto de celdas y corta texto con "…",
    // tanto en columnas numéricas como en nombres largos, sin que medie ninguna regla CSS
    // de truncado). Por eso se arma con CSS Grid (filas <div>) en vez de <table>/<tr>/<td>:
    // el motor de impresión de Chrome no tiene ese problema fuera de <table>.
    return `
    <html>
    <head><title>Reporte de Carga - ${routeName}</title>
    <style>
        @page { size: A4; margin: 8mm 6mm; }
        * { box-sizing: border-box; }
        body{font-family: Calibri, Arial, Helvetica, sans-serif; margin: 0; color: #1e293b; font-size: 14px;}
        h1, h2 {color: #0f172a; margin: 0; line-height: 1.2;}
        .grid-wrap { border-left: 1px solid #cbd5e1; border-top: 1px solid #cbd5e1; }
        .grid-row { display: grid; grid-template-columns: 1fr 45px 110px 130px; page-break-inside: avoid; }
        .grid-row.grid-head { border-top: none; }
        .c {
            border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;
            padding: 3px 7px; font-size: 14px; line-height: 1.35; font-weight: 900;
            text-transform: uppercase; overflow-wrap: anywhere; word-break: break-word;
        }
        .c.right { text-align: right; }
        .c.strong { font-weight: 900; }
        .cat-row {
            background: none; color: #0f172a; font-weight: 900; text-transform: uppercase;
            letter-spacing: 0.5px; font-size: 15px; padding: 7px 5px 4px 0;
            border-bottom: 1.5px solid #0f172a; page-break-inside: avoid;
        }
        .grid-head .c {
            background: none; color: #0f172a; border-top: none; border-bottom: 2.5px solid #0f172a;
            padding: 6px 7px; text-align: left; font-size: 12px;
            text-transform: uppercase; letter-spacing: 0.4px; font-weight: 900;
        }
        .grid-head .c.right { text-align: right; }
        .grid-foot .c { font-size: 14px; color: #64748b; text-transform: uppercase; font-weight: 700; }
        .grid-foot .c.right { font-size: 18px; font-weight: 900; color: #1e293b; background: #f8fafc; }
    </style>
    </head>
    <body>
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 5px;">
            <div>
                <h1 style="font-size: 13px;">Reporte de Carga para Depósito</h1>
                <h2 style="font-size: 9px; font-weight: normal; color: #475569; margin-top: 1px;">${routeName} &nbsp;·&nbsp; Repartidor: <strong style="color: #0f172a;">${repartidorNombre}</strong></h2>
            </div>
            <div style="text-align:right; font-size: 7.5px; color: #94a3b8;">
                Emitido: ${new Date().toLocaleString('es-AR')}<br/>
                Unidades totales: <strong style="color:#0f172a;">${totalUnidades}</strong><br/>
                Zonas: <strong style="color:#0f172a;">${zonasCubiertas.join(', ')}</strong>
            </div>
        </div>
        <div class="grid-wrap">
            <div class="grid-row grid-head">
                <div class="c">Producto</div>
                <div class="c right">Cant.</div>
                <div class="c right">P. Unit.</div>
                <div class="c right">Subtotal</div>
            </div>
            ${itemsRows}
            <div class="grid-row grid-foot">
                <div class="c" style="grid-column: span 3; text-align: right;">Total General:</div>
                <div class="c right">${formatCurrency(totalGeneral)}</div>
            </div>
        </div>
    </body>
    </html>
    `;
};

const generateRouteListHTML = (invoices, routeName, repartidorNombre, zonaMap = new Map()) => {
    let totalRuta = 0;

    // Resolvemos la zona de cada factura y agrupamos el listado por zona
    const invoicesConZona = invoices.map(inv => ({ ...inv, zonaNombre: zonaMap.get(inv.zonaId) || 'Sin Zona' }));
    const zonasCubiertas = Array.from(new Set(invoicesConZona.map(inv => inv.zonaNombre))).sort((a, b) => a.localeCompare(b));

    const groups = new Map();
    invoicesConZona.forEach(inv => {
        if (!groups.has(inv.zonaNombre)) groups.set(inv.zonaNombre, []);
        groups.get(inv.zonaNombre).push(inv);
    });
    const zoneNames = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));

    let parada = 0;
    const clientRows = zoneNames.map(zonaNombre => {
        const zoneHeaderRow = `<tr><td class="cell zone-cell" colspan="5">${zonaNombre}</td></tr>`;
        const rows = groups.get(zonaNombre).map(inv => {
            parada++;
            totalRuta += inv.totalVenta || 0;
            const zebra = parada % 2 === 0 ? 'background:#f1f5f9;' : '';
            return `
                <tr style="${zebra}">
                    <td class="cell cell-center">${parada}</td>
                    <td class="cell cell-strong">${inv.clienteNombre}${inv.tipo === 'devolucion' ? ' <span class="tag-dev">DEV</span>' : ''}</td>
                    <td class="cell cell-muted">${inv.clienteDireccion || 'S/D'}</td>
                    <td class="cell cell-right cell-strong">${formatCurrency(inv.totalVenta)}</td>
                    <td class="cell cell-center cell-firma"></td>
                </tr>
            `;
        }).join('');
        return zoneHeaderRow + rows;
    }).join('');

    return `
    <html>
    <head><title>Listado de Ruta - ${routeName}</title>
    <style>
        @page { size: A4; margin: 8mm 6mm; }
        * { box-sizing: border-box; }
        body{font-family: Calibri, Arial, Helvetica, sans-serif; margin: 0; color: #1e293b; font-size: 20px;}
        h1, h2 {color: #0f172a; margin: 0; line-height: 1.2;}
        table{width: 100%; border-collapse: collapse; table-layout: fixed;}
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        th, .cell { border: 1px solid #cbd5e1; }
        .cell { padding: 2px 6px; font-size: 20px; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cell-center { text-align: center; }
        .cell-right { text-align: right; }
        .cell-strong { font-weight: 700; }
        .cell-muted { color: #64748b; }
        .cell-firma { width: 55px; }
        .tag-dev { font-size: 15px; font-weight: 700; color: #c2410c; background: #ffedd5; border: 1px solid #fed7aa; border-radius: 3px; padding: 0 3px; }
        .zone-cell {
            background: #e2e8f0; color: #0f172a; font-weight: 900; text-transform: uppercase;
            letter-spacing: 0.4px; font-size: 19px; padding: 3px 6px; border: 1px solid #cbd5e1;
        }
        thead th{
            background-color: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1;
            border-bottom: 2px solid #0f172a; padding: 4px 6px; text-align: left; font-size: 17px;
            text-transform: uppercase; letter-spacing: 0.4px; font-weight: 900;
        }
        tfoot td { border: 1px solid #cbd5e1; padding: 5px; }
    </style>
    </head>
    <body>
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 5px; margin-bottom: 6px;">
            <div>
                <h1 style="font-size: 14px;">Hoja de Ruta</h1>
                <h2 style="font-size: 10px; font-weight: normal; color: #475569; margin-top: 1px;">${routeName} &nbsp;·&nbsp; Repartidor: <strong style="color: #0f172a;">${repartidorNombre}</strong></h2>
            </div>
            <div style="text-align:right; font-size: 8px; color: #94a3b8;">
                Emitido: ${new Date().toLocaleString('es-AR')}<br/>
                Paradas: <strong style="color:#0f172a;">${invoices.length}</strong><br/>
                Zonas: <strong style="color:#0f172a;">${zonasCubiertas.join(', ')}</strong>
            </div>
        </div>

        <table>
            <colgroup>
                <col style="width: 36px;" />
                <col style="width: 30%;" />
                <col />
                <col style="width: 140px;" />
                <col style="width: 55px;" />
            </colgroup>
            <thead>
                <tr>
                    <th style="text-align: center;">#</th>
                    <th>Cliente</th>
                    <th>Dirección</th>
                    <th style="text-align: right;">Monto a Cobrar</th>
                    <th style="text-align: center;">Firma</th>
                </tr>
            </thead>
            <tbody>
                ${clientRows}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="text-align: right; font-size: 20px; color: #64748b; text-transform: uppercase; font-weight: 700;">Total Esperado en Ruta:</td>
                    <td colspan="2" style="text-align: right; font-size: 24px; font-weight: 900; background: #f8fafc;">${formatCurrency(totalRuta)}</td>
                </tr>
            </tfoot>
        </table>
    </body>
    </html>
    `;
};

// --- AUXILIAR: GENERADOR DE QR AFIP ---
const getAfipQrUrl = (venta, config) => {
    if (!venta.afipCAE || !config) return null;

    const CUIT_EMISOR = parseInt(config.cuit?.replace(/-/g, '') || 0); 
    const PTO_VTA = parseInt(config.ptoVta || 5); 
    
    let tipoCmp = 11; // C
    if (venta.afipLetra === 'A') tipoCmp = 1;
    if (venta.afipLetra === 'B') tipoCmp = 6;

    const fechaObj = venta.fecha instanceof Date ? venta.fecha : new Date(venta.fecha.seconds * 1000);
    const fechaStr = fechaObj.toISOString().split('T')[0];

    const datosQr = {
        ver: 1,
        fecha: fechaStr,
        cuit: CUIT_EMISOR,
        ptoVta: PTO_VTA,
        tipoCmp: tipoCmp,
        nroCmp: parseInt(venta.afipNumeroComprobante || 0),
        importe: parseFloat(venta.totalVenta),
        moneda: "PES",
        ctz: 1,
        tipoDocRec: parseInt(venta.clienteTipoDoc === 'CUIT' ? 80 : 96), 
        nroDocRec: parseInt(venta.clienteCuit || 0),
        tipoCodAut: "E",
        codAut: parseInt(venta.afipCAE)
    };

    try {
        const jsonString = JSON.stringify(datosQr);
        const base64Data = btoa(jsonString); 
        const urlAfip = `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(urlAfip)}`;
    } catch (e) {
        console.error("Error generando QR:", e);
        return null;
    }
};

// --- PDF DE FACTURA "AFIP COMPACTO & LIMPIO" ---
const generateInvoiceHtmlContent = (venta, clientDetails, zonaNombre, config) => {
    const fechaImpresion = venta.fecha ? (venta.fecha instanceof Date ? venta.fecha : new Date(venta.fecha.seconds * 1000)) : new Date();

    const tieneCAE = !!venta.afipCAE;
    const letra = tieneCAE ? (venta.afipLetra || 'C') : 'X';
    const esFacturaA = letra === 'A';
    const tituloComprobante = tieneCAE ? 'FACTURA' : 'REMITO';
    const codComprobante = tieneCAE ? (letra === 'A' ? 'COD. 001' : letra === 'B' ? 'COD. 006' : 'COD. 011') : 'COD. 000';

    const ptoVtaStr = String(config?.ptoVta || "00001").padStart(5, '0');
    const numCompStr = String(venta.afipNumeroComprobante || venta.id.substring(0, 8)).padStart(8, '0');

    const formatCuit = (val) => {
        const c = String(val || '').replace(/\D/g, '');
        if (c.length === 11) return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;
        return val || 'S/D';
    };
    const condicionVenta = (venta.saldoPendiente !== undefined && venta.saldoPendiente <= 0.01)
        ? ((venta.pagoTarjeta || 0) > 0 ? 'Tarjeta' : 'Contado')
        : 'Cuenta Corriente';

    const qrUrl = getAfipQrUrl(venta, config);
    const condIvaTexto = venta.clienteCondicionIVA === 'RI' ? 'Resp. Inscripto' : venta.clienteCondicionIVA === 'MT' ? 'Monotributo' : 'Cons. Final';
    const vtoCaeFormateado = venta.afipFechaVtoCAE ? formatAfipDate(venta.afipFechaVtoCAE) : '';
    const isRI = config?.taxCondition === 'RI' || config?.taxCondition === 'RESPONSABLE_INSCRIPTO';

    const itemsHtml = (venta.items || []).map((item, idx) => {
        const precioUnit = esFacturaA ? item.precio / 1.21 : item.precio;
        const subtotal = esFacturaA ? (item.precio * item.quantity) / 1.21 : item.precio * item.quantity;
        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        return `
        <tr style="background: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px; font-size: 14.5px; font-weight: 700; color: #0f172a;">${item.nombre}</td>
            <td style="padding: 6px 5px; text-align: center; font-size: 13px; font-weight: 600; width: 30px; color: #374151;">u.</td>
            <td style="padding: 6px 5px; text-align: center; font-size: 14.5px; font-weight: 700; width: 40px; color: #0f172a;">${item.quantity}</td>
            <td style="padding: 6px 8px; text-align: right; font-size: 14.5px; font-weight: 600; width: 90px; color: #0f172a;">${formatCurrency(precioUnit)}</td>
            <td style="padding: 6px 8px; text-align: right; font-size: 14.5px; font-weight: 800; width: 90px; color: #0f172a;">${formatCurrency(subtotal)}</td>
        </tr>`;
    }).join('');

    const bloquePie = tieneCAE ? `
        <div style="display: flex; gap: 14px; align-items: flex-start;">
            <div>
                <img src="${qrUrl}" alt="QR AFIP" style="width: 90px; height: 90px; display: block; border: 1px solid #cbd5e1; border-radius: 4px;">
                <div style="text-align: center; margin-top: 3px; font-size: 9px; color: #374151; font-weight: 600; letter-spacing: 0.5px;">ARCA | AFIP</div>
            </div>
            <div style="font-size: 9px; color: #1e293b; line-height: 1.7;">
                <div style="font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">Comprobante Autorizado por ARCA</div>
                <div><span style="color:#374151;">CAE N°:</span> <strong>${venta.afipCAE}</strong></div>
                <div><span style="color:#374151;">Vto. CAE:</span> <strong>${vtoCaeFormateado}</strong></div>
            </div>
        </div>
    ` : `
        <div style="border: 1px dashed #94a3b8; padding: 8px; text-align: center; background: #f8fafc; border-radius: 4px;">
            <strong style="font-size: 10px; color: #374151; letter-spacing: 1px;">DOCUMENTO NO VÁLIDO COMO FACTURA</strong>
        </div>
    `;

    return `
    <div class="invoice-wrap" style="width: 100%; height: 100%; border: 1px solid #cbd5e1; background: #fff; color: #1e293b; position: relative; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">

        <div>
            <div style="text-align: right; padding: 3px 8px 0; font-size: 8px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #374151;">ORIGINAL</div>

            <table style="width: 100%; border-collapse: collapse; border-bottom: 1px solid #cbd5e1;">
                <tr>
                    <td style="width: 46%; vertical-align: top; padding: 6px 8px 8px 8px;">
                        <div style="margin: 0 0 4px 0;">
                            ${config?.logo
                                ? `<img src="${config.logo}" alt="Logo" style="max-height: 80px; max-width: 220px; display: block; object-fit: contain; object-position: left top; opacity: 1; filter: none; -webkit-print-color-adjust: exact;">`
                                : `<div style="font-size: 22px; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -0.5px;">${config?.nombreFantasia || config?.name || ''}</div>`
                            }
                        </div>
                        <p style="margin: 0; font-size: 10px; line-height: 1.5; color: #0f172a;">
                            <strong style="color:#0f172a;">${config?.razonSocial || config?.nombreFantasia || config?.name || ''}</strong><br>
                            <span style="color:#374151;">Domicilio:</span> ${config?.domicilioFiscal || ''}<br>
                            <span style="color:#374151;">Condición IVA:</span> ${isRI ? 'Responsable Inscripto' : 'Monotributo'}
                        </p>
                    </td>
                    <td style="width: 68px; vertical-align: top; padding: 0; position: relative;">
                        <div style="background: #ffffff; border: 2px solid #0f172a; width: 52px; height: 52px; margin: 4px auto; display: flex; flex-direction: column; justify-content: center; align-items: center; border-radius: 4px;">
                            <div style="font-size: 26px; font-weight: 900; line-height: 1; color: #0f172a;">${letra}</div>
                            <div style="font-size: 8px; font-weight: 800; margin-top: 1px; color: #475569; letter-spacing: 0.5px;">${codComprobante}</div>
                        </div>
                        <div style="position: absolute; left: 50%; top: 60px; bottom: 0; width: 1px; background: #cbd5e1; transform: translateX(-50%);"></div>
                    </td>
                    <td style="width: 46%; vertical-align: top; padding: 6px 10px 8px 12px;">
                        <h2 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 900; color: #0f172a; letter-spacing: 1px;">${tituloComprobante}</h2>
                        <p style="margin: 0; font-size: 10px; line-height: 1.6; color: #0f172a;">
                            <strong style="color:#0f172a;">Pto. Venta: ${ptoVtaStr}</strong> &nbsp; <strong style="color:#0f172a;">Comp. Nro: ${numCompStr}</strong><br>
                            <span style="color:#374151;">Fecha de Emisión:</span> ${fechaImpresion.toLocaleDateString('es-AR')}<br>
                            <span style="color:#374151;">CUIT:</span> ${formatCuit(config?.cuit)}
                            ${config?.iibb ? `<br><span style="color:#374151;">Ing. Brutos:</span> ${config.iibb}` : ''}
                            ${config?.inicioActividades ? `<br><span style="color:#374151;">Inicio Act.:</span> ${config.inicioActividades}` : ''}
                        </p>
                    </td>
                </tr>
            </table>

            <div style="border-bottom: 1px solid #cbd5e1; padding: 5px 8px; background: #f8fafc; line-height: 1.4;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 55%; padding-bottom: 2px; vertical-align: top;">
                            <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; margin-bottom: 1px;">Cliente</div>
                            <strong style="text-transform: uppercase; font-size: 11px; color: #0f172a;">${venta.clienteNombre || clientDetails.nombre || 'CONSUMIDOR FINAL'}</strong>
                        </td>
                        <td style="width: 25%; padding-bottom: 2px; text-align: right; vertical-align: top;">
                            <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; margin-bottom: 1px;">CUIT / DNI</div>
                            <strong style="font-size: 11px; color: #0f172a;">${formatCuit(venta.clienteCuit || clientDetails.numeroDocumento)}</strong>
                        </td>
                        <td style="width: 20%; padding-bottom: 2px; text-align: right; vertical-align: top;">
                            <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; margin-bottom: 1px;">Cond. Venta</div>
                            <strong style="font-size: 11px; color: #0f172a;">${condicionVenta}</strong>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="3" style="padding-top: 2px; vertical-align: top;">
                            <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151;">Domicilio:</span>
                            <span style="font-size: 10px; color: #0f172a;"> ${clientDetails.direccion || 'N/A'}</span>
                            &nbsp;&nbsp;<span style="color:#cbd5e1;">|</span>&nbsp;&nbsp;
                            <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151;">Cond. IVA:</span>
                            <span style="font-size: 10px; color: #0f172a;"> ${condIvaTexto}</span>
                        </td>
                    </tr>
                </table>
            </div>

            <div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #0f172a; border-top: 1px solid #cbd5e1;">
                            <th style="padding: 5px 6px; text-align: left; color: #0f172a; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Descripción</th>
                            <th style="padding: 5px 4px; text-align: center; width: 30px; color: #64748b; font-weight: 700; font-size: 12px; text-transform: uppercase;">U.M.</th>
                            <th style="padding: 5px 4px; text-align: center; width: 40px; color: #0f172a; font-weight: 900; font-size: 12px; text-transform: uppercase;">Cant.</th>
                            <th style="padding: 5px 6px; text-align: right; width: 85px; color: #0f172a; font-weight: 900; font-size: 12px; text-transform: uppercase;">P. Unit.${esFacturaA ? ' (Neto)' : ''}</th>
                            <th style="padding: 5px 6px; text-align: right; width: 85px; color: #0f172a; font-weight: 900; font-size: 12px; text-transform: uppercase;">Importe</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
            </div>
        </div>

        <div class="invoice-footer">
            <div style="width: 60%; padding: 8px;">
                ${bloquePie}
            </div>
            <div style="width: 40%; border-left: 1px solid #cbd5e1;">
                <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
                    ${esFacturaA ? `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 4px 8px 4px 6px; text-align: right; color: #374151; font-size: 10px; font-weight: 700;">Neto Gravado (21%):</td>
                        <td style="padding: 4px 8px 4px 6px; text-align: right; color: #0f172a; font-size: 11px; font-weight: 700;">${formatCurrency(venta.totalVenta / 1.21)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 4px 8px 4px 6px; text-align: right; color: #374151; font-size: 10px; font-weight: 700;">IVA (21%):</td>
                        <td style="padding: 4px 8px 4px 6px; text-align: right; color: #0f172a; font-size: 11px; font-weight: 700;">${formatCurrency(venta.totalVenta - (venta.totalVenta / 1.21))}</td>
                    </tr>
                    ` : `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 4px 8px 4px 6px; text-align: right; color: #374151; font-size: 10px; font-weight: 700;">Subtotal:</td>
                        <td style="padding: 4px 8px 4px 6px; text-align: right; color: #0f172a; font-size: 11px; font-weight: 700;">${formatCurrency(venta.totalVenta)}</td>
                    </tr>
                    `}
                    <tr style="border-top: 2px solid #0f172a;">
                        <td style="padding: 6px 8px 6px 6px; text-align: right; font-size: 12px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;">TOTAL:</td>
                        <td style="padding: 6px 8px 6px 6px; text-align: right; font-size: 12px; font-weight: 900; color: #0f172a;">${formatCurrency(venta.totalVenta)}</td>
                    </tr>
                </table>
            </div>
        </div>
    </div>`;
};

// --- REPORTE DE RENDICIÓN (AUTOMÁTICO) ---
const generateSettlementReportHTML = (route, invoices, routeCobranzas = []) => {
    const resumen = invoices.reduce((acc, fac) => {
        acc.efectivo += fac.pagoEfectivo || 0;
        acc.transferencia += fac.pagoTransferencia || 0;
        acc.qr += fac.pagoQR || 0;
        acc.point += fac.pagoPoint || 0;
        acc.saldoPendiente += fac.saldoPendiente || 0;
        acc.totalVenta += fac.totalVenta || 0;
        return acc;
    }, { efectivo: 0, transferencia: 0, qr: 0, point: 0, saldoPendiente: 0, totalVenta: 0 });

    // Cobros de saldos pendientes (deudas de OTRAS ventas/rutas) que el repartidor cobró
    // durante este recorrido. Van aparte del "TOTAL VENTA RUTA" porque no corresponden a
    // las facturas de esta ruta, pero sí es plata física que trae el camión.
    const cobranzasResumen = routeCobranzas.reduce((acc, c) => {
        if (c.metodoPago === 'Efectivo') acc.efectivo += c.monto || 0;
        else if (c.metodoPago === 'Transferencia') acc.transferencia += c.monto || 0;
        else if (c.metodoPago === 'QR') acc.qr += c.monto || 0;
        else if (c.metodoPago === 'Point') acc.point += c.monto || 0;
        acc.total += c.monto || 0;
        return acc;
    }, { efectivo: 0, transferencia: 0, qr: 0, point: 0, total: 0 });

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

    const devolucionesRows = Array.from(devolucionesSummary.values()).map(item => `<tr><td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight:bold;">${item.quantity}</td><td style="padding: 8px; border: 1px solid #ddd;">${item.nombre}</td></tr>`).join('');
    const facturasRows = invoices.map(inv => `<tr><td style="padding: 8px; border: 1px solid #ddd;">${inv.clienteNombre}</td><td style="padding: 8px; border: 1px solid #ddd;">${inv.estado}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(inv.totalVenta)}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(inv.pagoEfectivo || 0)}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(inv.pagoTransferencia || 0)}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(inv.pagoQR || 0)}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(inv.pagoPoint || 0)}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: red;">${formatCurrency(inv.saldoPendiente)}</td></tr>`).join('');

    const totalGeneralAEntregar = resumen.efectivo + resumen.transferencia + resumen.qr + resumen.point + cobranzasResumen.total;
    const cobranzasBoxHtml = cobranzasResumen.total > 0 ? `
        <tr style="border-top: 2px solid #f39c12; background-color: #fffaf0;"><td colspan="2" style="padding-top: 12px; font-weight: bold; color: #b8860b; font-size: 12px;">+ COBROS DE SALDOS PENDIENTES (ctas. ctes. de otras ventas, cobradas en esta ruta):</td></tr>
        <tr><td style="font-size: 13px;">Efectivo:</td><td class="amount" style="font-size: 14px;">${formatCurrency(cobranzasResumen.efectivo)}</td></tr>
        <tr><td style="font-size: 13px;">Transferencia:</td><td class="amount" style="font-size: 14px;">${formatCurrency(cobranzasResumen.transferencia)}</td></tr>
        <tr><td style="font-size: 13px;">QR:</td><td class="amount" style="font-size: 14px;">${formatCurrency(cobranzasResumen.qr)}</td></tr>
        <tr><td style="font-size: 13px;">Point:</td><td class="amount" style="font-size: 14px;">${formatCurrency(cobranzasResumen.point)}</td></tr>
        <tr style="border-top: 2px solid #333; background-color: #fff;"><td><strong>TOTAL GENERAL A ENTREGAR:</strong></td><td class="amount" style="font-size: 22px;"><strong>${formatCurrency(totalGeneralAEntregar)}</strong></td></tr>
    ` : '';

    return `<html><head><title>Rendición - ${route.nombre}</title><style>body{font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333;} h1, h2, h3 {color: #2c3e50;} table{width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px;} th, td{padding: 8px; text-align: left; border-bottom: 1px solid #eee;} th{background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #7f8c8d;} .box { border: 2px solid #3498db; padding: 15px; border-radius: 8px; margin-bottom: 20px; background: #f0f8ff; } .amount { text-align: right; } .danger { color: #e74c3c; } .success { color: #27ae60; font-weight: bold; }</style></head><body><div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3498db; padding-bottom: 10px;"><div><h1 style="margin:0;">Reporte de Rendición</h1><p style="margin:5px 0; color: #7f8c8d;">Ruta: <strong>${route.nombre}</strong> | Repartidor: <strong>${route.repartidorNombre}</strong></p></div><div style="text-align: right;"><p style="font-size: 12px;">Fecha: ${new Date().toLocaleString('es-AR')}</p></div></div><h3>1. DINERO A ENTREGAR (CAJA)</h3><div class="box"><table style="margin:0;"><tr><td style="font-size: 14px;">EFECTIVO (Billetes):</td><td class="amount success" style="font-size: 18px;">${formatCurrency(resumen.efectivo)}</td></tr><tr><td style="font-size: 14px;">TRANSFERENCIAS:</td><td class="amount" style="font-size: 16px;">${formatCurrency(resumen.transferencia)}</td></tr><tr><td style="font-size: 14px;">MERCADO PAGO (QR):</td><td class="amount" style="font-size: 16px;">${formatCurrency(resumen.qr)}</td></tr><tr><td style="font-size: 14px;">POINT SMART (Tarjeta):</td><td class="amount" style="font-size: 16px;">${formatCurrency(resumen.point)}</td></tr><tr style="border-top: 1px solid #ccc;"><td style="font-size: 14px;">FIADO / CTA CTE:</td><td class="amount danger" style="font-size: 16px;">${formatCurrency(resumen.saldoPendiente)}</td></tr><tr style="border-top: 2px solid #333; background-color: #fff;"><td><strong>TOTAL VENTA RUTA:</strong></td><td class="amount" style="font-size: 20px;"><strong>${formatCurrency(resumen.totalVenta)}</strong></td></tr>${cobranzasBoxHtml}</table></div><h3>2. RETORNO DE MERCADERÍA (STOCK)</h3>${devolucionesRows.length > 0 ? `<table><thead><tr><th style="width:100px; text-align:center;">CANT. A BAJAR</th><th>PRODUCTO</th></tr></thead><tbody>${devolucionesRows}</tbody></table>` : '<p style="font-style: italic; color: #7f8c8d; padding: 10px; border: 1px dashed #ccc;">No hubo rechazos ni ediciones. El camión vuelve vacío.</p>'}<h3>3. Detalle por Cliente</h3><table><thead><tr><th>Cliente</th><th>Estado</th><th class="amount">Total</th><th class="amount">Efvo.</th><th class="amount">Transf.</th><th class="amount">QR</th><th class="amount">Point</th><th class="amount">Deuda</th></tr></thead><tbody>${facturasRows}</tbody></table><div style="margin-top: 60px; display: flex; justify-content: space-between;"><div style="text-align: center; width: 40%; border-top: 1px solid #000; padding-top: 5px;">Firma Responsable Caja</div><div style="text-align: center; width: 40%; border-top: 1px solid #000; padding-top: 5px;">Firma Repartidor</div></div></body></html>`;
};

// --- HOOK DE DATOS ---
function useFirestoreSubscription(collectionName, orders = []) {
    const { onTenantSnapshot, tenantId, getTenantDoc, getTenantCollection, addTenantDoc, updateTenantDoc, deleteTenantDoc } = useFirestore();
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!tenantId) { 
            setData([]); 
            setIsLoading(false); 
            return; 
        }
        setIsLoading(true);
        const unsubscribe = onTenantSnapshot(collectionName, (snapshot) => {
            const resolvedData = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data(),
                fecha: doc.data().fecha?.toDate(),
                fechaCreacion: doc.data().fechaCreacion?.toDate(),
            }));
            setData(resolvedData); 
            setIsLoading(false);
        }, orders, (err) => { 
            setError(err); 
            setIsLoading(false); 
            console.error(err); 
        });
        return () => unsubscribe();
    }, [tenantId, collectionName]);

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
    const [forceNoAfip, setForceNoAfip] = useState(false);

    const availableInvoices = useMemo(() => {
        return allPendingInvoices.filter(inv => {
            const alreadySelected = selectedInvoices.some(sel => sel.id === inv.id);
            if (alreadySelected) return false;
            const matchesZone = filterZone ? inv.zonaId === filterZone : true;
            const matchesVendor = filterVendor ? inv.vendedorId === filterVendor : true;
            const matchesSearch = searchTerm ? (inv.clienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) || inv.clienteDireccion.toLowerCase().includes(searchTerm.toLowerCase())) : true;
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

    const handleConfirmDispatch = async (duplicarTicket = true) => {
        if (!assignedRepartidor) return toast.error("Debes asignar un repartidor.");
        if (selectedInvoices.length === 0) return toast.error("La ruta está vacía.");
        setIsDispatching(true);
        try {
            const facturasAEnviar = forceNoAfip
                ? selectedInvoices.map(inv => ({ ...inv, facturaAfip: false }))
                : selectedInvoices;
            await onDispatch(route.id, assignedRepartidor, facturasAEnviar, routeSummary, duplicarTicket);
            onClose();
        } catch (error) {
            toast.error("Error al despachar: " + error.message);
            setIsDispatching(false);
        }
    };

    const isEditMode = route.estado === 'En Curso';

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4">
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><TruckIcon className="text-indigo-600"/> {isReadOnly ? 'Monitor de Ruta' : (isEditMode ? 'Editar Ruta Activa' : 'Nueva Ruta')}</h2>
                        <p className="text-xs text-gray-500 font-medium mt-1">ID: {route.nombre}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="flex-grow flex overflow-hidden">
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
                                            {/* INDICADOR VISUAL SI REQUIERE AFIP */}
                                            {inv.facturaAfip && (
                                                forceNoAfip
                                                    ? <span className="ml-1 inline-block text-[9px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md border border-gray-200 line-through">AFIP</span>
                                                    : <span className="ml-1 inline-block text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100">AFIP</span>
                                            )}
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
                    <div className={`${isReadOnly ? 'w-full' : 'w-7/12'} flex flex-col bg-white relative`}>
                        <div className="p-4 border-b border-gray-100 bg-white z-10">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Repartidor Asignado</label>
                            <select className="w-full bg-gray-50 border border-gray-200 text-gray-800 font-medium rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-70" value={assignedRepartidor} onChange={e => setAssignedRepartidor(e.target.value)} disabled={isReadOnly}>
                                <option value="">-- Seleccionar Chofer --</option>
                                {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombreCompleto}</option>)}
                            </select>
                            {!isReadOnly && (
                                <button
                                    type="button"
                                    onClick={() => setForceNoAfip(v => !v)}
                                    title="Al despachar, ninguna factura de esta ruta se emitirá como ARCA/AFIP (se ignora la condición del cliente)"
                                    className={`mt-2 w-full flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-xl border-2 transition-all ${forceNoAfip ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                >
                                    <span className={`w-2.5 h-2.5 rounded-full ${forceNoAfip ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                                    {forceNoAfip ? 'NINGUNA FACTURA SERÁ ARCA' : 'Forzar sin ARCA (todas Consumidor Final)'}
                                </button>
                            )}
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
                        {!isReadOnly && (
                            <div className="bg-white border-t border-gray-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex gap-6">
                                        <div className="text-xs text-gray-500">Paradas <span className="block text-lg font-bold text-gray-800">{routeSummary.totalStops}</span></div>
                                        <div className="text-xs text-gray-500">Total <span className="block text-lg font-bold text-indigo-600">{formatCurrency(routeSummary.totalMoney)}</span></div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleConfirmDispatch(true)} disabled={isDispatching || !assignedRepartidor || selectedInvoices.length === 0} title="Imprime cada ticket duplicado (original + copia) para cortar" className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2 active:scale-[0.99]">
                                        {isDispatching ? <span className="animate-pulse">Contactando AFIP...</span> : <><TruckIcon className="w-5 h-5"/> {isEditMode ? 'GUARDAR CAMBIOS' : 'CONFIRMAR Y DESPACHAR'}</>}
                                    </button>
                                    <button onClick={() => handleConfirmDispatch(false)} disabled={isDispatching || !assignedRepartidor || selectedInvoices.length === 0} title="Imprime 2 facturas distintas por hoja, sin repetir" className="flex-1 bg-white border-2 border-indigo-600 hover:bg-indigo-50 disabled:bg-gray-100 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed text-indigo-600 font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 active:scale-[0.99]">
                                        {isDispatching ? <span className="animate-pulse">Contactando AFIP...</span> : <><PrinterIcon className="w-5 h-5"/> Facturas Únicas</>}
                                    </button>
                                </div>
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
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [mapRoute, setMapRoute] = useState(null);
    const [activeTab, setActiveTab] = useState('planificacion');
    const [plannerReadOnly, setPlannerReadOnly] = useState(false);
    const [closingRoute, setClosingRoute] = useState(null);
    const { tenantId, getTenantCollection, getTenantDoc, addTenantDoc, updateTenantDoc, deleteTenantDoc, db, onTenantSnapshot } = useFirestore();
    const { companyConfig: config } = useTenant();
    const { activeShift } = useShift();

    const { data: routes, isLoading: routesLoading } = useFirestoreSubscription('rutas', [{ field: 'fechaCreacion', direction: 'desc' }]);
    const { data: allInvoices, isLoading: invoicesLoading } = useFirestoreSubscription('ventas');
    const { data: allVendors, isLoading: vendorsLoading } = useFirestoreSubscription('vendedores');
    const { data: clientes, isLoading: clientesLoading } = useFirestoreSubscription('clientes');
    const { data: zonas, isLoading: zonasLoading } = useFirestoreSubscription('zonas');
    // Cobros de saldos pendientes (cta. cte.) hechos por repartidores durante una ruta (doc.rutaId).
    const { data: cobranzas, isLoading: cobranzasLoading } = useFirestoreSubscription('cobranzas');
    const { data: productos } = useFirestoreSubscription('productos');
    const { data: categorias } = useFirestoreSubscription('categorias');

    // Lookup productoId/nombre -> nombre de categoría, para agrupar el Reporte de Carga.
    // Se indexa también por nombre normalizado porque algunas ventas viejas guardan
    // items sin productId (o con un id de producto ya borrado/recreado).
    const productCategoryLookup = useMemo(() => {
        const byId = new Map();
        const byName = new Map();
        productos.forEach(p => {
            const catNombre = categorias.find(c => c.id === p.categoriaId)?.nombre || 'Sin Categoría';
            byId.set(p.id, catNombre);
            byName.set(normalizeKey(p.nombre), catNombre);
        });
        return { byId, byName };
    }, [productos, categorias]);

    // Mapa zonaId -> nombre, para agrupar la Hoja de Ruta por zona
    const zonaMap = useMemo(() => new Map(zonas.map(z => [z.id, z.nombre])), [zonas]);

    // --- AQUÍ FUSIONAMOS LA INTELIGENCIA DEL CLIENTE CON LA FACTURA ---
    const enrichedInvoices = useMemo(() => {
        return allInvoices.map(invoice => {
            const cliente = clientes.find(c => c.id === invoice.clienteId);
            return { 
                ...invoice, 
                // Datos básicos
                clienteNombre: cliente?.nombre || invoice.clientName || 'N/A', 
                clienteDireccion: cliente?.direccion || 'N/A', 
                zonaId: cliente?.zonaId || null,
                vendedorId: invoice.vendedorId,
                
                // DATOS CRÍTICOS PARA AFIP (Si la factura no los tiene, los sacamos del cliente)
                // Esto asegura que la nube sepa qué hacer aunque la venta sea vieja
                facturaAfip: invoice.facturaAfip ?? cliente?.requiereFacturaAfip ?? cliente?.isArca ?? false,
                clienteCondicionIVA: invoice.clienteCondicionIVA ?? cliente?.condicionIva ?? 'CF',
                clienteCuit: invoice.clienteCuit ?? cliente?.numeroDocumento ?? '',
                // --- AUTOMATIZACIÓN FISCAL ---
                afipLetra: invoice.afipLetra || (config?.taxCondition === 'MT' ? 'C' : ((invoice.clienteCondicionIVA ?? cliente?.condicionIva) === 'RI' ? 'A' : 'B')),
                companyInfo: config
            };
        });
    }, [allInvoices, clientes, config]);

    const pendingInvoices = useMemo(() => enrichedInvoices.filter(inv => inv.estado === 'Pendiente de Entrega'), [enrichedInvoices]);
    const repartidoresOnly = useMemo(() => {
        const filtered = allVendors.filter(v => {
            const roleStr = (v.rango || v.role || v.rol || '').toLowerCase().trim();
            return roleStr.includes('reparto');
        });

        if (allVendors.length > 0 && filtered.length === 0) {
            console.warn("⚠️ Filtro de repartidores: Se encontraron usuarios, pero ninguno tiene rol 'reparto'/'repartidor'.", allVendors);
        }

        return filtered;
    }, [allVendors]);

    const vendedoresOnly = useMemo(() => {
        return allVendors.filter(v => {
            const roleStr = (v.rango || v.role || v.rol || '').toLowerCase().trim();
            return roleStr.includes('vendedor') && !roleStr.includes('reparto');
        });
    }, [allVendors]);

    const handleCreateNewRoute = async () => {
        const today = new Date();
        const dateString = today.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const existingRoutes = routes.filter(r => r.nombre && r.nombre.startsWith(`Ruta del ${dateString}`)).length;
        const newRouteName = `Ruta del ${dateString} (${existingRoutes + 1})`;
        const newRoute = {
            companyId: tenantId, // Inyección de Multi-Tenancy
            nombre: newRouteName, fechaCreacion: Timestamp.now(), estado: 'Planificada',
            repartidorId: null, repartidorNombre: null, facturas: [],
            resumen: { totalFacturas: 0, totalACobrar: 0, paradas: 0 }
        };
        try {
            const docRef = await addTenantDoc('rutas', newRoute);
            setSelectedRoute({ id: docRef.id, ...newRoute });
            setPlannerReadOnly(false);
            setIsPlannerOpen(true);
        } catch (error) { console.error(error); toast.error("Error al crear la ruta."); }
    };

    // --- LÓGICA DE DESPACHO INTELIGENTE (AFIP + PDF) ---
    const handleDispatchRoute = async (routeId, repartidorId, facturas, resumen, duplicarTicket = true) => {
        const repartidor = allVendors.find(r => r.id === repartidorId);
        
        // --- BLINDAJE FISCAL: PRE-VUELO ---
        const facturasAfipParaProcesar = facturas.filter(inv => inv.facturaAfip === true && !inv.afipCAE);
        
        if (facturasAfipParaProcesar.length > 0) {
            const missingFields = [];
            if (!config?.cuit)         missingFields.push('CUIT');
            if (!config?.taxCondition) missingFields.push('Condición IVA');
            if (!config?.ptoVta)       missingFields.push('Punto de Venta');
            if (!config?.cert)         missingFields.push('Certificado CRT');
            if (!config?.key)          missingFields.push('Clave Privada');
            if (!config?.active)       missingFields.push('ARCA deshabilitada');
            if (missingFields.length > 0) {
                toast.error(`❌ ERROR FISCAL: Falta en Integraciones → ${missingFields.join(', ')}`);
                return;
            }
        }

        // 1. Identificar objetivos y ASEGURAR DATOS FRESCOS (REINYECCIÓN)
        const facturasProcesablesEnriquecidas = facturasAfipParaProcesar.map(inv => {
            const cliente = clientes.find(c => c.id === inv.clienteId);
            const letra = (config?.taxCondition === 'MT') ? 'C' : ((inv.clienteCondicionIVA ?? cliente?.condicionIva) === 'RI' ? 'A' : 'B');
            
            return {
                ...inv,
                afipLetra: letra,
                companyInfo: config // Inyección forzada de datos de empresa actuales
            };
        });
        
        // Clonamos para manipular los datos ANTES de imprimir (por si la BD tarda)
        let facturasParaImprimir = [...facturas];

        // 2. Si hay facturas pendientes de AFIP, llamamos a la nube
        let mapaResultados = null;
        if (facturasAfipParaProcesar.length > 0) {
            try {
                // Llamada a Google Cloud Functions con datos ENRIQUECIDOS
                const result = await emitirFacturas({ ventas: facturasProcesablesEnriquecidas });
                const resultadosAfip = result.data; // Array de resultados

                // 3. "Estampamos" los CAEs recibidos en el array de memoria para que salgan en el PDF YA
                mapaResultados = new Map(resultadosAfip.map(r => [r.ventaId, r]));

                facturasParaImprimir = facturasParaImprimir.map(inv => {
                    const res = mapaResultados.get(inv.id);
                    if (res && res.status === 'OK') {
                        return {
                            ...inv,
                            afipCAE: res.detalle.cae,
                            afipFechaVtoCAE: res.detalle.vtoCAE,
                            afipNumeroComprobante: res.detalle.numero,
                            afipLetra: res.detalle.tipoLetra
                        };
                    }
                    return inv;
                });

            } catch (e) {
                console.error(e);
                toast.warn("Error al conectar con AFIP. Facturas generadas SIN CAE legal. Verifique la conexión.", { autoClose: 8000 });
            }
        }

        // 4. Actualizamos la Base de Datos (Esto corre en paralelo a la impresión)
        const originalRoute = routes.find(r => r.id === routeId);
        const originalInvoiceIds = (originalRoute?.facturas || []).map(f => f.id);
        const newInvoiceIds = facturas.map(f => f.id);
        const removedInvoices = originalInvoiceIds.filter(id => !newInvoiceIds.includes(id));

        await runTransaction(db, async (transaction) => {
            const routeRef = getTenantDoc('rutas', routeId);
            const facturasRutaData = facturas.map(f => ({ 
                id: f.id, 
                clienteId: f.clienteId, // CRÍTICO: Necesario para auditoría GPS
                clienteNombre: f.clienteNombre, 
                clienteDireccion: f.clienteDireccion, 
                totalVenta: f.totalVenta, 
                estadoVisita: f.estadoVisita || 'Pendiente' 
            }));

            // Usamos el UID de Firebase de forma prioritaria para la App Móvil
            const finalRepartidorId = repartidor?.firebaseAuthUid || repartidorId;

            transaction.update(routeRef, {
                estado: 'En Curso', 
                repartidorId: finalRepartidorId, 
                repartidorNombre: repartidor?.nombreCompleto || 'N/A',
                facturas: facturasRutaData, 
                resumen
            });

            facturas.forEach(invoice => {
                const invoiceRef = getTenantDoc('ventas', invoice.id);
                const afipUpdate = mapaResultados?.get(invoice.id);
                
                let updateData = { estado: 'Repartiendo', rutaId: routeId };
                
                if (afipUpdate && afipUpdate.status === 'OK') {
                    updateData.afipCAE = afipUpdate.detalle.cae;
                    updateData.afipFechaVtoCAE = afipUpdate.detalle.vtoCAE;
                    updateData.afipNumeroComprobante = afipUpdate.detalle.numero;
                    updateData.afipLetra = afipUpdate.detalle.tipoLetra;
                    updateData.facturaAfip = true;
                }

                transaction.update(invoiceRef, updateData);
            });

            removedInvoices.forEach(id => {
                const invoiceRef = getTenantDoc('ventas', id);
                transaction.update(invoiceRef, { estado: 'Pendiente de Entrega', rutaId: null });
            });
        });

        // 5. GENERACIÓN DE DOCUMENTACIÓN (PDFs)
        let allPrintContent = '';
        
        // A. Reporte de Carga (Interno)
        const loadingReportHtml = generateLoadingReportHTML(facturasParaImprimir, selectedRoute?.nombre, repartidor?.nombreCompleto, productCategoryLookup, zonaMap);
        allPrintContent += `<div style="padding: 20px;">${loadingReportHtml}</div><div style="page-break-after: always;"></div>`;
        
        // B. Listado de Ruta (Clientes a visitar y Cobranzas)
        const routeListHtml = generateRouteListHTML(facturasParaImprimir, selectedRoute?.nombre, repartidor?.nombreCompleto, zonaMap);
        allPrintContent += `<div style="padding: 20px;">${routeListHtml}</div><div style="page-break-after: always;"></div>`;
        
        // C. Facturas Individuales (Cliente)
        const printPromises = facturasParaImprimir.map(async (fac) => {
            const client = clientes.find(c => c.id === fac.clienteId) || {};
            const zona = zonas.find(z => z.id === fac.zonaId) || { nombre: 'General' };
            return generateInvoiceHtmlContent(fac, client, zona.nombre, config);
        });
        
        const invoicesHtmls = await Promise.all(printPromises);

        // Facturas del modo "Facturas Únicas" (sin CAE, sin duplicado) que necesitan
        // el algoritmo de casillero de media hoja / hoja completa. Se juntan acá y se
        // procesan después del forEach, agrupadas por tamaño para minimizar desperdicio de papel.
        const candidatasCasillero = [];

        invoicesHtmls.forEach((html, i) => {
            const fac = facturasParaImprimir[i];
            if (fac.afipCAE) {
                allPrintContent += `<div style="padding: 10px;">${html}</div><div style="page-break-after: always;"></div>`;
            } else if (duplicarTicket) {
                // Modo "duplicado": la MISMA factura 2 veces por hoja (original + copia para cortar)
                allPrintContent += `
                    <div class="invoice-copy" style="padding: 6px;">${html}</div>
                    <div class="cut-line">✂ &nbsp;─────────────────────────── CORTAR ───────────────────────────&nbsp; ✂</div>
                    <div class="invoice-copy" style="padding: 6px;">${html}</div>
                    <div style="page-break-after: always;"></div>`;
            } else {
                candidatasCasillero.push(html);
            }
        });

        // Modo "Facturas Únicas": se clasifica cada factura por su altura real (medida
        // renderizándola oculta) en "media" (entra en 135mm) o "completa" (necesita el
        // A4 entero). Las completas NUNCA comparten hoja ni se cortan a la mitad —
        // van solas en su propia hoja. Para que eso no deje huecos en blanco cada vez
        // que una completa interrumpe a una media esperando pareja, se reordena: primero
        // todas las medias emparejadas de a 2 por hoja, y al final todas las completas.
        // Esto acota el desperdicio a, como mucho, una sola media hoja en blanco en
        // total (solo si la cantidad de medias es impar), a costa de no respetar el
        // orden original de la ruta entre facturas medias y completas.
        if (candidatasCasillero.length > 0) {
            const medias = [];
            const completas = [];
            candidatasCasillero.forEach(html => {
                if (medirAlturaFacturaMM(html) > 135) completas.push(html);
                else medias.push(html);
            });

            for (let i = 0; i < medias.length; i += 2) {
                allPrintContent += `<div class="invoice-copy invoice-half" style="padding: 6px;">${medias[i]}</div>`;
                if (medias[i + 1]) {
                    allPrintContent += `<div class="cut-line">✂ &nbsp;─────────────────────────── CORTAR ───────────────────────────&nbsp; ✂</div>`;
                    allPrintContent += `<div class="invoice-copy invoice-half" style="padding: 6px;">${medias[i + 1]}</div>`;
                }
                allPrintContent += `<div style="page-break-after: always;"></div>`;
            }

            completas.forEach(html => {
                allPrintContent += `<div style="padding: 10px;">${html}</div><div style="page-break-after: always;"></div>`;
            });
        }

        printHTML(`<html><head><style>
            * { box-sizing: border-box; }
            @page { size: A4; margin: 10mm; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            .invoice-footer { display: flex; border-top: 2px solid #1e293b; background: #fff; }
            .invoice-copy { page-break-inside: avoid; }
            /* 135mm en vez de 50vh: "vh" en impresión se calcula sobre el viewport de la
               ventana emergente (no sobre la hoja A4 real), así que el tamaño quedaba
               inconsistente entre navegadores/impresoras. A4 (297mm) menos margen 10mm
               arriba/abajo = 277mm útiles; 135mm por mitad deja lugar a la línea de corte
               y sigue siendo físicamente correcto sin importar el dispositivo de impresión. */
            .invoice-half { min-height: 135mm; box-sizing: border-box; }
            .cut-line { border-top: 1px dashed #94a3b8; text-align: center; font-size: 9px; color: #94a3b8; padding: 4px 0; letter-spacing: 1px; page-break-after: avoid; page-break-before: avoid; margin: 2px 0; }
            img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; filter: none !important; opacity: 1 !important; }
            @media print {
                body { margin: 0; padding: 0; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; filter: none !important; opacity: 1 !important; }
            }
        </style></head><body>${allPrintContent}</body></html>`);
    };

    const handleCancelRoute = async (routeToCancel) => {
        if (!window.confirm(`¿ATENCIÓN: Anular y ELIMINAR la ruta "${routeToCancel.nombre}"?\n\nLas facturas volverán a estado 'Pendiente de Entrega' y la ruta desaparecerá.`)) return;
        try {
            await runTransaction(db, async (transaction) => {
                const routeRef = getTenantDoc('rutas', routeToCancel.id);
                
                // PASO 1: LECTURAS (Promise.all para optimizar)
                const invoiceRefs = (routeToCancel.facturas || []).map(f => getTenantDoc('ventas', f.id));
                const invoiceSnaps = await Promise.all(invoiceRefs.map(ref => transaction.get(ref)));

                // PASO 2: ESCRITURAS
                invoiceSnaps.forEach((snap, index) => {
                    if (snap.exists()) {
                        transaction.update(invoiceRefs[index], { estado: 'Pendiente de Entrega', rutaId: null });
                    }
                });
                
                transaction.delete(routeRef); 
            });
            toast.success("Ruta anulada y eliminada correctamente.");
        } catch (error) { console.error(error); toast.error("Error al anular: " + error.message); }
    };

    const handleViewRoute = (route) => { setSelectedRoute(route); setPlannerReadOnly(true); setIsPlannerOpen(true); };
    const handleEditInProgress = (route) => { setSelectedRoute(route); setPlannerReadOnly(false); setIsPlannerOpen(true); };
    const handleOpenMap = (route) => { setMapRoute(route); setIsMapOpen(true); };

    // --- REIMPRESIÓN DE UNA RUTA YA DESPACHADA (Reporte de Carga + Hoja de Ruta) ---
    const handlePrintRoute = (route) => {
        const routeInvoiceIds = (route.facturas || []).map(f => f.id);
        const invoicesForPrint = enrichedInvoices.filter(inv => routeInvoiceIds.includes(inv.id));
        if (invoicesForPrint.length === 0) return toast.warn("Esta ruta no tiene facturas para imprimir.");

        const repartidorNombre = route.repartidorNombre || 'N/A';
        const loadingReportHtml = generateLoadingReportHTML(invoicesForPrint, route.nombre, repartidorNombre, productCategoryLookup, zonaMap);
        const routeListHtml = generateRouteListHTML(invoicesForPrint, route.nombre, repartidorNombre, zonaMap);
        const content = `<div style="padding: 20px;">${loadingReportHtml}</div><div style="page-break-after: always;"></div><div style="padding: 20px;">${routeListHtml}</div>`;

        printHTML(`<html><head><style>
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
        </style></head><body>${content}</body></html>`);
    };

    // --- CIERRE MANUAL DE RUTA (carga en oficina desde la hoja de papel del repartidor) ---
    const handleFinalizeManualRoute = async (route, resultados) => {
        const facturasRuta = route.facturas || [];
        const batch = writeBatch(db);
        let quedaAlgunaDeuda = false;

        const nuevasFacturasRuta = facturasRuta.map(entry => {
            const r = resultados[entry.id] || { resultado: 'no_entregada' };
            const inv = enrichedInvoices.find(e => e.id === entry.id);

            if (r.resultado === 'no_entregada' || !inv) {
                const ventaRef = getTenantDoc('ventas', entry.id);
                batch.update(ventaRef, { estado: 'Pendiente de Entrega', rutaId: null });
                return { ...entry, estadoVisita: 'No Entregada', observacion: r.observacion || '' };
            }

            const saldoActual = inv.saldoPendiente ?? inv.totalVenta ?? 0;
            const pagos = r.pagos || [];
            const totalPagosCrudo = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
            // Si el total pagado supera el saldo (error de tipeo), lo prorrateamos para no dejar saldoPendiente negativo
            const factorAjuste = totalPagosCrudo > saldoActual && totalPagosCrudo > 0 ? saldoActual / totalPagosCrudo : 1;
            const nuevoSaldo = Math.max(0, saldoActual - Math.min(totalPagosCrudo, saldoActual));
            const nuevoEstado = nuevoSaldo <= 0.05 ? 'Pagada' : 'Adeuda';
            if (nuevoSaldo > 0.05) quedaAlgunaDeuda = true;

            const ventaRef = getTenantDoc('ventas', entry.id);
            const updateData = {
                estado: nuevoEstado,
                saldoPendiente: nuevoSaldo,
                rutaId: null,
                lastPayment: serverTimestamp()
            };

            pagos.forEach(p => {
                const montoCrudo = parseFloat(p.monto) || 0;
                if (montoCrudo <= 0) return;
                const monto = montoCrudo * factorAjuste;

                if (p.metodo === 'Efectivo') updateData.pagoEfectivo = increment(monto);
                else if (p.metodo === 'Transferencia') updateData.pagoTransferencia = increment(monto);
                else if (p.metodo === 'QR') updateData.pagoQR = increment(monto);
                else if (p.metodo === 'Point') updateData.pagoPoint = increment(monto);

                const cobranzaRef = doc(getTenantCollection('cobranzas'));
                batch.set(cobranzaRef, {
                    companyId: tenantId,
                    ventaId: entry.id,
                    clienteId: inv.clienteId,
                    clienteNombre: inv.clienteNombre,
                    monto,
                    metodoPago: p.metodo,
                    fecha: serverTimestamp(),
                    shiftId: activeShift?.id || null,
                    detalle: `Cobranza en ruta ${route.nombre} (carga manual desde hoja de papel)`
                });

                if (p.metodo === 'Efectivo') {
                    const cajaRef = doc(getTenantCollection('movimientos_caja'));
                    batch.set(cajaRef, {
                        companyId: tenantId,
                        monto,
                        tipo: 'ingreso',
                        categoria: 'cobranza_cliente',
                        detalle: `Cobranza ruta: ${inv.clienteNombre} (${route.nombre})`,
                        fecha: serverTimestamp(),
                        shiftId: activeShift?.id || null
                    });
                }
            });

            batch.update(ventaRef, updateData);

            return { ...entry, estadoVisita: nuevoEstado === 'Pagada' ? 'Pagada' : 'Adeuda', observacion: r.observacion || '' };
        });

        const routeRef = getTenantDoc('rutas', route.id);
        batch.update(routeRef, {
            facturas: nuevasFacturasRuta,
            estado: quedaAlgunaDeuda ? 'Adeuda' : 'Completada',
            fechaCierre: serverTimestamp(),
            cierreManual: true
        });

        await batch.commit();
    };

    if (routesLoading || invoicesLoading || vendorsLoading || clientesLoading || zonasLoading || cobranzasLoading) {
        return <div className="text-center p-10 text-gray-500 font-semibold">Cargando datos...</div>;
    }

    const planificadas = routes.filter(r => r.estado === 'Planificada');
    const enCurso = routes.filter(r => r.estado === 'En Curso');
    const rendicion = routes.filter(r => r.estado === 'Completada' || r.estado === 'Adeuda'); 
    const archivadas = routes.filter(r => r.estado === 'Archivada');

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

            <div className="flex justify-center mb-10">
                <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 inline-flex relative">
                    <TabButton name="planificacion" activeTab={activeTab} onClick={setActiveTab}>Planificación ({planificadas.length})</TabButton>
                    <TabButton name="en_curso" activeTab={activeTab} onClick={setActiveTab}>En Curso ({enCurso.length})</TabButton>
                    <TabButton name="rendicion" activeTab={activeTab} onClick={setActiveTab}>Rendición ({rendicion.length})</TabButton>
                    <TabButton name="anuladas" activeTab={activeTab} onClick={setActiveTab}>Histórico ({archivadas.length})</TabButton>
                </div>
            </div>

            <div className="animate-fade-in">
                {activeTab === 'planificacion' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {planificadas.map(route => (
                            <RouteCard key={route.id} route={route} onOpenPlanner={() => { setSelectedRoute(route); setPlannerReadOnly(false); setIsPlannerOpen(true); }} onCancel={() => handleCancelRoute(route)} allInvoices={enrichedInvoices} onOpenMap={() => handleOpenMap(route)} />
                        ))}
                        {planificadas.length === 0 && <EmptyState message="No hay rutas pendientes de planificación." />}
                    </div>
                )}

                {activeTab === 'en_curso' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {enCurso.map(route => (
                            <RouteCard key={route.id} route={route} onOpenPlanner={() => handleViewRoute(route)} onEdit={() => handleEditInProgress(route)} onCancel={() => handleCancelRoute(route)} allInvoices={enrichedInvoices} readOnly={false} onOpenMap={() => handleOpenMap(route)} onPrint={() => handlePrintRoute(route)} onManualClose={() => setClosingRoute(route)} />
                        ))}
                        {enCurso.length === 0 && <EmptyState message="No hay camiones en la calle ahora mismo." />}
                    </div>
                )}

                {activeTab === 'rendicion' && <TabContentRendicion routes={rendicion} allInvoices={enrichedInvoices} cobranzas={cobranzas} />}

                {activeTab === 'anuladas' && (
                    <div className="space-y-4">
                        <TabContentRendicion routes={archivadas} allInvoices={enrichedInvoices} cobranzas={cobranzas} />
                        {archivadas.length === 0 && <EmptyState message="No hay historial de rutas rendidas." />}
                    </div>
                )}
            </div>

            {isPlannerOpen && selectedRoute && (
                <PlannerView 
                    route={selectedRoute} onClose={() => { setIsPlannerOpen(false); setSelectedRoute(null); }} 
                    allPendingInvoices={pendingInvoices} repartidores={repartidoresOnly} zonas={zonas} vendors={vendedoresOnly}
                    onDispatch={handleDispatchRoute} isReadOnly={plannerReadOnly}
                />
            )}

            {isMapOpen && mapRoute && (
                <RouteMapMonitor
                    isOpen={isMapOpen}
                    onClose={() => { setIsMapOpen(false); setMapRoute(null); }}
                    route={mapRoute}
                    clientes={clientes}
                />
            )}

            {closingRoute && (
                <CierreManualModal
                    route={closingRoute}
                    invoices={enrichedInvoices.filter(inv => (closingRoute.facturas || []).some(f => f.id === inv.id))}
                    onClose={() => setClosingRoute(null)}
                    onConfirm={async (resultados) => {
                        await handleFinalizeManualRoute(closingRoute, resultados);
                        setClosingRoute(null);
                    }}
                />
            )}
        </div>
    );
}

// --- COMPONENTES UI ---
const TabButton = ({ name, activeTab, onClick, children }) => {
    const isActive = activeTab === name;
    return (
        <button onClick={() => onClick(name)} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${isActive ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
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

const RouteCard = ({ route, onOpenPlanner, allInvoices, readOnly, onEdit, onCancel, onOpenMap, onPrint, onManualClose }) => {
    const { MapPin } = { MapPin: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> };
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
        'Archivada': { color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
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
                    <div className="flex gap-2">
                        <button onClick={onOpenMap} title="Auditoría GPS" className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition-colors"><MapPin className="w-4 h-4"/></button>
                        <button onClick={onOpenPlanner} title="Gestionar" className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"><EditIcon className="w-4 h-4"/></button>
                        <button onClick={onCancel} title="Eliminar Planificación" className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4"/></button>
                    </div>
                )}
                {estado === 'En Curso' && (
                    <div className="flex gap-2">
                        <button onClick={onOpenMap} title="Auditoría GPS" className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition-colors"><MapPin className="w-4 h-4"/></button>
                        <button onClick={onPrint} title="Imprimir Hoja de Ruta / Reporte de Carga" className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"><PrinterIcon className="w-4 h-4"/></button>
                        <button onClick={onEdit} title="Editar Ruta" className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><EditIcon className="w-4 h-4"/></button>
                    </div>
                )}
            </div>
            <div className="relative z-10">
                <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{nombre}</h3>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1"><TruckIcon className="w-3 h-3"/> {repartidorNombre || 'Sin asignar'}</p>
            </div>
            {(estado === 'En Curso' || estado === 'Completada' || estado === 'Adeuda') && (
                <div className="mt-6 mb-2">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1.5">
                        <span>PROGRESO</span>
                        <span>{liveStats.completed} / {liveStats.total}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ease-out ${status.dot}`} style={{width: `${liveStats.progress}%`}}></div>
                    </div>
                </div>
            )}
            {estado === 'En Curso' && !readOnly && (
                <>
                    <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-dashed border-gray-100">
                        <button onClick={onOpenPlanner} title="Monitorizar" className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:scale-110 transition-all shadow-sm border border-blue-100"><EyeIcon className="w-5 h-5"/></button>
                        <button onClick={onPrint} title="Imprimir Hoja de Ruta / Reporte de Carga" className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 hover:scale-110 transition-all shadow-sm border border-emerald-100"><PrinterIcon className="w-5 h-5"/></button>
                        <button onClick={onEdit} title="Editar Ruta" className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center hover:bg-yellow-100 hover:scale-110 transition-all shadow-sm border border-yellow-100"><EditIcon className="w-5 h-5"/></button>
                        <button onClick={onCancel} title="Anular y Eliminar" className="w-10 h-10 rounded-full bg-white text-gray-300 flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all border border-gray-100"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                    <button onClick={onManualClose} title="Cargar hoja de papel del repartidor y finalizar la ruta" className="mt-3 w-full py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md">
                        <ClipboardCheckIcon className="w-4 h-4"/> FINALIZAR RUTA (CARGA MANUAL)
                    </button>
                </>
            )}
            {estado === 'Planificada' && !readOnly && (
                <button onClick={onOpenPlanner} className="mt-6 w-full py-3 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-md">
                    GESTIONAR <ArrowRightIcon className="w-3 h-3"/>
                </button>
            )}
        </div>
    );
};

// --- CIERRE MANUAL DE RUTA (carga en oficina desde la hoja de papel del repartidor) ---
// Métodos de pago alineados 1:1 con lo que ya reconcilian generateSettlementReportHTML/TabContentRendicion y Caja.jsx
const METODOS_PAGO = [
    { value: 'Efectivo', label: '💵 Efectivo' },
    { value: 'Transferencia', label: '🏦 Transferencia' },
    { value: 'QR', label: '📱 QR (Mercado Pago)' },
    { value: 'Point', label: '💳 Point Smart' },
];

const CierreManualModal = ({ route, invoices, onClose, onConfirm }) => {
    const [resultados, setResultados] = useState(() => {
        const initial = {};
        invoices.forEach(inv => {
            initial[inv.id] = {
                resultado: 'entregada',
                pagos: [{ metodo: 'Efectivo', monto: inv.saldoPendiente ?? inv.totalVenta ?? 0 }],
                observacion: ''
            };
        });
        return initial;
    });
    const [isSaving, setIsSaving] = useState(false);

    const updateRow = (id, patch) => setResultados(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    const updatePago = (id, idx, patch) => setResultados(prev => {
        const pagos = prev[id].pagos.map((p, i) => i === idx ? { ...p, ...patch } : p);
        return { ...prev, [id]: { ...prev[id], pagos } };
    });
    const addPago = (id) => setResultados(prev => {
        const otroMetodo = METODOS_PAGO.find(m => m.value !== prev[id].pagos[0].metodo)?.value || 'Transferencia';
        return { ...prev, [id]: { ...prev[id], pagos: [...prev[id].pagos, { metodo: otroMetodo, monto: 0 }] } };
    });
    const removePago = (id, idx) => setResultados(prev => ({ ...prev, [id]: { ...prev[id], pagos: prev[id].pagos.filter((_, i) => i !== idx) } }));

    const montoTotalPagos = (pagos) => pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);

    const summary = useMemo(() => {
        let totalPrevisto = 0, totalCobrado = 0, totalEfectivo = 0, totalTransferencia = 0, totalQR = 0, totalPoint = 0, noEntregadas = 0, quedanDeuda = 0;
        invoices.forEach(inv => {
            const r = resultados[inv.id];
            const saldo = inv.saldoPendiente ?? inv.totalVenta ?? 0;
            totalPrevisto += saldo;
            if (!r || r.resultado === 'no_entregada') { noEntregadas++; return; }
            const totalPagado = Math.min(montoTotalPagos(r.pagos), saldo);
            totalCobrado += totalPagado;
            r.pagos.forEach(p => {
                const monto = parseFloat(p.monto) || 0;
                if (p.metodo === 'Efectivo') totalEfectivo += monto;
                else if (p.metodo === 'Transferencia') totalTransferencia += monto;
                else if (p.metodo === 'QR') totalQR += monto;
                else if (p.metodo === 'Point') totalPoint += monto;
            });
            if (saldo - totalPagado > 0.05) quedanDeuda++;
        });
        return { totalPrevisto, totalCobrado, totalEfectivo, totalTransferencia, totalQR, totalPoint, noEntregadas, quedanDeuda };
    }, [invoices, resultados]);

    const handleConfirmClick = async () => {
        if (!window.confirm(`¿Confirmar el cierre de "${route.nombre}"?\n\nSe registrarán los cobros, se actualizará la deuda de cada cliente y la ruta pasará a Rendición.`)) return;
        setIsSaving(true);
        try {
            await onConfirm(resultados);
            toast.success("Ruta finalizada y cobros registrados correctamente.");
        } catch (error) {
            console.error(error);
            toast.error("Error al finalizar la ruta: " + error.message);
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4">
            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ClipboardCheckIcon className="text-indigo-600"/> Cierre Manual de Ruta</h2>
                        <p className="text-xs text-gray-500 font-medium mt-1">{route.nombre} · Cargá acá el resultado de la hoja de papel del repartidor</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                    {invoices.map(inv => {
                        const r = resultados[inv.id] || {};
                        const saldo = inv.saldoPendiente ?? inv.totalVenta ?? 0;
                        const esEntregada = r.resultado !== 'no_entregada';
                        const totalPagado = Math.min(montoTotalPagos(r.pagos || []), saldo);
                        return (
                            <div key={inv.id} className={`bg-white border rounded-xl p-4 ${esEntregada ? 'border-gray-100' : 'border-red-200 bg-red-50/30'}`}>
                                <div className="flex justify-between items-start gap-4 flex-wrap">
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-800 text-sm">{inv.clienteNombre}</p>
                                        <p className="text-xs text-gray-500">{inv.clienteDireccion}</p>
                                        <p className="text-xs text-gray-400 mt-1">Total factura: {formatCurrency(inv.totalVenta)} &nbsp;·&nbsp; Saldo actual: <strong className="text-gray-600">{formatCurrency(saldo)}</strong></p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => updateRow(inv.id, { resultado: 'entregada' })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${esEntregada ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300'}`}>ENTREGADA</button>
                                        <button onClick={() => updateRow(inv.id, { resultado: 'no_entregada' })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${!esEntregada ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-500 border-gray-200 hover:border-red-300'}`}>NO ENTREGADA</button>
                                    </div>
                                </div>
                                {esEntregada && (
                                    <div className="mt-3 space-y-2">
                                        {(r.pagos || []).map((p, idx) => (
                                            <div key={idx} className="flex gap-3 flex-wrap items-end">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{idx === 0 ? 'Monto Cobrado' : 'Monto (2º método)'}</label>
                                                    <input type="number" value={p.monto} onChange={e => updatePago(inv.id, idx, { monto: e.target.value })} className="w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Método</label>
                                                    <select value={p.metodo} onChange={e => updatePago(inv.id, idx, { metodo: e.target.value })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                        {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                                    </select>
                                                </div>
                                                {idx > 0 && (
                                                    <button onClick={() => removePago(inv.id, idx)} className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"><XIcon className="w-4 h-4"/></button>
                                                )}
                                                {idx === (r.pagos.length - 1) && r.pagos.length < 2 && (
                                                    <button onClick={() => addPago(inv.id)} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors">+ Pago combinado (2º método)</button>
                                                )}
                                                {idx === (r.pagos.length - 1) && totalPagado < saldo - 0.05 && (
                                                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-lg">Queda a cuenta corriente: {formatCurrency(saldo - totalPagado)}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-3">
                                    <input type="text" placeholder="Observación (opcional)" value={r.observacion || ''} onChange={e => updateRow(inv.id, { observacion: e.target.value })} className="w-full px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                            </div>
                        );
                    })}
                    {invoices.length === 0 && <p className="text-center text-gray-400 py-10">Esta ruta no tiene facturas.</p>}
                </div>
                <div className="bg-white border-t border-gray-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4 text-center">
                        <div className="bg-gray-50 rounded-xl p-2"><p className="text-[9px] font-bold text-gray-400 uppercase">Previsto</p><p className="text-sm font-bold text-gray-800">{formatCurrency(summary.totalPrevisto)}</p></div>
                        <div className="bg-emerald-50 rounded-xl p-2"><p className="text-[9px] font-bold text-emerald-500 uppercase">Cobrado</p><p className="text-sm font-bold text-emerald-700">{formatCurrency(summary.totalCobrado)}</p></div>
                        <div className="bg-blue-50 rounded-xl p-2"><p className="text-[9px] font-bold text-blue-500 uppercase">Efectivo</p><p className="text-sm font-bold text-blue-700">{formatCurrency(summary.totalEfectivo)}</p></div>
                        <div className="bg-indigo-50 rounded-xl p-2"><p className="text-[9px] font-bold text-indigo-500 uppercase">Transferencia</p><p className="text-sm font-bold text-indigo-700">{formatCurrency(summary.totalTransferencia)}</p></div>
                        <div className="bg-purple-50 rounded-xl p-2"><p className="text-[9px] font-bold text-purple-500 uppercase">QR</p><p className="text-sm font-bold text-purple-700">{formatCurrency(summary.totalQR)}</p></div>
                        <div className="bg-cyan-50 rounded-xl p-2"><p className="text-[9px] font-bold text-cyan-500 uppercase">Point</p><p className="text-sm font-bold text-cyan-700">{formatCurrency(summary.totalPoint)}</p></div>
                        <div className="bg-orange-50 rounded-xl p-2"><p className="text-[9px] font-bold text-orange-500 uppercase">A Deuda / No Entreg.</p><p className="text-sm font-bold text-orange-700">{summary.quedanDeuda + summary.noEntregadas}</p></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3 rounded-xl transition-all">CANCELAR</button>
                        <button onClick={handleConfirmClick} disabled={isSaving} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2">
                            {isSaving ? <span className="animate-pulse">Finalizando...</span> : <><ClipboardCheckIcon className="w-5 h-5"/> FINALIZAR RUTA Y CERRAR CAJA</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TabContentRendicion = ({ routes, allInvoices, cobranzas = [] }) => {
    const [expandedRouteId, setExpandedRouteId] = useState(null);
    const { updateTenantDoc, deleteTenantDoc } = useFirestore();
    const handleArchiveRoute = async (route) => {
        if (!window.confirm(`¿Confirmar cierre de ruta "${route.nombre}"?\n\nSe archivará la ruta y se liberará al repartidor.`)) return;
        try { await updateTenantDoc('rutas', route.id, { estado: 'Archivada', fechaCierre: Timestamp.now() }); toast.success("Ruta archivada correctamente."); } catch (e) { console.error(e); toast.error("Error al cerrar la ruta."); }
    };
    const handleDeleteArchivedRoute = async (routeId) => {
        if(!window.confirm("¿Eliminar este registro del historial? Esta acción es irreversible.")) return;
        try { await deleteTenantDoc('rutas', routeId); toast.success("Registro eliminado."); } catch(e) { console.error(e); toast.error("Error al eliminar."); }
    }
    return (
        <div className="space-y-4 animate-fade-in">
            {routes.map(route => {
                const routeInvoices = allInvoices.filter(i => (route.facturas || []).some(f => f.id === i.id));
                const totals = routeInvoices.reduce((acc, i) => ({ 
                    efectivo: acc.efectivo + (i.pagoEfectivo || 0), 
                    transferencia: acc.transferencia + (i.pagoTransferencia || 0), 
                    qr: acc.qr + (i.pagoQR || 0),
                    point: acc.point + (i.pagoPoint || 0),
                    pendiente: acc.pendiente + (i.saldoPendiente || 0),
                    total: acc.total + (i.totalVenta || 0)
                }), { efectivo: 0, transferencia: 0, qr: 0, point: 0, pendiente: 0, total: 0 });

                // Cobros de saldos pendientes de OTRAS ventas, cobrados por el repartidor durante esta ruta.
                const routeCobranzas = cobranzas.filter(c => c.rutaId === route.id);
                const cobranzasTotals = routeCobranzas.reduce((acc, c) => ({
                    efectivo: acc.efectivo + (c.metodoPago === 'Efectivo' ? (c.monto || 0) : 0),
                    transferencia: acc.transferencia + (c.metodoPago === 'Transferencia' ? (c.monto || 0) : 0),
                    qr: acc.qr + (c.metodoPago === 'QR' ? (c.monto || 0) : 0),
                    point: acc.point + (c.metodoPago === 'Point' ? (c.monto || 0) : 0),
                    total: acc.total + (c.monto || 0),
                }), { efectivo: 0, transferencia: 0, qr: 0, point: 0, total: 0 });

                const isExpanded = expandedRouteId === route.id;
                const isArchived = route.estado === 'Archivada';
                return (
                    <div key={route.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md">
                        <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}>
                            <div className="flex items-center gap-4">
                                <div className={`${isArchived ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'} p-3 rounded-full`}><TruckIcon className="w-6 h-6"/></div>
                                <div><h3 className="text-lg font-bold text-gray-900">{route.nombre}</h3><p className="text-sm text-gray-500 font-medium">{route.repartidorNombre} {isArchived && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full ml-2">FINALIZADA</span>}</p></div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right hidden md:block">
                                    <span className="text-xs font-bold text-gray-400 uppercase block mb-0.5">{isArchived ? 'Rendido' : 'Recaudado (E+T+QR+P)'}</span>
                                    <span className="text-xl font-bold text-gray-900">{formatCurrency(totals.efectivo + totals.transferencia + totals.qr + totals.point + cobranzasTotals.total)}</span>
                                    {cobranzasTotals.total > 0 && <span className="block text-[10px] font-bold text-amber-600 mt-0.5">incl. {formatCurrency(cobranzasTotals.total)} de saldos pendientes</span>}
                                </div>
                                <button className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-gray-200' : ''}`}><ChevronDownIcon className="w-5 h-5 text-gray-600"/></button>
                            </div>
                        </div>
                        {isExpanded && (
                            <div className="bg-gray-50/50 border-t border-gray-100 p-6">
                                {cobranzasTotals.total > 0 && (
                                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                                        <p className="text-xs font-bold text-amber-700 uppercase mb-2">Cobros de saldos pendientes durante esta ruta (ajenos a las facturas de hoy)</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                            <div><p className="text-[9px] font-bold text-amber-500 uppercase">Efectivo</p><p className="text-sm font-bold text-amber-800">{formatCurrency(cobranzasTotals.efectivo)}</p></div>
                                            <div><p className="text-[9px] font-bold text-amber-500 uppercase">Transferencia</p><p className="text-sm font-bold text-amber-800">{formatCurrency(cobranzasTotals.transferencia)}</p></div>
                                            <div><p className="text-[9px] font-bold text-amber-500 uppercase">QR</p><p className="text-sm font-bold text-amber-800">{formatCurrency(cobranzasTotals.qr)}</p></div>
                                            <div><p className="text-[9px] font-bold text-amber-500 uppercase">Point</p><p className="text-sm font-bold text-amber-800">{formatCurrency(cobranzasTotals.point)}</p></div>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-end gap-4">
                                    <button onClick={() => printHTML(generateSettlementReportHTML(route, routeInvoices, routeCobranzas))} className="py-3 px-6 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 flex items-center gap-2"><PrinterIcon className="w-5 h-5 text-gray-500"/> {isArchived ? 'Reimprimir Reporte' : 'Imprimir Reporte'}</button>
                                    {!isArchived ? (
                                        <button onClick={() => handleArchiveRoute(route)} className="py-3 px-6 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black flex items-center gap-2"><ArchiveIcon className="w-5 h-5"/> Confirmar y Cerrar Ruta</button>
                                    ) : (
                                        <button onClick={() => handleDeleteArchivedRoute(route.id)} className="py-3 px-6 bg-red-50 text-red-600 border border-red-100 font-bold rounded-xl hover:bg-red-100 flex items-center gap-2"><TrashIcon className="w-5 h-5"/> Eliminar del Historial</button>
                                    )}
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