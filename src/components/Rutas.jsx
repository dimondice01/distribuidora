import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js';
import { collection, onSnapshot, query, where, doc, writeBatch, Timestamp, addDoc, updateDoc, runTransaction, orderBy, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions'; 
import { useFirestore } from '../hooks/useFirestore';
import { useTenant } from '../contexts/TenantContext';
import { toast } from 'react-toastify';
import RouteMapMonitor from './RouteMapMonitor';

// Inicializamos Cloud Functions
const functions = getFunctions(); 
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

// --- UTILIDADES ---
const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

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

const generateRouteListHTML = (invoices, routeName, repartidorNombre) => {
    let totalRuta = 0;
    const clientRows = invoices.map((inv, index) => {
        totalRuta += inv.totalVenta || 0;
        return `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; width: 40px; font-size: 12px;">${index + 1}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; font-size: 14px;">${inv.clienteNombre}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; color: #555;">${inv.clienteDireccion || 'S/D'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 14px;">${formatCurrency(inv.totalVenta)}</td>
            </tr>
        `;
    }).join('');

    return `
    <html>
    <head><title>Listado de Ruta - ${routeName}</title>
    <style>
        body{font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; color: #333;}
        h1, h2, h3 {color: #1e293b; margin: 5px 0;}
        table{width: 100%; border-collapse: collapse; margin-top: 20px;}
        th, td{padding: 10px; text-align: left;}
        thead{background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;}
        th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
    </style>
    </head>
    <body>
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 10px;">
            <h1 style="font-size: 24px;">Hoja de Ruta (Visitas y Cobranzas)</h1>
            <h2 style="font-size: 16px; color: #475569;">${routeName}</h2>
            <h3 style="font-size: 14px; font-weight: normal;">Repartidor: <strong style="color: #0f172a;">${repartidorNombre}</strong></h3>
        </div>
        <p style="font-size: 10px; color: #94a3b8; text-align: right; margin-top: -30px;">Emitido: ${new Date().toLocaleString('es-AR')}</p>
        
        <table>
            <thead>
                <tr>
                    <th style="text-align: center;">Parada</th>
                    <th>Cliente</th>
                    <th>Dirección</th>
                    <th style="text-align: right;">Monto a Cobrar</th>
                </tr>
            </thead>
            <tbody>
                ${clientRows}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="text-align: right; padding: 15px; font-size: 14px; color: #64748b; text-transform: uppercase;">Total Esperado en Ruta:</td>
                    <td style="text-align: right; padding: 15px; font-size: 20px; font-weight: 900; background: #f8fafc; border-top: 2px solid #0f172a; border-bottom: 2px solid #e2e8f0;">${formatCurrency(totalRuta)}</td>
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
    const tituloComprobante = tieneCAE ? 'FACTURA' : 'PRESUPUESTO';
    const codComprobante = tieneCAE ? (letra === 'A' ? 'COD. 001' : letra === 'B' ? 'COD. 006' : 'COD. 011') : 'COD. 000';
    
    const ptoVtaStr = String(config?.ptoVta || "00001").padStart(5, '0');
    const numCompStr = String(venta.afipNumeroComprobante || venta.id.substring(0, 8)).padStart(8, '0');
    const numeroCompleto = `${ptoVtaStr}-${numCompStr}`;

    const qrUrl = getAfipQrUrl(venta, config);

    // Condición IVA Abreviada
    const condIvaTexto = venta.clienteCondicionIVA === 'RI' ? 'Resp. Inscripto' : venta.clienteCondicionIVA === 'MT' ? 'Monotributo' : 'Cons. Final';

    // Fecha Vencimiento formateada
    const vtoCaeFormateado = venta.afipFechaVtoCAE ? formatAfipDate(venta.afipFechaVtoCAE) : '';

    const isRI = config?.taxCondition === 'RI' || config?.taxCondition === 'RESPONSABLE_INSCRIPTO';
    const isMT = !isRI;

    const itemsHtml = (venta.items || []).map((item, index) => `
        <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 2px 5px; font-size: 10px;">${item.nombre}</td>
            <td style="padding: 2px 5px; text-align: center; font-size: 10px;">${item.quantity}</td>
            <td style="padding: 2px 5px; text-align: right; font-size: 10px;">${formatCurrency(item.precio)}</td>
            <td style="padding: 2px 5px; text-align: right; font-size: 10px; font-weight: bold;">${formatCurrency(item.quantity * item.precio)}</td>
        </tr>
    `).join('');

    let bloquePie = '';
    if (tieneCAE) {
        bloquePie = `
            <div style="display: flex; gap: 10px; align-items: center;">
                <div><img src="${qrUrl}" alt="QR" style="width: 80px; height: 80px; display: block; border: 1px solid #000;"></div>
                <div style="font-size: 10px; font-weight: bold; line-height: 1.4;">
                    <span style="font-size: 12px; font-style: italic;">AFIP</span><br>
                    CAE: ${venta.afipCAE}<br>
                    Vto. CAE: ${vtoCaeFormateado}
                </div>
            </div>
        `;
    } else {
        bloquePie = `
            <div style="border: 1px dashed #999; padding: 5px; text-align: center; background: #eee;">
                <strong style="font-size: 10px;">DOCUMENTO NO VÁLIDO COMO FACTURA</strong>
            </div>
        `;
    }

    return `
    <div style="font-family: 'Arial Narrow', Arial, sans-serif; max-width: 760px; margin: auto; border: 1px solid #000; background: #fff; color: #000; position: relative;">
        
        <div style="border-bottom: 1px solid #000; height: 120px; position: relative;">
            
            <div style="position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 60px; height: 60px; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; background: #fff; text-align: center; display: flex; flex-direction: column; justify-content: center;">
                <div style="font-size: 32px; font-weight: bold; line-height: 1;">${letra}</div>
                <div style="font-size: 9px; margin-top: 2px;">${codComprobante}</div>
            </div>
            
            <div style="position: absolute; left: 50%; top: 60px; bottom: 0; border-left: 1px solid #000;"></div>

            <div style="width: 50%; float: left; padding: 10px; box-sizing: border-box;">
                
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    ${config?.logo ? `
                        <img src="${config.logo}" alt="Logo" style="max-height: 50px; max-width: 180px; object-fit: contain; object-position: left;">
                    ` : `
                        <div style="width: 35px; height: 35px; background-color: #0f172a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fbbf24; font-weight: 900; font-size: 20px; font-family: Arial, sans-serif;">
                            ${(config?.nombreFantasia || config?.name || 'D')[0].toUpperCase()}
                        </div>
                        <div style="font-size: 18px; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -1px; font-family: Arial, sans-serif;">
                            ${config?.nombreFantasia || config?.name || ''}
                        </div>
                    `}
                </div>

                <p style="margin: 0; font-size: 9px; line-height: 1.3;">
                    <strong>${config?.nombreFantasia || config?.name || ''}</strong><br>
                    <strong>Domicilio:</strong> ${config?.domicilioFiscal || ''}<br>
                    <strong>Condición IVA:</strong> ${isRI ? 'Responsable Inscripto' : 'Monotributo'}
                </p>
            </div>

            <div style="width: 50%; float: right; padding: 10px 10px 10px 40px; box-sizing: border-box;">
                <h2 style="margin: 0 0 5px 0; font-size: 16px;">${tituloComprobante}</h2>
                <p style="margin: 0; font-size: 10px; line-height: 1.4;">
                    <strong>Punto de Venta: ${ptoVtaStr}</strong> &nbsp; <strong>Comp. Nro: ${numCompStr}</strong><br>
                    <strong>Fecha de Emisión:</strong> ${fechaImpresion.toLocaleDateString('es-AR')}<br>
                    <strong>CUIT:</strong> ${config?.cuit || ''} <br>
                    <strong>Ing. Brutos:</strong> ${config?.iibb || ''} <br>
                    <strong>Inicio de Actividades:</strong> ${config?.inicioActividades || ''}
                </p>
            </div>
        </div>

        <div style="border-bottom: 1px solid #000; padding: 4px 10px; font-size: 9px; background: #fff; line-height: 1.3;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 65%; padding-bottom: 2px; vertical-align: top;">
                        <span style="color:#444; font-size:8px; text-transform:uppercase;">Cliente:</span> 
                        <strong style="text-transform: uppercase; font-size: 10px;">${venta.clienteNombre || clientDetails.nombre || 'CONSUMIDOR FINAL'}</strong>
                    </td>
                    <td style="width: 35%; padding-bottom: 2px; text-align: right; vertical-align: top;">
                        <span style="color:#444; font-size:8px; text-transform:uppercase;">CUIT/DNI:</span> 
                        <strong style="font-size: 10px;">${venta.clienteCuit || clientDetails.numeroDocumento || 'S/D'}</strong>
                    </td>
                </tr>
                <tr>
                    <td colspan="2" style="padding-top: 2px; vertical-align: top;">
                        <span style="color:#444; font-size:8px; text-transform:uppercase;">Domicilio:</span> 
                        <span style="font-size: 9px;">${clientDetails.direccion || 'N/A'}</span>
                        &nbsp;&nbsp;<span style="color:#ccc">|</span>&nbsp;&nbsp;
                        <span style="color:#444; font-size:8px; text-transform:uppercase;">IVA:</span> 
                        <span style="font-size: 9px;">${condIvaTexto}</span>
                    </td>
                </tr>
            </table>
        </div>

        <div style="min-height: 250px; padding-top: 5px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead style="border-bottom: 1px solid #000; border-top: 1px solid #000; background: #eee;">
                    <tr>
                        <th style="padding: 4px; text-align: left;">DESCRIPCIÓN</th>
                        <th style="padding: 4px; text-align: center; width: 40px;">CANT.</th>
                        <th style="padding: 4px; text-align: right; width: 80px;">P. UNIT.</th>
                        <th style="padding: 4px; text-align: right; width: 80px;">IMPORTE</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        </div>

        <div style="border-top: 1px solid #000; display: flex;">
            <div style="width: 65%; padding: 10px; box-sizing: border-box;">
                ${bloquePie}
            </div>

            <div style="width: 35%; border-left: 1px solid #000;">
                <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                    ${isRI && letra === 'A' ? `
                    <tr>
                        <td style="padding: 3px 15px 3px 5px; text-align: right;"><strong>Neto Gravado:</strong></td>
                        <td style="padding: 3px 15px 3px 5px; text-align: right;">${formatCurrency(venta.totalVenta / 1.21)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 3px 15px 3px 5px; text-align: right;"><strong>IVA (21%):</strong></td>
                        <td style="padding: 3px 15px 3px 5px; text-align: right;">${formatCurrency(venta.totalVenta - (venta.totalVenta / 1.21))}</td>
                    </tr>
                    ` : `
                    <tr>
                        <td style="padding: 5px 15px 5px 5px; text-align: right;"><strong>Subtotal:</strong></td>
                        <td style="padding: 5px 15px 5px 5px; text-align: right;">${formatCurrency(venta.totalVenta)}</td>
                    </tr>
                    `}
                    <tr style="background: #ddd; border-top: 1px solid #000;">
                        <td style="padding: 8px 15px 8px 8px; text-align: right; font-size: 13px;"><strong>TOTAL:</strong></td>
                        <td style="padding: 8px 15px 8px 8px; text-align: right; font-size: 13px;"><strong>${formatCurrency(venta.totalVenta)}</strong></td>
                    </tr>
                </table>
            </div>
        </div>
        
    </div>`;
};

// --- REPORTE DE RENDICIÓN (AUTOMÁTICO) ---
const generateSettlementReportHTML = (route, invoices) => {
    const resumen = invoices.reduce((acc, fac) => {
        acc.efectivo += fac.pagoEfectivo || 0;
        acc.transferencia += fac.pagoTransferencia || 0;
        acc.qr += fac.pagoQR || 0;
        acc.point += fac.pagoPoint || 0;
        acc.saldoPendiente += fac.saldoPendiente || 0;
        acc.totalVenta += fac.totalVenta || 0;
        return acc;
    }, { efectivo: 0, transferencia: 0, qr: 0, point: 0, saldoPendiente: 0, totalVenta: 0 });

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

    return `<html><head><title>Rendición - ${route.nombre}</title><style>body{font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #333;} h1, h2, h3 {color: #2c3e50;} table{width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px;} th, td{padding: 8px; text-align: left; border-bottom: 1px solid #eee;} th{background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #7f8c8d;} .box { border: 2px solid #3498db; padding: 15px; border-radius: 8px; margin-bottom: 20px; background: #f0f8ff; } .amount { text-align: right; } .danger { color: #e74c3c; } .success { color: #27ae60; font-weight: bold; }</style></head><body><div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3498db; padding-bottom: 10px;"><div><h1 style="margin:0;">Reporte de Rendición</h1><p style="margin:5px 0; color: #7f8c8d;">Ruta: <strong>${route.nombre}</strong> | Repartidor: <strong>${route.repartidorNombre}</strong></p></div><div style="text-align: right;"><p style="font-size: 12px;">Fecha: ${new Date().toLocaleString('es-AR')}</p></div></div><h3>1. DINERO A ENTREGAR (CAJA)</h3><div class="box"><table style="margin:0;"><tr><td style="font-size: 14px;">EFECTIVO (Billetes):</td><td class="amount success" style="font-size: 18px;">${formatCurrency(resumen.efectivo)}</td></tr><tr><td style="font-size: 14px;">TRANSFERENCIAS:</td><td class="amount" style="font-size: 16px;">${formatCurrency(resumen.transferencia)}</td></tr><tr><td style="font-size: 14px;">MERCADO PAGO (QR):</td><td class="amount" style="font-size: 16px;">${formatCurrency(resumen.qr)}</td></tr><tr><td style="font-size: 14px;">POINT SMART (Tarjeta):</td><td class="amount" style="font-size: 16px;">${formatCurrency(resumen.point)}</td></tr><tr style="border-top: 1px solid #ccc;"><td style="font-size: 14px;">FIADO / CTA CTE:</td><td class="amount danger" style="font-size: 16px;">${formatCurrency(resumen.saldoPendiente)}</td></tr><tr style="border-top: 2px solid #333; background-color: #fff;"><td><strong>TOTAL VENTA RUTA:</strong></td><td class="amount" style="font-size: 20px;"><strong>${formatCurrency(resumen.totalVenta)}</strong></td></tr></table></div><h3>2. RETORNO DE MERCADERÍA (STOCK)</h3>${devolucionesRows.length > 0 ? `<table><thead><tr><th style="width:100px; text-align:center;">CANT. A BAJAR</th><th>PRODUCTO</th></tr></thead><tbody>${devolucionesRows}</tbody></table>` : '<p style="font-style: italic; color: #7f8c8d; padding: 10px; border: 1px dashed #ccc;">No hubo rechazos ni ediciones. El camión vuelve vacío.</p>'}<h3>3. Detalle por Cliente</h3><table><thead><tr><th>Cliente</th><th>Estado</th><th class="amount">Total</th><th class="amount">Efvo.</th><th class="amount">Transf.</th><th class="amount">QR</th><th class="amount">Point</th><th class="amount">Deuda</th></tr></thead><tbody>${facturasRows}</tbody></table><div style="margin-top: 60px; display: flex; justify-content: space-between;"><div style="text-align: center; width: 40%; border-top: 1px solid #000; padding-top: 5px;">Firma Responsable Caja</div><div style="text-align: center; width: 40%; border-top: 1px solid #000; padding-top: 5px;">Firma Repartidor</div></div></body></html>`;
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

    const handleConfirmDispatch = async () => {
        if (!assignedRepartidor) return toast.error("Debes asignar un repartidor.");
        if (selectedInvoices.length === 0) return toast.error("La ruta está vacía.");
        setIsDispatching(true);
        try {
            await onDispatch(route.id, assignedRepartidor, selectedInvoices, routeSummary);
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
                                            {inv.facturaAfip && <span className="ml-1 inline-block text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md border border-blue-100">AFIP</span>}
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
                                <button onClick={handleConfirmDispatch} disabled={isDispatching || !assignedRepartidor || selectedInvoices.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2 active:scale-[0.99]">
                                    {isDispatching ? <span className="animate-pulse">Contactando AFIP...</span> : <><TruckIcon className="w-5 h-5"/> {isEditMode ? 'GUARDAR CAMBIOS' : 'CONFIRMAR Y DESPACHAR'}</>}
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
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [mapRoute, setMapRoute] = useState(null);
    const [activeTab, setActiveTab] = useState('planificacion');
    const [plannerReadOnly, setPlannerReadOnly] = useState(false);
    const { tenantId, getTenantCollection, getTenantDoc, addTenantDoc, updateTenantDoc, deleteTenantDoc, db, onTenantSnapshot } = useFirestore();
    const { companyConfig: config } = useTenant();

    const { data: routes, isLoading: routesLoading } = useFirestoreSubscription('rutas', [{ field: 'fechaCreacion', direction: 'desc' }]);
    const { data: allInvoices, isLoading: invoicesLoading } = useFirestoreSubscription('ventas');
    const { data: allVendors, isLoading: vendorsLoading } = useFirestoreSubscription('vendedores');
    const { data: clientes, isLoading: clientesLoading } = useFirestoreSubscription('clientes');
    const { data: zonas, isLoading: zonasLoading } = useFirestoreSubscription('zonas');
    
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
                facturaAfip: invoice.facturaAfip ?? cliente?.isArca ?? false,
                clienteCondicionIVA: invoice.clienteCondicionIVA ?? cliente?.condicionIva ?? 'CF',
                clienteCuit: invoice.clienteCuit ?? cliente?.numeroDocumento ?? '',
                // --- AUTOMATIZACIÓN FISCAL ---
                afipLetra: invoice.afipLetra || (config?.taxCondition === 'MT' ? 'C' : ((invoice.clienteCondicionIVA ?? cliente?.condicionIva) === 'RI' ? 'A' : 'B')),
                companyInfo: config
            };
        });
    }, [allInvoices, clientes]);

    const pendingInvoices = useMemo(() => enrichedInvoices.filter(inv => inv.estado === 'Pendiente de Entrega'), [enrichedInvoices]);
    const repartidoresOnly = useMemo(() => {
        const filtered = allVendors.filter(v => {
            const roleStr = (v.rango || v.role || v.rol || '').toLowerCase().trim();
            // Aceptamos 'reparto', 'repartidor', 'vendedor' (para mayor compatibilidad) o 'administrador'
            return roleStr.includes('reparto') || roleStr.includes('vendedor') || roleStr === 'administrador';
        });

        if (allVendors.length > 0 && filtered.length === 0) {
            console.warn("⚠️ Filtro de repartidores: Se encontraron usuarios, pero ninguno coincide con 'reparto', 'vendedor' o 'administrador'.", allVendors);
        }

        return filtered;
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
    const handleDispatchRoute = async (routeId, repartidorId, facturas, resumen) => {
        const repartidor = allVendors.find(r => r.id === repartidorId);
        
        // --- BLINDAJE FISCAL: PRE-VUELO ---
        const facturasAfipParaProcesar = facturas.filter(inv => inv.facturaAfip === true && !inv.afipCAE);
        
        if (facturasAfipParaProcesar.length > 0) {
            if (!config?.cuit || !config?.taxCondition || !config?.ptoVta) {
                toast.error("❌ ERROR FISCAL: Configuración AFIP incompleta. Cargue CUIT/IVA en Integraciones.");
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
        const loadingReportHtml = generateLoadingReportHTML(facturasParaImprimir, selectedRoute?.nombre, repartidor?.nombreCompleto);
        allPrintContent += `<div style="padding: 20px;">${loadingReportHtml}</div><div style="page-break-after: always;"></div>`;
        
        // B. Listado de Ruta (Clientes a visitar y Cobranzas)
        const routeListHtml = generateRouteListHTML(facturasParaImprimir, selectedRoute?.nombre, repartidor?.nombreCompleto);
        allPrintContent += `<div style="padding: 20px;">${routeListHtml}</div><div style="page-break-after: always;"></div>`;
        
        // C. Facturas Individuales (Cliente)
        const printPromises = facturasParaImprimir.map(async (fac) => {
            const client = clientes.find(c => c.id === fac.clienteId) || {};
            const zona = zonas.find(z => z.id === fac.zonaId) || { nombre: 'General' };
            return generateInvoiceHtmlContent(fac, client, zona.nombre, config);
        });
        
        const invoicesHtmls = await Promise.all(printPromises);
        invoicesHtmls.forEach(html => {
            allPrintContent += `<div style="padding: 20px;">${html}</div><div style="page-break-after: always;"></div>`;
        });
        
        printHTML(`<html><body>${allPrintContent}</body></html>`);
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

    if (routesLoading || invoicesLoading || vendorsLoading || clientesLoading || zonasLoading) {
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
                            <RouteCard key={route.id} route={route} onOpenPlanner={() => handleViewRoute(route)} onEdit={() => handleEditInProgress(route)} onCancel={() => handleCancelRoute(route)} allInvoices={enrichedInvoices} readOnly={false} onOpenMap={() => handleOpenMap(route)} />
                        ))}
                        {enCurso.length === 0 && <EmptyState message="No hay camiones en la calle ahora mismo." />}
                    </div>
                )}

                {activeTab === 'rendicion' && <TabContentRendicion routes={rendicion} allInvoices={enrichedInvoices} />}
                
                {activeTab === 'anuladas' && (
                    <div className="space-y-4">
                        <TabContentRendicion routes={archivadas} allInvoices={enrichedInvoices} />
                        {archivadas.length === 0 && <EmptyState message="No hay historial de rutas rendidas." />}
                    </div>
                )}
            </div>

            {isPlannerOpen && selectedRoute && (
                <PlannerView 
                    route={selectedRoute} onClose={() => { setIsPlannerOpen(false); setSelectedRoute(null); }} 
                    allPendingInvoices={pendingInvoices} repartidores={repartidoresOnly} zonas={zonas} vendors={allVendors}
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

const RouteCard = ({ route, onOpenPlanner, allInvoices, readOnly, onEdit, onCancel, onOpenMap }) => {
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
                <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-dashed border-gray-100">
                    <button onClick={onOpenPlanner} title="Monitorizar" className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:scale-110 transition-all shadow-sm border border-blue-100"><EyeIcon className="w-5 h-5"/></button>
                    <button onClick={onEdit} title="Editar Ruta" className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center hover:bg-yellow-100 hover:scale-110 transition-all shadow-sm border border-yellow-100"><EditIcon className="w-5 h-5"/></button>
                    <button onClick={onCancel} title="Anular y Eliminar" className="w-10 h-10 rounded-full bg-white text-gray-300 flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all border border-gray-100"><TrashIcon className="w-5 h-5"/></button>
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

const TabContentRendicion = ({ routes, allInvoices }) => {
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
                                <div className="text-right hidden md:block"><span className="text-xs font-bold text-gray-400 uppercase block mb-0.5">{isArchived ? 'Rendido' : 'Recaudado (E+T+QR+P)'}</span><span className="text-xl font-bold text-gray-900">{formatCurrency(totals.efectivo + totals.transferencia + totals.qr + totals.point)}</span></div>
                                <button className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-gray-200' : ''}`}><ChevronDownIcon className="w-5 h-5 text-gray-600"/></button>
                            </div>
                        </div>
                        {isExpanded && (
                            <div className="bg-gray-50/50 border-t border-gray-100 p-6">
                                <div className="flex justify-end gap-4">
                                    <button onClick={() => printHTML(generateSettlementReportHTML(route, routeInvoices))} className="py-3 px-6 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 flex items-center gap-2"><PrinterIcon className="w-5 h-5 text-gray-500"/> {isArchived ? 'Reimprimir Reporte' : 'Imprimir Reporte'}</button>
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