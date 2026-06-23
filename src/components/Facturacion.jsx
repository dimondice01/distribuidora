import React, { useState, useEffect, useMemo, useRef } from 'react';
// Importamos 'app' además de 'db'
import { db, app, auth } from '../firebase.js'; 
import { collection, onSnapshot, orderBy, query, getDocs, doc, runTransaction, Timestamp, updateDoc, increment, addDoc, deleteDoc, where } from 'firebase/firestore';
import { toast } from 'react-toastify';
import Button from './Button'; 
import { useFirestore } from '../hooks/useFirestore';
import { useShift } from '../contexts/ShiftContext';
import { useTenant } from '../contexts/TenantContext';

// Importamos las funciones de la Nube
import { getFunctions, httpsCallable } from 'firebase/functions'; 

// Inicializamos Cloud Functions
const functions = getFunctions(app, 'southamerica-west1');
const emitirFacturaCloud = httpsCallable(functions, 'emitirFacturasReparto');

// --- ICONOGRAFÍA PREMIUM (Stroke 1.5, Rounded) ---
const Icono = ({ path, d2, className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
  </svg>
);

const PlusIcon = () => <Icono path="M12 4.5v15m7.5-7.5h-15" />;
const PrintIcon = () => <Icono path="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />;
const DollarSignIcon = () => <Icono path="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-6 h-6"/>;
const BarChartIcon = () => <Icono path="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" className="w-6 h-6"/>;
const TrashIcon = () => <Icono path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456-1.278A11.862 11.862 0 0020.62 6m-14.456.374a11.862 11.862 0 00-.87 5.143" />;
const BarcodeIcon = (props) => <Icono path="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" d2="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />;
const XIcon = () => <Icono path="M6 18L18 6M6 6l12 12" />;
const SearchIcon = () => <Icono path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />;
const CheckIcon = () => <Icono path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
const CardIcon = () => <Icono path="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h6m-6 2.25h6M12 9.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m-3 3.375l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75m.75-.75l.75.75M4.5 19.5h15c.621 0 1.125-.504 1.125-1.125V8.25c0-.621-.504-1.125-1.125-1.125h-15c-.621 0-1.125.504-1.125 1.125v10.125c0 .621.504 1.125 1.125 1.125z" />;

const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

// Función helper para calcular costo
const calculateTotalCostoFromItems = (items) => (items || []).reduce((total, item) => total + ((item.costo || 0) * (item.quantity || 0)), 0);

// Función helper para calcular comisión
const calculateTotalComisionFromItems = (items = []) => {
    return items.reduce((total, item) => {
        return total + (Number(item.comision) || 0); 
    }, 0);
};

// --- CORRECCIÓN CRÍTICA DE MÉTRICAS ---
const calculateTotalNetProfit = (venta) => {
    const totalVenta = Number(venta.totalVenta) || 0;
    
    const totalCosto = (venta.totalCosto !== undefined && venta.totalCosto !== null) 
        ? Number(venta.totalCosto) 
        : calculateTotalCostoFromItems(venta.items);
        
    const totalComision = (venta.totalComision !== undefined && venta.totalComision !== null)
        ? Number(venta.totalComision)
        : calculateTotalComisionFromItems(venta.items);

    return totalVenta - totalCosto - totalComision;
};

// --- HELPERS DE IMPRESIÓN ---
const printHTML = (htmlContent) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 1500);
    } else {
        toast.warn("El navegador bloqueó la impresión. Deshabilite el bloqueador de pop-ups.");
    }
};

const formatAfipDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr || '';
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
};

const getAfipQrUrl = (venta, config) => {
    if (!venta.afipCAE || !config) return null;
    const cuitEmisor = parseInt((config.cuit || '').replace(/-/g, '') || 0);
    const ptoVta = parseInt(config.ptoVta || 1);
    let tipoCmp = 11; // C por defecto
    if (venta.afipLetra === 'A') tipoCmp = 1;
    if (venta.afipLetra === 'B') tipoCmp = 6;
    const fechaObj = venta.fecha instanceof Date ? venta.fecha : (venta.fecha?.toDate ? venta.fecha.toDate() : new Date());
    const datosQr = {
        ver: 1,
        fecha: fechaObj.toISOString().split('T')[0],
        cuit: cuitEmisor,
        ptoVta,
        tipoCmp,
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
        const base64Data = btoa(JSON.stringify(datosQr));
        const urlAfip = `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(urlAfip)}`;
    } catch (e) {
        return null;
    }
};

// --- GENERADOR DE FACTURA (LAYOUT AFIP ESTÁNDAR) ---
const printInvoicePDF = (venta, clientDetails, zonaNombre) => {
    const config = venta.companyInfo || {};
    const fechaImpresion = venta.fecha instanceof Date ? venta.fecha : (venta.fecha?.toDate ? venta.fecha.toDate() : new Date());

    const tieneCAE = !!venta.afipCAE;
    const letra = tieneCAE ? (venta.afipLetra || 'C') : 'X';
    const tituloComprobante = tieneCAE ? 'FACTURA' : 'PRESUPUESTO';
    const codComprobante = tieneCAE ? (letra === 'A' ? 'COD. 001' : letra === 'B' ? 'COD. 006' : 'COD. 011') : 'COD. 000';
    const ptoVtaStr = String(config.ptoVta || '00001').padStart(5, '0');
    const numCompStr = String(venta.afipNumeroComprobante || venta.id?.substring(0, 8) || '0').padStart(8, '0');

    const qrUrl = getAfipQrUrl(venta, config);
    const condIvaTexto = venta.clienteCondicionIVA === 'RI' ? 'Resp. Inscripto' : venta.clienteCondicionIVA === 'MT' ? 'Monotributo' : 'Cons. Final';
    const vtoCaeFormateado = formatAfipDate(venta.afipFechaVtoCAE);
    const isRI = config.taxCondition === 'RI' || config.taxCondition === 'RESPONSABLE_INSCRIPTO';

    const itemsHtml = (venta.items || []).map(item => `
        <tr style="border-bottom: 1px solid #ccc;">
            <td style="padding: 4px 5px; font-size: 10px;">${item.nombre}</td>
            <td style="padding: 4px 5px; text-align: center; font-size: 10px;">${item.quantity}</td>
            <td style="padding: 4px 5px; text-align: right; font-size: 10px;">${formatCurrency(item.precio)}</td>
            <td style="padding: 4px 5px; text-align: right; font-size: 10px; font-weight: bold;">${formatCurrency(item.quantity * item.precio)}</td>
        </tr>
    `).join('');

    const bloquePie = tieneCAE ? `
        <div style="display: flex; gap: 10px; align-items: center;">
            <div><img src="${qrUrl}" alt="QR AFIP" style="width: 80px; height: 80px; display: block; border: 1px solid #000;"></div>
            <div style="font-size: 10px; font-weight: bold; line-height: 1.4;">
                <span style="font-size: 12px; font-style: italic;">Comprobante autorizado por AFIP</span><br>
                CAE: ${venta.afipCAE}<br>
                Vto. CAE: ${vtoCaeFormateado}
            </div>
        </div>
    ` : `
        <div style="border: 1px dashed #999; padding: 5px; text-align: center; background: #eee;">
            <strong style="font-size: 10px;">DOCUMENTO NO VÁLIDO COMO FACTURA</strong>
        </div>
    `;

    const invoiceHtml = `
    <div style="font-family: 'Arial Narrow', Arial, sans-serif; max-width: 760px; margin: auto; border: 1px solid #000; background: #fff; color: #000; position: relative;">

        <div style="border-bottom: 1px solid #000; height: 120px; position: relative; overflow: hidden;">

            <div style="position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 60px; height: 60px; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; background: #fff; text-align: center; display: flex; flex-direction: column; justify-content: center; z-index: 1;">
                <div style="font-size: 32px; font-weight: bold; line-height: 1;">${letra}</div>
                <div style="font-size: 9px; margin-top: 2px;">${codComprobante}</div>
            </div>
            <div style="position: absolute; left: 50%; top: 60px; bottom: 0; border-left: 1px solid #000;"></div>

            <div style="width: 50%; float: left; padding: 10px; box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    ${config.logo ? `<img src="${config.logo}" alt="Logo" style="max-height: 50px; max-width: 180px; object-fit: contain; object-position: left;">` : `
                        <div style="width: 35px; height: 35px; background-color: #0f172a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fbbf24; font-weight: 900; font-size: 20px; flex-shrink: 0;">
                            ${(config.nombreFantasia || config.name || 'D')[0].toUpperCase()}
                        </div>
                        <div style="font-size: 18px; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -1px;">
                            ${config.nombreFantasia || config.name || ''}
                        </div>
                    `}
                </div>
                <p style="margin: 0; font-size: 9px; line-height: 1.4;">
                    <strong>${config.razonSocial || config.nombreFantasia || config.name || ''}</strong><br>
                    <strong>Domicilio:</strong> ${config.domicilioFiscal || ''}<br>
                    <strong>Condición IVA:</strong> ${isRI ? 'Responsable Inscripto' : 'Monotributo'}
                </p>
            </div>

            <div style="width: 50%; float: right; padding: 10px 10px 10px 40px; box-sizing: border-box;">
                <h2 style="margin: 0 0 5px 0; font-size: 16px;">${tituloComprobante}</h2>
                <p style="margin: 0; font-size: 10px; line-height: 1.5;">
                    <strong>Punto de Venta: ${ptoVtaStr}</strong> &nbsp; <strong>Comp. Nro: ${numCompStr}</strong><br>
                    <strong>Fecha de Emisión:</strong> ${fechaImpresion.toLocaleDateString('es-AR')}<br>
                    <strong>CUIT:</strong> ${config.cuit || ''}
                    ${config.iibb ? `<br><strong>Ing. Brutos:</strong> ${config.iibb}` : ''}
                    ${config.inicioActividades ? `<br><strong>Inicio de Actividades:</strong> ${config.inicioActividades}` : ''}
                </p>
            </div>
        </div>

        <div style="border-bottom: 1px solid #000; padding: 4px 10px; font-size: 9px; background: #fff; line-height: 1.4;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 65%; padding-bottom: 2px; vertical-align: top;">
                        <span style="color:#444; font-size:8px; text-transform:uppercase;">Cliente:</span>
                        <strong style="text-transform: uppercase; font-size: 10px;"> ${venta.clienteNombre || clientDetails.nombre || 'CONSUMIDOR FINAL'}</strong>
                    </td>
                    <td style="width: 35%; padding-bottom: 2px; text-align: right; vertical-align: top;">
                        <span style="color:#444; font-size:8px; text-transform:uppercase;">CUIT/DNI:</span>
                        <strong style="font-size: 10px;"> ${venta.clienteCuit || clientDetails.numeroDocumento || clientDetails.cuit || clientDetails.dni || 'S/D'}</strong>
                    </td>
                </tr>
                <tr>
                    <td colspan="2" style="padding-top: 2px; vertical-align: top;">
                        <span style="color:#444; font-size:8px; text-transform:uppercase;">Domicilio:</span>
                        <span style="font-size: 9px;"> ${clientDetails.direccion || 'N/A'} (${zonaNombre})</span>
                        &nbsp;&nbsp;<span style="color:#ccc">|</span>&nbsp;&nbsp;
                        <span style="color:#444; font-size:8px; text-transform:uppercase;">Cond. IVA:</span>
                        <span style="font-size: 9px;"> ${condIvaTexto}</span>
                    </td>
                </tr>
            </table>
        </div>

        <div style="min-height: 200px; padding-top: 5px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead style="border-bottom: 1px solid #000; border-top: 1px solid #000; background: #eee;">
                    <tr>
                        <th style="padding: 4px 5px; text-align: left;">DESCRIPCIÓN</th>
                        <th style="padding: 4px 5px; text-align: center; width: 40px;">CANT.</th>
                        <th style="padding: 4px 5px; text-align: right; width: 80px;">P. UNIT.</th>
                        <th style="padding: 4px 5px; text-align: right; width: 80px;">IMPORTE</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
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

    printHTML(`<html><head><title>${tituloComprobante} ${ptoVtaStr}-${numCompStr}</title><style>body { margin: 20px; } @media print { body { margin: 0; } }</style></head><body>${invoiceHtml}</body></html>`);
};

const CollectSaleModal = ({ total, onConfirm, onClose }) => {
    const [pagoEfectivo, setPagoEfectivo] = useState('');
    const [pagoTransferencia, setPagoTransferencia] = useState('');
    const [pagoTarjeta, setPagoTarjeta] = useState('');
    const [nroCupon, setNroCupon] = useState('');
    const [error, setError] = useState('');
    
    const totalPagado = (parseFloat(pagoEfectivo) || 0) + (parseFloat(pagoTransferencia) || 0) + (parseFloat(pagoTarjeta) || 0);
    const saldoPendiente = total - totalPagado;

    const handleConfirm = () => { 
        if (totalPagado > total + 0.01) { 
            setError('El pago no puede superar el total.'); return; 
        }
        // Validación de tarjeta
        if ((parseFloat(pagoTarjeta) || 0) > 0 && !nroCupon.trim()) {
            setError('Debe ingresar el Nro. de Cupón para pagos con tarjeta.');
            return;
        }
        
        onConfirm({ 
            pagoEfectivo: parseFloat(pagoEfectivo) || 0, 
            pagoTransferencia: parseFloat(pagoTransferencia) || 0,
            pagoTarjeta: parseFloat(pagoTarjeta) || 0,
            nroCupon: nroCupon.trim()
        }); 
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl border border-slate-100 transform transition-all scale-100">
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <CheckIcon className="text-green-500 w-8 h-8" /> Finalizar y Cobrar
                </h3>
                <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
                    <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Total a Pagar</p>
                    <p className="text-3xl font-extrabold text-slate-900">{formatCurrency(total)}</p>
                </div>
                <div className="space-y-4">
                    {/* EFECTIVO */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Efectivo</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                            <input type="number" step="0.01" value={pagoEfectivo} onChange={(e) => { setPagoEfectivo(e.target.value); setError(''); }} className="w-full pl-7 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-green-500 outline-none" placeholder="0.00" />
                        </div>
                    </div>
                    {/* TRANSFERENCIA */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Transferencia</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                            <input type="number" step="0.01" value={pagoTransferencia} onChange={(e) => { setPagoTransferencia(e.target.value); setError(''); }} className="w-full pl-7 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
                        </div>
                    </div>
                    {/* TARJETA */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-2">
                           <CardIcon className="w-4 h-4"/> Tarjeta (Crédito/Débito)
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                            <input type="number" step="0.01" value={pagoTarjeta} onChange={(e) => { setPagoTarjeta(e.target.value); setError(''); }} className="w-full pl-7 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="0.00" />
                        </div>
                        {/* CAMPO CONDICIONAL CUPÓN */}
                        {(parseFloat(pagoTarjeta) || 0) > 0 && (
                            <div className="mt-2 animate-fade-in">
                                <label className="block text-[10px] font-bold text-purple-600 uppercase mb-1">Nro. de Cupón / Operación *</label>
                                <input type="text" value={nroCupon} onChange={(e) => setNroCupon(e.target.value)} className="w-full px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm font-medium text-purple-800 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej: 123456" />
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600">Saldo Pendiente (Deuda):</span>
                        <span className={`text-lg font-bold ${saldoPendiente > 0.01 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(saldoPendiente)}</span>
                    </div>
                </div>
                {error && <p className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded-lg font-medium">{error}</p>}
                <div className="flex justify-end pt-8 space-x-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
                    <button type="button" onClick={handleConfirm} className="px-6 py-2.5 text-sm font-bold text-white bg-green-600 rounded-xl shadow-lg shadow-green-200 hover:bg-green-700 hover:scale-105 transition-all">Confirmar Pago</button>
                </div>
            </div>
        </div>
    );
};

function Facturacion() {
    const { activeShift } = useShift();
    const { companyConfig, logo: globalLogo } = useTenant();
    const [ventas, setVentas] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
    const [productos, setProductos] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [categorias, setCategorias] = useState([]); 
    const [clientes, setClientes] = useState([]);
    const [zonas, setZonas] = useState([]);
    const [priceLists, setPriceLists] = useState([]); 
    
    // --- ESTADO PRINCIPAL DE NUEVA FACTURA ---
    const [newInvoice, setNewInvoice] = useState({ 
        // vendedorId eliminado, se usará auth.currentUser
        clienteId: '', 
        items: [], 
        observaciones: '', 
        listaPreciosId: '',
        facturaAfip: false 
    });
    
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // Para búsqueda de ventas
    const [clientSearchTerm, setClientSearchTerm] = useState(''); // Para búsqueda de clientes en modal
    const [processingWebOrderId, setProcessingWebOrderId] = useState(null);
    const [matchedClient, setMatchedClient] = useState(null);
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmClientChange, setConfirmClientChange] = useState(null); // null | clientId string
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

    // Modal selección producto
    const [productForQuantity, setProductForQuantity] = useState(null);
    const [quantityToAdd, setQuantityToAdd] = useState(1);
    const [productSearch, setProductSearch] = useState('');
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [filterDate, setFilterDate] = useState(''); 

    const { onTenantSnapshot, addTenantDoc, updateTenantDoc, deleteTenantDoc, tenantId, getTenantCollection, getTenantDoc, db } = useFirestore();

    useEffect(() => {
        if (!tenantId) return;

        // Clientes en tiempo real — necesario para leer CUIT/condición actualizada al facturar
        const unsubClientes = onTenantSnapshot('clientes', (snapshot) => {
            setClientes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.activo !== false));
        });

        // Carga de ventas filtrada por Tenant
        const unsubscribe = onTenantSnapshot('ventas', (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(), 
                fecha: doc.data().fecha.toDate() 
            }));
            
            const cleanDocs = docs.filter(d => {
                if (!d.tipo) return true; 
                return !['cobro', 'cobranza', 'rendicion', 'rendicion_vendedor', 'rendicion_cobranza'].includes(d.tipo);
            });

            setVentas(cleanDocs);
        }, [{ field: 'fecha', direction: 'desc' }]);

        const fetchInitialData = async () => {
            try {
                // Usamos getTenantCollection para filtrar por compañía
                const [productsSnap, vendorsSnap, categoriesSnap, zonasSnap, listsSnap] = await Promise.all([
                    getDocs(getTenantCollection('productos')),
                    getDocs(getTenantCollection('vendedores')),
                    getDocs(getTenantCollection('categorias')),
                    getDocs(getTenantCollection('zonas')),
                    getDocs(getTenantCollection('listas_precios'))
                ]);
                setProductos(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setVendedores(vendorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setCategorias(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setZonas(zonasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setPriceLists(listsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) { 
                console.error("Error data loading:", err);
                setError("Error cargando datos maestros."); 
            }
        };
        fetchInitialData();
        return () => { unsubscribe(); unsubClientes(); };
    }, [tenantId]);
    
    const filteredClients = useMemo(() => {
        if (!clientSearchTerm) return clientes;
        const term = clientSearchTerm.toLowerCase();
        return clientes.filter(c => (c.nombre || c.nombreCompleto || '').toLowerCase().includes(term) || (c.dni || '').includes(term) || (c.cuit || '').includes(term));
    }, [clientes, clientSearchTerm]);

    const metrics = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const paidVentas = ventas.filter(v => v.estado === 'Pagada');
        const salesToday = paidVentas.filter(v => v.fecha >= startOfDay).reduce((sum, v) => sum + (v.totalVenta || 0), 0);
        const salesMonth = paidVentas.filter(v => v.fecha >= startOfMonth).reduce((sum, v) => sum + (v.totalVenta || 0), 0);
        const netProfitMonth = paidVentas.filter(v => v.fecha >= startOfMonth).reduce((sum, v) => sum + (calculateTotalNetProfit(v) || 0), 0);
        return { salesToday, salesMonth, netProfitMonth };
    }, [ventas]);

    const filteredVentas = useMemo(() => {
        setCurrentPage(1);
        return ventas.filter(venta => {
            const searchTermLower = searchTerm.toLowerCase();
            const clienteNombre = venta.clienteNombre || (clientes.find(c => c.id === venta.clienteId)?.nombre);
            const vendedorNombre = venta.vendedorNombre || (vendedores.find(v => v.id === venta.vendedorId)?.nombreCompleto);
            const matchesSearch = searchTerm === '' || (clienteNombre && clienteNombre.toLowerCase().includes(searchTermLower)) || (vendedorNombre && vendedorNombre.toLowerCase().includes(searchTermLower));
            const matchesStatus = filterStatus === 'Todos' ? true : venta.estado === filterStatus;
            let matchesDate = true;
            if (filterDate) {
                const startOfDay = new Date(filterDate); startOfDay.setUTCHours(0, 0, 0, 0);
                const endOfDay = new Date(filterDate); endOfDay.setUTCHours(23, 59, 59, 999);
                matchesDate = venta.fecha >= startOfDay && venta.fecha <= endOfDay;
            }
            return matchesSearch && matchesStatus && matchesDate;
        });
    }, [ventas, searchTerm, filterStatus, filterDate, clientes, vendedores]);
    
    const paginatedVentas = useMemo(() => filteredVentas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredVentas, currentPage, itemsPerPage]);
    const totalPages = Math.ceil(filteredVentas.length / itemsPerPage);
    const filteredProducts = useMemo(() => productos.filter(p => p.nombre.toLowerCase().includes(productSearch.toLowerCase())), [productos, productSearch]);


    // --- LÓGICA DE NEGOCIO ---
    const handleAddItem = (product, quantity) => {
        setError('');
        const numQuantity = parseInt(quantity, 10);
        if (isNaN(numQuantity) || numQuantity <= 0) return;
        
        let finalPrice = product.precio;
        if (newInvoice.listaPreciosId && product.preciosExtra) {
             if (product.preciosExtra[newInvoice.listaPreciosId]) {
                 finalPrice = Number(product.preciosExtra[newInvoice.listaPreciosId]);
             } else {
                 const matchingKey = Object.keys(product.preciosExtra).find(key => key.toLowerCase() === newInvoice.listaPreciosId.toLowerCase());
                 if (matchingKey) finalPrice = Number(product.preciosExtra[matchingKey]);
             }
        }

        const category = categorias.find(cat => cat.id === product.categoriaId);
        const porcentajeComision = product.comisionEspecifica ?? (category?.comisionGeneral ?? 0); 
        const montoComisionUnitario = (finalPrice * (porcentajeComision / 100));
        const totalComisionLinea = montoComisionUnitario * numQuantity;

        const existingItem = newInvoice.items.find(item => item.productId === product.id);
        
        if (existingItem) {
            const newQty = existingItem.quantity + numQuantity;
            const newTotalComision = montoComisionUnitario * newQty;
            
            setNewInvoice(prev => ({ ...prev, items: prev.items.map(item => item.productId === product.id ? { 
                ...item, 
                quantity: newQty,
                comision: newTotalComision 
            } : item) }));
        } else {
            setNewInvoice(prev => ({ ...prev, items: [...prev.items, { 
                productId: product.id, 
                nombre: product.nombre, 
                precio: finalPrice, 
                costo: product.costo || 0, 
                quantity: numQuantity,
                comision: totalComisionLinea, 
                _metaComisionPorcentaje: porcentajeComision 
            }] }));
        }
    };

    const handleProcessWebOrder = (webVenta) => {
        resetForm();
        setProcessingWebOrderId(webVenta.id);
        
        // Intentar matchear cliente por nombre
        const bestMatch = clientes.find(c => 
            (c.nombre && c.nombre.toLowerCase() === (webVenta.clienteNombre || '').toLowerCase()) ||
            (c.telefono && webVenta.items[0]?.telefono === c.telefono) // Opción futura
        );
        
        setMatchedClient(bestMatch || null);

        setNewInvoice({
            clienteId: bestMatch ? bestMatch.id : '',
            clienteNombre: webVenta.clienteNombre || 'Cliente Web',
            items: webVenta.items.map(item => ({
                productId: item.id,
                nombre: item.nombre,
                precio: item.precio, // RESPETAMOS PRECIO CONGELADO
                costo: productos.find(p => p.id === item.id)?.costo || 0,
                quantity: item.quantity,
                comision: 0 // Se recalculará o dejará en 0 según lógica de web
            })),
            observaciones: `PEDIDO WEB #${webVenta.id.substring(0,6)}. ${webVenta.observaciones || ''}`,
            listaPreciosId: webVenta.listaPrecios || '',
            facturaAfip: bestMatch ? bestMatch.isArca : false
        });
        
        setIsModalOpen(true);
        toast.info("Resumen de pedido web cargado. Vincula el cliente para finalizar.");
    };
    
    const handleRemoveItemFromCart = (productId) => {
        setNewInvoice(prev => ({ ...prev, items: prev.items.filter(item => item.productId !== productId) }));
    };
    
    const handleCartQuantityChange = (productId, newQuantity) => {
        const numQuantity = parseInt(newQuantity, 10);
        if (isNaN(numQuantity) || numQuantity < 0) return;
        
        if (numQuantity === 0) {
            handleRemoveItemFromCart(productId);
        } else {
             setNewInvoice(prev => ({ 
                 ...prev, 
                 items: prev.items.map(item => {
                     if (item.productId === productId) {
                         const unitCommission = item.comision / item.quantity; 
                         const newComm = unitCommission * numQuantity;
                         return { ...item, quantity: numQuantity, comision: newComm };
                     }
                     return item;
                 }) 
             }));
        }
    };

    const calculateTotal = () => newInvoice.items.reduce((total, item) => total + ((item.precio || 0) * (item.quantity || 0)), 0);
    const resetForm = () => { setNewInvoice({ clienteId: '', items: [], observaciones: '', listaPreciosId: '', facturaAfip: false }); setError(''); setProductSearch(''); setClientSearchTerm(''); setClientDropdownOpen(false); };
    const handleOpenModalForCreate = () => { resetForm(); setIsModalOpen(true); };

    const _applyClientChange = (clientId) => {
        if (!clientId) {
            setNewInvoice(prev => ({ ...prev, clienteId: '', clienteNombre: 'Consumidor Final', listaPreciosId: '', facturaAfip: false, items: [] }));
            setClientSearchTerm('');
            setClientDropdownOpen(false);
            return;
        }
        const client = clientes.find(c => c.id === clientId);
        if (!client) return;
        const listaAsignada = client.listaPreciosAsignada || '';
        setNewInvoice(prev => ({ ...prev, clienteId: client.id, clienteNombre: client.nombre || client.nombreCompleto || 'Cliente Sin Nombre', listaPreciosId: listaAsignada, facturaAfip: client.requiereFacturaAfip ?? client.isArca ?? false, items: [] }));
        if (listaAsignada) toast.info(`Lista de precios "${listaAsignada}" aplicada.`);
        setClientSearchTerm('');
        setClientDropdownOpen(false);
    };

    const handleClientChange = (clientId) => {
        if (newInvoice.items.length > 0) {
            setConfirmClientChange(clientId);
            return;
        }
        _applyClientChange(clientId);
    };

    const handleUpdateEstado = async (ventaId, nuevoEstado) => {
        try {
            await updateTenantDoc('ventas', ventaId, { estado: nuevoEstado });
            toast.success(`Estado → "${nuevoEstado}"`);
        } catch (err) {
            toast.error('Error al actualizar estado');
        }
    };

    // --- GUARDADO Y FACTURACIÓN ---
    const handleSaveInvoice = async (paymentData = null) => {
        if (newInvoice.items.length === 0) { setError('Carrito vacío.'); return; }
        
        // ✅ CORRECCIÓN CRÍTICA: Validación AFIP Estricta
        const clienteSeleccionado = clientes.find(c => c.id === newInvoice.clienteId);
        const cuitCliente = clienteSeleccionado?.numeroDocumento || clienteSeleccionado?.cuit || '';

        if (newInvoice.facturaAfip) {
            if (newInvoice.clienteId && (!cuitCliente || cuitCliente.length < 7)) {
                toast.error("ERROR CRÍTICO: El cliente seleccionado NO tiene CUIT/DNI cargado. No se puede emitir factura AFIP.");
                return;
            }
        }

        setIsSaving(true);
    
        // ✅ ASIGNACIÓN AUTOMÁTICA DE VENDEDOR (Usuario Logueado)
        const currentUser = auth.currentUser;
        const currentVendor = vendedores.find(v => v.email === currentUser?.email) || { id: 'admin', nombreCompleto: 'Administrador' };
        
        const totalVenta = calculateTotal();
        
        let finalSaleData = {
            ...newInvoice,
            tipo: 'venta', 
            vendedorId: currentVendor.id, // Asignación automática
            vendedorNombre: currentVendor.nombreCompleto, // Asignación automática
            shiftId: activeShift?.id || 'manual', // Vínculo crítico de auditoría
            fecha: Timestamp.now(),
            totalVenta,
            estado: 'Adeuda', 
            totalCosto: calculateTotalCostoFromItems(newInvoice.items),
            totalComision: calculateTotalComisionFromItems(newInvoice.items), 
            pagoEfectivo: 0,
            pagoTransferencia: 0,
            pagoTarjeta: 0,
            nroCupon: '',
            saldoPendiente: totalVenta,
            descuentoAplicado: 0, 
            totalVentaBruto: totalVenta,
            totalDescuento: 0,
            observaciones: newInvoice.observaciones || '', 
            paymentMethod: 'cuenta_corriente'
        };
        
        finalSaleData.totalNetProfit = finalSaleData.totalVenta - finalSaleData.totalCosto - finalSaleData.totalComision;
    
        finalSaleData.clienteNombre = clienteSeleccionado?.nombre || clienteSeleccionado?.nombreCompleto || 'Consumidor Final';
        finalSaleData.clienteId = clienteSeleccionado?.id || '';
        finalSaleData.clienteZonaId = clienteSeleccionado?.zonaId || '';
        
        // Datos Fiscales del Cliente para la Cloud Function
        finalSaleData.clienteCuit = cuitCliente;
        finalSaleData.clienteCondicionIVA = clienteSeleccionado?.condicionIva || 'CF';
        finalSaleData.clienteTipoDoc = (finalSaleData.clienteCuit.length === 11) ? 'CUIT' : 'DNI';
    
        if (paymentData) {
            const { pagoEfectivo, pagoTransferencia, pagoTarjeta, nroCupon } = paymentData;
            const totalPagado = pagoEfectivo + pagoTransferencia + pagoTarjeta;
            
            finalSaleData.pagoEfectivo = pagoEfectivo;
            finalSaleData.pagoTransferencia = pagoTransferencia;
            finalSaleData.pagoTarjeta = pagoTarjeta;
            finalSaleData.nroCupon = nroCupon || ''; 
            
            finalSaleData.saldoPendiente = totalVenta - totalPagado;
            finalSaleData.estado = finalSaleData.saldoPendiente > 0.01 
                ? (processingWebOrderId ? 'Pendiente de Entrega' : 'Adeuda') 
                : 'Pagada';
            finalSaleData.paymentMethod = finalSaleData.saldoPendiente <= 0.01 ? 'contado' : 'cuenta_corriente'; 
        } else {
             // Si no hay datos de pago, y es web, va a pendiente de entrega
             if (processingWebOrderId) {
                 finalSaleData.estado = 'Pendiente de Entrega';
             }
        }
    
        try {
            // 1. Guardar en Firestore primero
            const newSaleRef = doc(getTenantCollection('ventas'));
            await runTransaction(db, async (transaction) => {
                const productReads = finalSaleData.items.map(item => {
                    const productRef = getTenantDoc('productos', item.productId);
                    return transaction.get(productRef);
                });
                const productDocs = await Promise.all(productReads);
                for (let i = 0; i < productDocs.length; i++) {
                    const productDoc = productDocs[i];
                    const item = finalSaleData.items[i];
                    if (!productDoc.exists() || productDoc.data().stock < item.quantity) {
                        const currentStock = productDoc.exists() ? productDoc.data().stock : 0;
                        throw new Error(`Stock insuficiente: ${item.nombre} (Disp: ${currentStock}).`);
                    }
                }
                finalSaleData.items.forEach(item => {
                    const productRef = getTenantDoc('productos', item.productId);
                    transaction.update(productRef, { stock: increment(-item.quantity) });
                });

                // Si venía de un pedido web, borramos el original o lo marcamos
                if (processingWebOrderId) {
                     transaction.delete(getTenantDoc('pedidos_temporales', processingWebOrderId));
                }

                transaction.set(newSaleRef, { ...finalSaleData, companyId: tenantId });
            });

            // 2. Si requiere factura AFIP, llamar a la Cloud Function
            let saleForPDF = { ...finalSaleData, id: newSaleRef.id };
            
            if (finalSaleData.facturaAfip) {
                toast.info("Conectando con AFIP...");
                try {
                    const result = await emitirFacturaCloud({ ventas: [{ ...finalSaleData, id: newSaleRef.id }] });
                    const resultadoAfip = result.data[0];
                    
                    if (resultadoAfip.status === 'OK') {
                        toast.success("¡Factura autorizada por AFIP!");
                        saleForPDF = { 
                            ...saleForPDF, 
                            afipCAE: resultadoAfip.detalle.cae,
                            afipFechaVtoCAE: resultadoAfip.detalle.vtoCAE,
                            afipNumeroComprobante: resultadoAfip.detalle.numero,
                            afipLetra: resultadoAfip.detalle.tipoLetra
                        };
                    } else {
                        toast.error(`Error AFIP: ${resultadoAfip.detalle}`);
                        await updateTenantDoc('ventas', newSaleRef.id, { afipPendiente: true, afipError: String(resultadoAfip.detalle) });
                    }
                } catch (afipError) {
                    console.error(afipError);
                    toast.error("Error de comunicación con AFIP. La venta se guardó como pendiente.");
                    await updateTenantDoc('ventas', newSaleRef.id, { afipPendiente: true, afipError: afipError.message });
                }
            } else {
                toast.success("Venta guardada correctamente.");
            }
            
            // 3. Imprimir PDF
            const clientDetails = clientes.find(c => c.id === finalSaleData.clienteId) || {};
            const zonaNombre = getZonaNombre(clientDetails.zonaId);
            
            // Inyectamos la info de empresa para el PDF (Snapshot) con MERGE DEFENSIVO
            const saleWithInfo = {
                ...saleForPDF,
                companyInfo: {
                    logo: globalLogo || companyConfig?.logo,
                    name: companyConfig?.name,
                    nombreFantasia: companyConfig?.nombreFantasia || companyConfig?.name,
                    razonSocial: companyConfig?.razonSocial,
                    domicilioFiscal: companyConfig?.domicilioFiscal,
                    taxCondition: companyConfig?.taxCondition,
                    cuit: companyConfig?.cuit,
                    iibb: companyConfig?.iibb,
                    inicioActividades: companyConfig?.inicioActividades,
                    ptoVta: companyConfig?.ptoVta,
                }
            };
            
            printInvoicePDF(saleWithInfo, clientDetails, zonaNombre);
    
            setIsModalOpen(false);
            setIsCollectModalOpen(false);
            resetForm();
        } catch (err) {
            console.error(err);
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteInvoice = async (venta) => {
        if (!venta || !venta.id) return;
        if (!window.confirm(`¿Eliminar factura #${venta.numeroFactura || venta.id.substring(0,8)}? Se repondrá el stock.`)) return;

        try {
            await runTransaction(db, async (transaction) => {
                for (const item of (venta.items || []).filter(i => i.productId)) { 
                    const productRef = getTenantDoc('productos', item.productId);
                    transaction.update(productRef, { stock: increment(item.quantity) });
                }
                transaction.delete(getTenantDoc('ventas', venta.id));
            });
            toast.success('Factura anulada y stock repuesto.');
        } catch (err) { 
            console.error(err);
            toast.error(`Error al eliminar: ${err.message}`); 
        }
    };

    const handleDeleteAllInvoices = async () => {
        if (isDeleting) return;
        if (!window.confirm("⚠️ PELIGRO: ¿Estás seguro de BORRAR TODAS las facturas? Esto restaurará el stock de cada venta y reiniciará las métricas. Esta acción no se puede deshacer.")) return;

        setIsDeleting(true);
        try {
            // ✅ CORRECCIÓN CRITICA: Filtrado por Tenant
            const salesSnapshot = await getDocs(getTenantCollection('ventas'));
            const sales = salesSnapshot.docs.map(d => ({id: d.id, ...d.data()}));
            
            if (sales.length === 0) {
                toast.info("No hay facturas para borrar.");
                return;
            }

            let count = 0;
            toast.info("Iniciando eliminación masiva...");

            for (const sale of sales) {
                await runTransaction(db, async (transaction) => {
                    // Reponer stock
                    for (const item of (sale.items || []).filter(i => i.productId)) { 
                        const productRef = getTenantDoc('productos', item.productId);
                        transaction.update(productRef, { stock: increment(item.quantity) });
                    }
                    // Borrar venta
                    transaction.delete(getTenantDoc('ventas', sale.id));
                });
                count++;
            }
            toast.success(`Se eliminaron ${count} facturas y se restauró el stock.`);
        } catch (error) {
            console.error("Error borrando todo:", error);
            toast.error("Hubo un error en la eliminación masiva.");
        } finally {
            setIsDeleting(false);
        }
    };
    
    const getZonaNombre = (zonaId) => zonas.find(z => z.id === zonaId)?.nombre || 'N/A';
    
    const printVentaFromList = (venta) => {
        const clientDetails = clientes.find(c => c.id === venta.clienteId) || {};
        const zonaNombre = getZonaNombre(venta.clienteZonaId || clientDetails.zonaId);
        const robustClienteNombre = venta.clienteNombre || clientDetails.nombre || clientDetails.nombreCompleto || 'Consumidor Final';
        const robustVendedorNombre = venta.vendedorNombre || vendedores.find(v => v.id === venta.vendedorId)?.nombreCompleto || 'N/A';
        
        // Inyectamos la info de empresa para el PDF (Snapshot) en reimpresión
        const saleToPrint = {
            ...venta,
            clienteNombre: robustClienteNombre,
            vendedorNombre: robustVendedorNombre,
            companyInfo: {
                logo: globalLogo || companyConfig?.logo || venta.companyInfo?.logo,
                name: companyConfig?.name || venta.companyInfo?.name,
                nombreFantasia: companyConfig?.nombreFantasia || companyConfig?.name || venta.companyInfo?.nombreFantasia,
                razonSocial: companyConfig?.razonSocial || venta.companyInfo?.razonSocial,
                domicilioFiscal: companyConfig?.domicilioFiscal || venta.companyInfo?.domicilioFiscal,
                taxCondition: companyConfig?.taxCondition || venta.companyInfo?.taxCondition,
                cuit: companyConfig?.cuit || venta.companyInfo?.cuit,
                iibb: companyConfig?.iibb || venta.companyInfo?.iibb,
                inicioActividades: companyConfig?.inicioActividades || venta.companyInfo?.inicioActividades,
                ptoVta: companyConfig?.ptoVta || venta.companyInfo?.ptoVta,
            }
        };
        printInvoicePDF(saleToPrint, clientDetails, zonaNombre);
    };

    // --- RENDERIZADO UI PREMIUM ---
    return (
        <div className="relative min-h-screen bg-slate-50 p-6 font-sans animate-fade-in">
            {/* OVERLAY DE CAJA CERRADA (Blindaje Enterprise) */}
            {!activeShift && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-100/40 backdrop-blur-md animate-fade-in p-6 text-center">
                    <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-8 border border-slate-200">
                        <DollarSignIcon className="w-12 h-12 text-slate-300" />
                    </div>
                    <h3 className="text-4xl font-black text-slate-800 tracking-tighter mb-4 uppercase">Caja Cerrada</h3>
                    <p className="text-lg font-bold text-slate-500 max-w-sm leading-tight mb-8 uppercase tracking-widest">
                        Debes abrir tu turno desde el Dashboard antes de facturar
                    </p>
                    <div className="flex gap-4">
                       <span className="text-xs font-black text-slate-400 bg-white px-6 py-3 rounded-full border border-slate-200 shadow-sm uppercase">Bloqueo de Seguridad Activo</span>
                    </div>
                </div>
            )}

            <style>{`.animate-fade-in { animation: fadeIn 0.5s ease-out; } @keyframes fadeIn { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                    { title: 'Ventas Hoy', val: metrics.salesToday, icon: DollarSignIcon, color: 'green', sub: 'Cobrado efectivo/transf' },
                    { title: 'Ventas Mes', val: metrics.salesMonth, icon: BarChartIcon, color: 'blue', sub: 'Facturación Bruta' },
                    { title: 'Ganancia Real', val: metrics.netProfitMonth, icon: DollarSignIcon, color: 'indigo', sub: 'Ventas - (Costos + Comisiones)' }
                ].map((m, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{m.title}</p>
                            <p className={`text-2xl font-extrabold text-${m.color}-600 mt-1`}>{formatCurrency(m.val)}</p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">{m.sub}</p>
                        </div>
                        <div className={`p-4 rounded-2xl bg-${m.color}-50 text-${m.color}-500`}>
                            <m.icon />
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800">Historial de Operaciones</h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={handleDeleteAllInvoices} disabled={isDeleting} className="px-3 py-2 bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            <TrashIcon className="w-4 h-4"/> {isDeleting ? 'BORRANDO...' : 'RESET TOTAL'}
                        </button>
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors"><SearchIcon /></span>
                            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none w-40 md:w-60 transition-all"/>
                        </div>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                            <option>Todos</option>
                            <option>Web: Pendiente</option>
                            <option>Pagada</option>
                            <option>Adeuda</option>
                            <option>Pendiente de Entrega</option>
                            <option>Repartiendo</option>
                            <option>Anulada</option>
                        </select>
                        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                        <Button onClick={handleOpenModalForCreate} icon={<PlusIcon />}>
                            Nueva Venta
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full whitespace-nowrap border-separate border-spacing-y-0">
                        <thead className="bg-slate-50">
                            <tr>
                                {['ID', 'Fecha', 'Cliente', 'Vendedor', 'Estado', 'Total', 'Acciones'].map((h, i) => (
                                    <th key={i} className={`px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 ${i===0?'rounded-tl-2xl':''} ${i===6?'rounded-tr-2xl text-right':''}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedVentas.map((venta) => {
                                const clienteNombre = venta.clienteNombre || (clientes.find(c => c.id === venta.clienteId)?.nombre) || 'Unknown';
                                const vendedorNombre = venta.vendedorNombre || (vendedores.find(v => v.id === venta.vendedorId)?.nombreCompleto) || 'Unknown';
                                const statusColor = { 
                                    'Web: Pendiente': 'bg-indigo-600 text-white border-indigo-700 animate-pulse',
                                    'Pagada': 'bg-green-100 text-green-700 border-green-200', 
                                    'Adeuda': 'bg-amber-100 text-amber-700 border-amber-200', 
                                    'Pendiente de Entrega': 'bg-indigo-100 text-indigo-700 border-indigo-200', 
                                    'Repartiendo': 'bg-blue-100 text-blue-700 border-blue-200', 
                                    'Anulada': 'bg-slate-100 text-slate-500 border-slate-200' 
                                }[venta.estado] || 'bg-slate-100 text-slate-600';
                                return (
                                <tr key={venta.id} className="group hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-500">#{venta.numeroFactura || venta.id.substring(0, 6)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-700">{venta.fecha.toLocaleDateString('es-AR')}</td>
                                    <td className="px-6 py-4"><span className="text-sm font-bold text-slate-800 block">{clienteNombre}</span></td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{vendedorNombre}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${statusColor}`}>
                                            {venta.tipo === 'devolucion' ? 'Devolución' : venta.estado}
                                        </span>
                                        {venta.facturaAfip && !venta.afipCAE && (
                                            <span title="Factura guardada sin CAE de AFIP" className="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-black rounded border border-red-200 uppercase cursor-help">Sin CAE ⚠</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{formatCurrency(venta.totalVenta)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                            {venta.estado === 'Web: Pendiente' ? (
                                                <button
                                                    onClick={() => handleProcessWebOrder(venta)}
                                                    className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-1 shadow-md shadow-indigo-600/20"
                                                >
                                                    <PlusIcon className="w-3 h-3"/> PROCESAR
                                                </button>
                                            ) : (
                                                <>
                                                    {(venta.estado === 'Pendiente de Entrega' || venta.estado === 'Repartiendo') && (
                                                        <select
                                                            value={venta.estado}
                                                            onChange={(e) => handleUpdateEstado(venta.id, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                                        >
                                                            <option value="Pendiente de Entrega">Pendiente</option>
                                                            <option value="Repartiendo">Repartiendo</option>
                                                            <option value="Entregada">Entregada</option>
                                                            <option value="Pagada">Pagada</option>
                                                        </select>
                                                    )}
                                                    <button onClick={() => printVentaFromList(venta)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"><PrintIcon/></button>
                                                    <button onClick={() => handleDeleteInvoice(venta)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon/></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex justify-center gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50">Anterior</button>
                        <span className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg">{currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50">Siguiente</button>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
                        
                        <div className="w-full md:w-[60%] flex flex-col h-full border-r border-slate-100">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="text-xl font-extrabold text-slate-800">Nueva Operación</h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 text-slate-400"><XIcon/></button>
                            </div>
                            
                            <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    {/* VENDEDOR AUTOMÁTICO (Usuario Logueado) */}
                                    <div className="col-span-1">
                                         <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Vendedor</label>
                                         <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed">
                                             {auth.currentUser?.email || 'Usuario Actual'}
                                         </div>
                                    </div>
                                    
                                    <div className="col-span-1">
                                         <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cliente</label>
                                         {newInvoice.clienteId ? (
                                             <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl mb-1">
                                                 <span className="flex-1 text-sm font-bold text-indigo-800 truncate">{newInvoice.clienteNombre}</span>
                                                 <button onMouseDown={() => handleClientChange('')} className="text-indigo-300 hover:text-red-500 transition-colors flex-shrink-0"><XIcon /></button>
                                             </div>
                                         ) : (
                                             <div className="relative mb-1">
                                                 <input
                                                     type="text"
                                                     placeholder="Buscar cliente..."
                                                     value={clientSearchTerm}
                                                     onChange={(e) => { setClientSearchTerm(e.target.value); setClientDropdownOpen(true); }}
                                                     onFocus={() => setClientDropdownOpen(true)}
                                                     onBlur={() => setTimeout(() => setClientDropdownOpen(false), 150)}
                                                     className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                                 />
                                                 {clientDropdownOpen && (
                                                     <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                                                         <button onMouseDown={() => handleClientChange('')} className="w-full px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50 border-b border-slate-100 font-medium">— Consumidor Final —</button>
                                                         {filteredClients.map(c => (
                                                             <button key={c.id} onMouseDown={() => handleClientChange(c.id)} className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border-b border-slate-50 last:border-0">
                                                                 {c.nombre || c.nombreCompleto}
                                                             </button>
                                                         ))}
                                                         {filteredClients.length === 0 && <p className="px-3 py-3 text-xs text-slate-400 text-center">Sin resultados</p>}
                                                     </div>
                                                 )}
                                             </div>
                                         )}
                                        {newInvoice.listaPreciosId && <span className="text-[10px] text-amber-600 font-bold mt-1 block">⭐ Lista Aplicada: {newInvoice.listaPreciosId}</span>}

                                        {/* --- CHECKBOX AFIP MEJORADO --- */}
                                        <div className="mt-3 flex items-center gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                                            <input
                                                type="checkbox"
                                                id="chkAfip"
                                                checked={newInvoice.facturaAfip}
                                                onChange={(e) => setNewInvoice({...newInvoice, facturaAfip: e.target.checked})}
                                                className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <label htmlFor="chkAfip" className="text-xs font-bold text-indigo-700 cursor-pointer select-none">
                                                Emitir Factura Electrónica (AFIP)
                                            </label>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <textarea placeholder="Observaciones..." value={newInvoice.observaciones} onChange={(e) => setNewInvoice({...newInvoice, observaciones: e.target.value})} rows="2" className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
                                    </div>

                                    {processingWebOrderId && !newInvoice.clienteId && (
                                        <div className="col-span-2 p-3 bg-amber-50 rounded-xl border border-amber-200 animate-pulse">
                                            <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Bridging (Vinculación)</p>
                                            <p className="text-xs text-amber-700 font-bold">⚠️ Este pedido proviene de la WEB. Selecciona un cliente registrado para vincular su cuenta corriente.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-4 min-h-[250px] flex flex-col border border-slate-100">
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Productos ({newInvoice.items.length})</span>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subtotal</span>
                                    </div>
                                    <div className="flex-grow space-y-3 overflow-y-auto max-h-[300px] pr-2">
                                        {newInvoice.items.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                                                <BarChartIcon className="w-10 h-10 mb-2"/>
                                                <p className="text-sm font-medium">Carrito vacío</p>
                                            </div>
                                        ) : (
                                            newInvoice.items.map((item) => (
                                                <div key={item.productId} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className="text-sm font-bold text-slate-700 truncate">{item.nombre}</p>
                                                        <p className="text-[10px] text-slate-400">Unit: {formatCurrency(item.precio)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <input type="number" value={item.quantity} onChange={(e) => handleCartQuantityChange(item.productId, e.target.value)} className="w-14 text-center py-1 bg-slate-100 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" min="1" />
                                                        <span className="text-sm font-bold text-slate-800 w-20 text-right">{formatCurrency(item.precio * item.quantity)}</span>
                                                        <button onClick={() => handleRemoveItemFromCart(item.productId)} className="text-red-400 hover:text-red-600 transition-colors"><TrashIcon/></button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 bg-white border-t border-slate-100 z-10">
                                <div className="flex justify-between items-end mb-4">
                                    <span className="text-sm font-bold text-slate-500">Total a Pagar</span>
                                    <span className="text-4xl font-extrabold text-slate-900">{formatCurrency(calculateTotal())}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => handleSaveInvoice()} disabled={isSaving} className="py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                                        {isSaving ? 'Procesando...' : 'Guardar (Cta. Cte.)'}
                                    </button>
                                    <button onClick={() => setIsCollectModalOpen(true)} disabled={isSaving} className="py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50">
                                        Cobrar Ahora
                                    </button>
                                </div>
                                {error && <p className="mt-2 text-center text-xs font-bold text-red-500">{error}</p>}
                            </div>
                        </div>

                        <div className="w-full md:w-[40%] bg-slate-50 flex flex-col h-full">
                            <div className="p-4 border-b border-slate-200 bg-white shadow-sm z-10">
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><SearchIcon className="w-4 h-4"/></span>
                                    <input type="text" placeholder="Buscar producto..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                                <div className="grid grid-cols-1 gap-2">
                                    {filteredProducts.map(p => (
                                        <div key={p.id} onClick={() => { setProductForQuantity(p); setQuantityToAdd(1); }} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all flex justify-between items-center group">
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{p.nombre}</p>
                                                <p className="text-[10px] text-slate-400">Stock: {p.stock}</p>
                                            </div>
                                            <span className="text-sm font-extrabold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                                {formatCurrency(
                                                    newInvoice.listaPreciosId && p.preciosExtra?.[newInvoice.listaPreciosId] 
                                                    ? Number(p.preciosExtra[newInvoice.listaPreciosId]) 
                                                    : p.precio
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {productForQuantity && ( 
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"> 
                    <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 transform scale-100 transition-all">
                        <h3 className="text-lg font-bold text-slate-800 text-center mb-1">Agregar Producto</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">{productForQuantity.nombre}</p>
                        
                        <div className="flex justify-center items-center gap-4 mb-6">
                            <button onClick={() => setQuantityToAdd(Math.max(1, quantityToAdd - 1))} className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200">-</button>
                            <input type="number" value={quantityToAdd} onChange={(e) => setQuantityToAdd(Number(e.target.value))} className="w-20 text-center text-3xl font-bold text-indigo-600 border-b-2 border-indigo-100 focus:border-indigo-500 outline-none" autoFocus min="1" />
                            <button onClick={() => setQuantityToAdd(quantityToAdd + 1)} className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200">+</button>
                        </div>
                        
                        <div className="flex gap-3">
                            <button onClick={() => setProductForQuantity(null)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Cancelar</button>
                            <button onClick={() => { handleAddItem(productForQuantity, quantityToAdd); setProductForQuantity(null); }} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200">Agregar</button>
                        </div>
                    </div> 
                </div> 
            )}
            
            {isCollectModalOpen && ( <CollectSaleModal total={calculateTotal()} onClose={() => setIsCollectModalOpen(false)} onConfirm={(paymentData) => handleSaveInvoice(paymentData)} /> )}

            {confirmClientChange !== null && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">¿Cambiar cliente?</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Hay <strong className="text-slate-700">{newInvoice.items.length} producto(s)</strong> en el carrito. Al cambiar de cliente se limpiarán (los precios pueden variar según lista asignada).
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmClientChange(null)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button onClick={() => { _applyClientChange(confirmClientChange); setConfirmClientChange(null); }} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">Sí, cambiar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Facturacion;