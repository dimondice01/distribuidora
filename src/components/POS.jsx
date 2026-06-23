import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth, app } from '../firebase.js';
import { collection, query, where, getDocs, doc, runTransaction, Timestamp, increment, addDoc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'react-toastify';
import { useFirestore } from '../hooks/useFirestore';
import { useShift } from '../contexts/ShiftContext';
import { useTenant } from '../contexts/TenantContext';

// --- CONFIG AFIP/ARCA ---
const functions = getFunctions(app, 'southamerica-west1');
const emitirFacturaCloud = httpsCallable(functions, 'emitirFacturasReparto');

// --- ICONOS ---
const Icono = ({ path, className = "w-5 h-5", d2 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
  </svg>
);

const SearchIcon = () => <Icono path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />;
const BarcodeIcon = () => <Icono path="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />;
const TrashIcon = () => <Icono path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456-1.278A11.862 11.862 0 0020.62 6m-14.456.374a11.862 11.862 0 00-.87 5.143" />;
const PlusIcon = () => <Icono path="M12 4.5v15m7.5-7.5h-15" />;
const MinusIcon = () => <Icono path="M4.5 12.75h15" />;
const CheckIcon = () => <Icono path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
const PrinterIcon = () => <Icono path="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />;
const UserIcon = () => <Icono path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A1.5 1.5 0 0118 21.75H6.001c-.621 0-1.125-.504-1.125-1.125a1.5 1.5 0 01.624-1.507z" />;

const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

// --- HELPERS DE IMPRESIÓN POS ---
const formatAfipDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr || '';
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
};

const getAfipQrUrl = (venta, config) => {
    if (!venta.afipCAE || !config) return null;
    const cuitEmisor = parseInt((config.cuit || '').replace(/-/g, '') || 0);
    const ptoVta = parseInt(config.ptoVta || 1);
    let tipoCmp = 11;
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
    } catch (e) { return null; }
};

// --- LÓGICA DE IMPRESIÓN ---
const printInvoicePDF = (venta, clientDetails, zonaNombre) => {
    const config = venta.companyInfo || {};
    const fechaImpresion = venta.fecha instanceof Timestamp ? venta.fecha.toDate() : (venta.fecha || new Date());

    const tieneCAE = !!venta.afipCAE;
    const letra = tieneCAE ? (venta.afipLetra || 'C') : 'X';
    const esFacturaA = letra === 'A';
    const tituloComprobante = tieneCAE ? 'FACTURA' : 'PRESUPUESTO';
    const codComprobante = tieneCAE ? (letra === 'A' ? 'COD. 001' : letra === 'B' ? 'COD. 006' : 'COD. 011') : 'COD. 000';
    const ptoVtaStr = String(config.ptoVta || '00001').padStart(5, '0');
    const numCompStr = String(venta.afipNumeroComprobante || (venta.id ? venta.id.substring(0, 8) : '00000000')).padStart(8, '0');

    const formatCuit = (val) => {
        const c = String(val || '').replace(/\D/g, '');
        if (c.length === 11) return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;
        return val || 'S/D';
    };
    const condicionVenta = (venta.saldoPendiente !== undefined && venta.saldoPendiente <= 0.01)
        ? ((venta.pagoTarjeta || 0) > 0 ? 'Tarjeta' : 'Contado')
        : 'Cuenta Corriente';

    const isRI = config.taxCondition === 'RI' || config.taxCondition === 'RESPONSABLE_INSCRIPTO';
    const qrUrl = getAfipQrUrl(venta, config);
    const vtoCaeFormateado = formatAfipDate(venta.afipFechaVtoCAE);
    const condIvaTexto = venta.clienteCondicionIVA === 'RI' ? 'Resp. Inscripto' : venta.clienteCondicionIVA === 'MT' ? 'Monotributo' : 'Cons. Final';

    const itemsHtml = (venta.items || []).map((item, idx) => {
        const precioUnit = esFacturaA ? item.precio / 1.21 : item.precio;
        const subtotal = esFacturaA ? (item.precio * item.quantity) / 1.21 : item.precio * item.quantity;
        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        return `
        <tr style="background: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 5px 8px; font-size: 10px; color: #334155;">${item.nombre}</td>
            <td style="padding: 5px 5px; text-align: center; font-size: 9px; width: 30px; color: #94a3b8;">u.</td>
            <td style="padding: 5px 5px; text-align: center; font-size: 10px; width: 40px; color: #334155;">${item.quantity}</td>
            <td style="padding: 5px 8px; text-align: right; font-size: 10px; width: 90px; color: #334155;">${formatCurrency(precioUnit)}</td>
            <td style="padding: 5px 8px; text-align: right; font-size: 10px; width: 90px; font-weight: 700; color: #0f172a;">${formatCurrency(subtotal)}</td>
        </tr>`;
    }).join('');

    const bloquePie = tieneCAE ? `
        <div style="display: flex; gap: 14px; align-items: flex-start;">
            <div>
                <img src="${qrUrl}" alt="QR AFIP" style="width: 90px; height: 90px; display: block; border: 1px solid #cbd5e1; border-radius: 4px;">
                <div style="text-align: center; margin-top: 3px; font-size: 7.5px; color: #64748b; font-weight: 600; letter-spacing: 0.5px;">ARCA | AFIP</div>
            </div>
            <div style="font-size: 9px; color: #1e293b; line-height: 1.7;">
                <div style="font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 3px;">Comprobante Autorizado por ARCA</div>
                <div><span style="color:#64748b;">CAE N°:</span> <strong>${venta.afipCAE}</strong></div>
                <div><span style="color:#64748b;">Vto. CAE:</span> <strong>${vtoCaeFormateado}</strong></div>
            </div>
        </div>
    ` : `
        <div style="border: 1px dashed #94a3b8; padding: 8px; text-align: center; background: #f8fafc; border-radius: 4px;">
            <strong style="font-size: 10px; color: #64748b; letter-spacing: 1px;">DOCUMENTO NO VÁLIDO COMO FACTURA</strong>
        </div>
    `;

    const invoiceHtml = `
    <div style="font-family: 'Arial Narrow', Arial, sans-serif; max-width: 760px; margin: auto; border: 1px solid #cbd5e1; background: #fff; color: #1e293b;">

        <div style="text-align: right; padding: 4px 10px 0; font-size: 8px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #94a3b8;">ORIGINAL</div>

        <div style="border-bottom: 1px solid #cbd5e1; min-height: 120px; position: relative; overflow: hidden;">
            <div style="position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 68px; min-height: 68px; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; background: #1e293b; text-align: center; display: flex; flex-direction: column; justify-content: center; z-index: 1;">
                <div style="font-size: 36px; font-weight: 900; line-height: 1; color: #fff;">${letra}</div>
                <div style="font-size: 8px; margin-top: 3px; color: #94a3b8; letter-spacing: 0.5px;">${codComprobante}</div>
            </div>
            <div style="position: absolute; left: 50%; top: 68px; bottom: 0; border-left: 1px solid #cbd5e1;"></div>

            <div style="width: 50%; float: left; padding: 10px; box-sizing: border-box;">
                <div style="margin-bottom: 6px;">
                    ${config.logo
                        ? `<img src="${config.logo}" alt="Logo" style="max-height: 55px; max-width: 200px; object-fit: contain; object-position: left;">`
                        : `<div style="font-size: 20px; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -0.5px;">${config.nombreFantasia || config.name || ''}</div>`
                    }
                </div>
                <p style="margin: 0; font-size: 9px; line-height: 1.6; color: #334155;">
                    <strong style="color:#0f172a;">${config.razonSocial || config.nombreFantasia || config.name || ''}</strong><br>
                    <span style="color:#64748b;">Domicilio:</span> ${config.domicilioFiscal || ''}<br>
                    <span style="color:#64748b;">Condición IVA:</span> ${isRI ? 'Responsable Inscripto' : 'Monotributo'}
                </p>
            </div>

            <div style="width: 50%; float: right; padding: 12px 12px 10px 44px; box-sizing: border-box;">
                <h2 style="margin: 0 0 6px 0; font-size: 17px; font-weight: 900; color: #0f172a; letter-spacing: 1px;">${tituloComprobante}</h2>
                <p style="margin: 0; font-size: 9.5px; line-height: 1.7; color: #334155;">
                    <strong style="color:#0f172a;">Pto. Venta: ${ptoVtaStr}</strong> &nbsp; <strong style="color:#0f172a;">Comp. Nro: ${numCompStr}</strong><br>
                    <span style="color:#64748b;">Fecha de Emisión:</span> ${fechaImpresion.toLocaleDateString('es-AR')}<br>
                    <span style="color:#64748b;">CUIT:</span> ${formatCuit(config.cuit)}
                    ${config.iibb ? `<br><span style="color:#64748b;">Ing. Brutos:</span> ${config.iibb}` : ''}
                    ${config.inicioActividades ? `<br><span style="color:#64748b;">Inicio Act.:</span> ${config.inicioActividades}` : ''}
                </p>
            </div>
        </div>

        <div style="border-bottom: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9px; background: #f8fafc; line-height: 1.5;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 55%; padding-bottom: 2px; vertical-align: top;">
                        <div style="font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 1px;">Cliente</div>
                        <strong style="text-transform: uppercase; font-size: 10px; color: #0f172a;">${venta.clienteNombre || 'CONSUMIDOR FINAL'}</strong>
                    </td>
                    <td style="width: 25%; padding-bottom: 2px; text-align: right; vertical-align: top;">
                        <div style="font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 1px;">CUIT / DNI</div>
                        <strong style="font-size: 10px; color: #0f172a;">${formatCuit(venta.clienteCuit || clientDetails.cuit || clientDetails.dni)}</strong>
                    </td>
                    <td style="width: 20%; padding-bottom: 2px; text-align: right; vertical-align: top;">
                        <div style="font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 1px;">Cond. Venta</div>
                        <strong style="font-size: 10px; color: #0f172a;">${condicionVenta}</strong>
                    </td>
                </tr>
                <tr>
                    <td colspan="3" style="padding-top: 3px; vertical-align: top; color: #64748b;">
                        <span style="font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px;">Zona:</span>
                        <span style="font-size: 9px; color: #334155;"> ${zonaNombre}</span>
                        &nbsp;&nbsp;<span style="color:#cbd5e1;">|</span>&nbsp;&nbsp;
                        <span style="font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px;">Cond. IVA:</span>
                        <span style="font-size: 9px; color: #334155;"> ${condIvaTexto}</span>
                    </td>
                </tr>
            </table>
        </div>

        <div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead>
                    <tr style="background: #1e293b;">
                        <th style="padding: 6px 8px; text-align: left; color: #fff; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;">Descripción</th>
                        <th style="padding: 6px 5px; text-align: center; width: 30px; color: #94a3b8; font-weight: 600; font-size: 9px; text-transform: uppercase;">U.M.</th>
                        <th style="padding: 6px 5px; text-align: center; width: 40px; color: #fff; font-weight: 700; font-size: 9px; text-transform: uppercase;">Cant.</th>
                        <th style="padding: 6px 8px; text-align: right; width: 90px; color: #fff; font-weight: 700; font-size: 9px; text-transform: uppercase;">P. Unit.${esFacturaA ? ' (Neto)' : ''}</th>
                        <th style="padding: 6px 8px; text-align: right; width: 90px; color: #fff; font-weight: 700; font-size: 9px; text-transform: uppercase;">Importe</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>
        </div>

        <div style="border-top: 1px solid #cbd5e1; display: flex;">
            <div style="width: 60%; padding: 12px; box-sizing: border-box;">
                ${bloquePie}
            </div>
            <div style="width: 40%; border-left: 1px solid #cbd5e1;">
                <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                    ${esFacturaA ? `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 5px 12px 5px 8px; text-align: right; color: #64748b; font-size: 10px;">Neto Gravado (21%):</td>
                        <td style="padding: 5px 12px 5px 8px; text-align: right; color: #334155;">${formatCurrency(venta.totalVenta / 1.21)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 5px 12px 5px 8px; text-align: right; color: #64748b; font-size: 10px;">IVA (21%):</td>
                        <td style="padding: 5px 12px 5px 8px; text-align: right; color: #334155;">${formatCurrency(venta.totalVenta - (venta.totalVenta / 1.21))}</td>
                    </tr>
                    ` : `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 5px 12px 5px 8px; text-align: right; color: #64748b; font-size: 10px;">Subtotal:</td>
                        <td style="padding: 5px 12px 5px 8px; text-align: right; color: #334155;">${formatCurrency(venta.totalVenta)}</td>
                    </tr>
                    `}
                    <tr style="background: #1e293b;">
                        <td style="padding: 10px 12px 10px 8px; text-align: right; font-size: 13px; font-weight: 900; color: #fff;">TOTAL:</td>
                        <td style="padding: 10px 12px 10px 8px; text-align: right; font-size: 13px; font-weight: 900; color: #fff;">${formatCurrency(venta.totalVenta)}</td>
                    </tr>
                </table>
            </div>
        </div>
    </div>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.warn("El navegador bloqueó la impresión. Deshabilite el bloqueador de pop-ups."); return; }
    printWindow.document.write(`<html><head><title>${tituloComprobante} ${ptoVtaStr}-${numCompStr}</title><style>
        body { margin: 20px; font-family: 'Arial Narrow', Arial, sans-serif; }
        @media print { body { margin: 0; } }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
    </style></head><body>${invoiceHtml}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 1500);
};

// --- MODAL DE COBRO ---
const PaymentModal = ({ total, onConfirm, onClose, selectedClient, companyConfig }) => {
    const [pagoEfectivo, setPagoEfectivo] = useState(total.toString());
    const [pagoTransferencia, setPagoTransferencia] = useState('');
    const [pagoTarjeta, setPagoTarjeta] = useState('');
    const [nroCupon, setNroCupon] = useState('');
    const [isAfipEnabled, setIsAfipEnabled] = useState(
        selectedClient?.isArca || false
    );
    const [error, setError] = useState('');

    // --- CÁLCULO DE LETRA PARA PREVIEW (BLINDAJE) ---
    const afipLetra = useMemo(() => {
        if (!companyConfig?.taxCondition) return null;
        if (companyConfig.taxCondition === 'MT') return 'C';
        if (companyConfig.taxCondition === 'RI') {
            const clientCondition = selectedClient?.condicionIva || 'CF';
            return (clientCondition === 'RI') ? 'A' : 'B';
        }
        return 'B';
    }, [companyConfig, selectedClient]);

    const totalPagado = (parseFloat(pagoEfectivo) || 0) + (parseFloat(pagoTransferencia) || 0) + (parseFloat(pagoTarjeta) || 0);
    const vuelto = Math.max(0, totalPagado - total);

    const handleConfirm = () => {
        if (totalPagado < total - 0.01) { setError('El pago es insuficiente.'); return; }
        if ((parseFloat(pagoTarjeta) || 0) > 0 && !nroCupon.trim()) { setError('Ingrese el Nro. de Cupón para tarjeta.'); return; }
        
        // BLINDAJE FISCAL: Validación de Configuración
        if (isAfipEnabled) {
            if (!companyConfig?.cuit || !companyConfig?.taxCondition || !companyConfig?.ptoVta) {
                setError('Configuración AFIP incompleta (Falta CUIT, IVA o Pto. Venta). Configure en Integraciones.');
                return;
            }

            // Validación de CUIT/DNI según letra
            const document = selectedClient?.numeroDocumento || selectedClient?.cuit || selectedClient?.dni || '';
            
            if (afipLetra === 'A' && document.length !== 11) {
                setError('Factura A requiere un CUIT válido de 11 dígitos.');
                return;
            }

        }

        onConfirm({ 
            pagoEfectivo: parseFloat(pagoEfectivo) || 0, 
            pagoTransferencia: parseFloat(pagoTransferencia) || 0, 
            pagoTarjeta: parseFloat(pagoTarjeta) || 0, 
            nroCupon: nroCupon.trim(), 
            vuelto,
            isAfipEnabled 
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in p-4">
            <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-fade-in-up">
                <div className="bg-slate-900 p-8 text-white relative">
                    <button onClick={onClose} className="absolute right-6 top-6 p-2 rounded-full hover:bg-white/10 text-slate-400 transition-all"><Icono path="M6 18L18 6M6 6l12 12" /></button>
                    <p className="text-amber-400 font-black tracking-[0.3em] text-[10px] uppercase mb-2">Checkout POS</p>
                    <h3 className="text-3xl font-black tracking-tighter">Finalizar Venta</h3>
                </div>
                <div className="p-8 space-y-6">
                    <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex justify-between items-center text-slate-800">
                        <div><p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Total a Cobrar</p><p className="text-4xl font-black">{formatCurrency(total)}</p></div>
                        {vuelto > 0 && <div className="text-right"><p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Vuelto</p><p className="text-3xl font-black text-emerald-600">{formatCurrency(vuelto)}</p></div>}
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Efectivo</label>
                            <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">$</span><input type="number" value={pagoEfectivo} onChange={(e) => setPagoEfectivo(e.target.value)} className="w-full pl-10 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black text-slate-800 focus:border-amber-400 focus:bg-white outline-none transition-all" autoFocus /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Transferencia</label>
                                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span><input type="number" value={pagoTransferencia} onChange={(e) => setPagoTransferencia(e.target.value)} className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-slate-800 focus:border-blue-400 outline-none transition-all" /></div>
                            </div>
                            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> Tarjeta</label>
                                <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span><input type="number" value={pagoTarjeta} onChange={(e) => setPagoTarjeta(e.target.value)} className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-slate-800 focus:border-purple-400 outline-none transition-all" /></div>
                            </div>
                        </div>
                        {(parseFloat(pagoTarjeta) || 0) > 0 && <input type="text" value={nroCupon} onChange={(e) => setNroCupon(e.target.value)} className="w-full px-4 py-3 bg-purple-50 border border-purple-100 rounded-xl text-sm font-bold text-purple-700 outline-none" placeholder="Nro. de Cupón / Operación" />}
                        
                        {/* TOGGLE AFIP / ARCA */}
                        <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${isAfipEnabled ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAfipEnabled ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    <CheckIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className={`text-[10px] font-black uppercase tracking-[0.1em] ${isAfipEnabled ? 'text-indigo-600' : 'text-slate-400'}`}>Emisión Fiscal</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-slate-800">FACTURACIÓN ARCA / AFIP</p>
                                        {isAfipEnabled && afipLetra && (
                                            <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-black animate-pulse">
                                                FACTURA {afipLetra}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsAfipEnabled(!isAfipEnabled)}
                                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${isAfipEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
                            >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${isAfipEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 py-3 rounded-xl border border-rose-100">{error}</p>}
                    <div className="pt-4 flex gap-4"><button onClick={onClose} className="flex-1 py-4 text-sm font-black text-slate-400 hover:text-slate-600">CANCELAR</button>
                    <button onClick={handleConfirm} className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3"><CheckIcon className="w-6 h-6 text-amber-400" /> CONFIRMAR PAGO</button></div>
                </div>
            </div>
        </div>
    );
};

// --- MODAL DE BÚSQUEDA DE CLIENTES ---
const ClientSearchModal = ({ isOpen, onClose, clients, onSelect, selectedClientId }) => {
    const [search, setSearch] = useState('');
    const filtered = clients.filter(c => 
        (c.nombre || c.nombreCompleto || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.cuit || '').includes(search) ||
        (c.dni || '').includes(search)
    ).slice(0, 50);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in text-slate-800">
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[80vh] animate-fade-in-up">
                <div className="p-6 border-b bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Seleccionar Cliente</h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all"><Icono path="M6 18L18 6M6 6l12 12" className="w-4 h-4" /></button>
                    </div>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 scale-75"><SearchIcon /></span>
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Buscar por nombre, CUIT o DNI..." 
                            className="w-full pl-10 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-sm focus:border-amber-400 outline-none transition-all shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-slate-50/20">
                    <button 
                        onClick={() => { onSelect(''); onClose(); }}
                        className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-white hover:shadow-md mb-2 border-2 ${!selectedClientId ? 'bg-amber-400/10 border-amber-400/20' : 'bg-transparent border-transparent'}`}
                    >
                        <div className="w-12 h-12 bg-slate-200 rounded-2xl flex items-center justify-center text-slate-500 shadow-inner"><UserIcon className="w-6 h-6" /></div>
                        <div className="text-left flex-1">
                            <div className="flex items-center gap-2">
                                <p className="font-black text-base tracking-tight">Consumidor Final</p>
                                <div className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-slate-100 text-slate-500">CF</div>
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Venta sin registro fiscal</p>
                        </div>
                    </button>
                    <div className="flex items-center gap-4 my-4 px-4">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Directorio</span>
                        <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                    {filtered.map(c => (
                        <button 
                            key={c.id} 
                            onClick={() => { onSelect(c.id); onClose(); }}
                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-white hover:shadow-md mb-2 border-2 ${selectedClientId === c.id ? 'bg-amber-50 border-amber-400/30' : 'bg-transparent border-transparent'}`}
                        >
                            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm">{(c.nombre || c.nombreCompleto || '?')[0]}</div>
                            <div className="text-left flex-1 min-w-0">
                                <p className="font-black text-base tracking-tight truncate">{c.nombre || c.nombreCompleto}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{c.cuit || c.dni || 'Documento S/D'}</p>
                            </div>
                            {c.isarca && <div className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase shadow-lg shadow-indigo-200 scale-75">ARCA</div>}
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <div className="py-12 text-center opacity-20">
                            <Icono path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A1.5 1.5 0 0118 21.75H6.001c-.621 0-1.125-.504-1.125-1.125a1.5 1.5 0 01.624-1.507z" className="w-16 h-16 mx-auto mb-4" />
                            <p className="text-xs font-black uppercase tracking-[0.2em]">Sin resultados</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const POS = () => {
    const { tenantId, onTenantSnapshot, getTenantDoc, getTenantCollection, addTenantDoc, db } = useFirestore();
    const { activeShift } = useShift();
    const { companyConfig, logo: globalLogo } = useTenant();
    
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [clients, setClients] = useState([]);
    const [zonas, setZonas] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [cart, setCart] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState(''); // '' es Consumidor Final
    const [isForDelivery, setIsForDelivery] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [autoPrint, setAutoPrint] = useState(true);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [barcodeBuffer, setBarcodeBuffer] = useState('');

    useEffect(() => {
        if (!tenantId) return;
        setLoading(true);
        const unsubP = onTenantSnapshot('productos', (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubC = onTenantSnapshot('categorias', (snap) => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))), [{ field: 'nombre' }]);
        const unsubCl = onTenantSnapshot('clientes', (snap) => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))), [{ field: 'nombre' }]);
        const unsubZ = onTenantSnapshot('zonas', (snap) => setZonas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        setLoading(false);
        return () => { unsubP(); unsubC(); unsubCl(); unsubZ(); };
    }, [tenantId]);

    useEffect(() => {
        let barcodeTimeout;
        const handleKeyPress = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            
            // Atajos de Teclado
            if (e.key === 'F2') { e.preventDefault(); if (cart.length > 0) setIsPaymentModalOpen(true); return; }
            if (e.key === 'Escape') { setIsPaymentModalOpen(false); return; }

            if (e.key === 'Enter') {
                if (barcodeBuffer.length > 3) {
                    const p = products.find(p => p.codigoDeBarras === barcodeBuffer || p.ean === barcodeBuffer);
                    if (p) { 
                        addToCart(p); 
                        toast.success(`+ ${p.nombre}`, { autoClose: 1000, position: 'bottom-center' }); 
                    } else { toast.warn(`No encontrado: ${barcodeBuffer}`); }
                    setBarcodeBuffer('');
                }
            } else if (e.key.length === 1) {
                setBarcodeBuffer(prev => prev + e.key);
                clearTimeout(barcodeTimeout);
                barcodeTimeout = setTimeout(() => setBarcodeBuffer(''), 100);
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => { window.removeEventListener('keydown', handleKeyPress); clearTimeout(barcodeTimeout); };
    }, [barcodeBuffer, products, cart.length]);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            return [...prev, { id: product.id, nombre: product.nombre, precio: product.precio, costo: product.costo || 0, quantity: 1, img: product.img, imgThumb: product.imgThumb, categoriaId: product.categoriaId }];
        });
    };

    const updateQuantity = (id, delta) => setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));
    const total = useMemo(() => cart.reduce((sum, item) => sum + (item.precio * item.quantity), 0), [cart]);
    const filteredProducts = useMemo(() => products.filter(p => (p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (p.codigoDeBarras || '').includes(searchTerm)) && (selectedCategoryId === 'all' || p.categoriaId === selectedCategoryId)), [products, searchTerm, selectedCategoryId]);

    const handleConfirmPayment = async (paymentData) => {
        if (!activeShift) return toast.error("Turno cerrado.");
        const { isAfipEnabled, esCuentaCorriente } = paymentData;
        const isOnline = navigator.onLine;

        if (!isOnline && isAfipEnabled) {
            toast.error("Sin conexión: no se puede emitir factura AFIP offline.");
            return;
        }

        setIsSaving(isAfipEnabled ? "Iniciando Trámite Fiscal..." : true);

        const client = clients.find(c => c.id === selectedClientId) || { nombre: 'Consumidor Final', id: '' };

        const estadoVenta = esCuentaCorriente
            ? (selectedClientId && isForDelivery ? 'Pendiente de Entrega' : 'Adeuda')
            : (selectedClientId && isForDelivery ? 'Pendiente de Entrega' : 'Pagada');

        const cuitCliente = (client.numeroDocumento || client.cuit || client.dni || '').replace(/\D/g, '');

        const saleData = {
            companyId: tenantId,
            tipo: 'venta_pos',
            vendedorId: auth.currentUser?.uid || 'pos',
            vendedorNombre: auth.currentUser?.email || 'Cajero',
            shiftId: activeShift.id,
            fecha: Timestamp.now(),
            items: cart.map(i => ({ productId: i.id, nombre: i.nombre, precio: i.precio, costo: i.costo, quantity: i.quantity })),
            totalVenta: total,
            pagoEfectivo: paymentData.pagoEfectivo,
            pagoTransferencia: paymentData.pagoTransferencia,
            pagoTarjeta: paymentData.pagoTarjeta,
            nroCupon: paymentData.nroCupon,
            vuelto: paymentData.vuelto,
            clienteId: client.id || '',
            clienteNombre: client.nombre || 'Consumidor Final',
            clienteCuit: cuitCliente,
            clienteCondicionIVA: client.condicionIva || 'CF',
            clienteTipoDoc: (cuitCliente.length === 11) ? 'CUIT' : 'DNI',
            estado: estadoVenta,
            paymentMethod: esCuentaCorriente ? 'cuenta_corriente' : 'contado',
            saldoPendiente: esCuentaCorriente ? total : 0,
            facturaAfip: isAfipEnabled && !esCuentaCorriente,
            syncPendiente: !isOnline,
            afipLetra: (companyConfig?.taxCondition === 'MT')
                ? 'C'
                : (client.condicionIva === 'RI' ? 'A' : 'B'),
        };

        try {
            let finalSaleId = '';

            if (isOnline) {
                // ONLINE: transacción con validación de stock en servidor
                await runTransaction(db, async (t) => {
                    // 1. TODAS LAS LECTURAS (READS) PRIMERO
                    const snaps = [];
                    for (const item of cart) {
                        const ref = getTenantDoc('productos', item.id);
                        const snap = await t.get(ref);
                        snaps.push({ snap, item, ref });
                    }

                    // 2. VALIDACIONES Y ESCRITURAS (WRITES) DESPUÉS
                    for (const { snap, item, ref } of snaps) {
                        if (!snap.exists() || (snap.data().stock || 0) < item.quantity) {
                            throw new Error(`Stock insuficiente para: ${item.nombre}`);
                        }
                        t.update(ref, { stock: increment(-item.quantity) });
                    }

                    const vRef = doc(getTenantCollection('ventas'));
                    t.set(vRef, saleData);
                    finalSaleId = vRef.id;
                });
            } else {
                // OFFLINE: escritura directa, Firestore la encola y sincroniza al reconectar
                const vRef = await addDoc(getTenantCollection('ventas'), saleData);
                finalSaleId = vRef.id;
                for (const item of cart) {
                    await updateDoc(getTenantDoc('productos', item.id), { stock: increment(-item.quantity) });
                }
                toast.warn("Venta guardada OFFLINE. Se sincronizará al reconectar.", { autoClose: 6000 });
            }

            toast.success(esCuentaCorriente ? `Guardado en cuenta corriente — ${client.nombre}.` : "Venta procesada!");

            if (esCuentaCorriente) {
                setCart([]);
                setSelectedClientId('');
                setIsForDelivery(false);
                setIsPaymentModalOpen(false);
                return;
            }

            // 3. Si requiere factura AFIP/ARCA, llamar a la Cloud Function
            let saleForPDF = { ...saleData, id: finalSaleId };

            if (isAfipEnabled) {
                setIsSaving("Procesando AFIP/ARCA...");
                toast.info("Conectando con ARCA (AFIP)...");
                try {
                    const result = await emitirFacturaCloud({ ventas: [{ ...saleData, id: finalSaleId, companyInfo: companyConfig }] });
                    const resultadoAfip = result.data[0];
                    if (resultadoAfip.status === 'OK') {
                        toast.success("¡Factura autorizada!");
                        // Igual que Facturacion.jsx: usar el response directamente
                        saleForPDF = {
                            ...saleForPDF,
                            afipCAE: resultadoAfip.detalle.cae,
                            afipFechaVtoCAE: resultadoAfip.detalle.vtoCAE,
                            afipNumeroComprobante: resultadoAfip.detalle.numero,
                            afipLetra: resultadoAfip.detalle.tipoLetra
                        };
                        // Persistir en Firestore filtrando undefined (Firestore no acepta undefined)
                        try {
                            const afipUpdate = Object.fromEntries(
                                Object.entries({
                                    afipCAE: resultadoAfip.detalle.cae,
                                    afipFechaVtoCAE: resultadoAfip.detalle.vtoCAE,
                                    afipNumeroComprobante: resultadoAfip.detalle.numero,
                                    afipLetra: resultadoAfip.detalle.tipoLetra,
                                    facturaAfip: true
                                }).filter(([, v]) => v !== undefined)
                            );
                            await updateDoc(getTenantDoc('ventas', finalSaleId), afipUpdate);
                            await addTenantDoc('logs_fiscales', {
                                ventaId: finalSaleId,
                                fecha: Timestamp.now(),
                                cae: resultadoAfip.detalle.cae,
                                numero: resultadoAfip.detalle.numero,
                                total: total
                            });
                        } catch (persistError) {
                            console.error("Error al persistir datos AFIP:", persistError);
                            toast.error("Venta OK pero error al guardar datos fiscales. ¡No pierda el ticket!");
                        }
                    } else {
                        toast.error(`Error AFIP: ${resultadoAfip.detalle}`);
                    }
                } catch (afipError) {
                    toast.error("Error de comunicación fiscal.");
                }
            }

            if (autoPrint) {
                // Igual que Facturacion.jsx: inyectar companyInfo explícitamente para el PDF
                const pdfData = {
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
                printInvoicePDF(pdfData, client, zonas.find(z => z.id === client.zonaId)?.nombre || 'Local');
            }
            
            // RESET DE ESTADO POST-VENTA
            setCart([]);
            setSelectedClientId('');
            setIsForDelivery(false);
            setIsPaymentModalOpen(false);
        } catch (err) { toast.error(err.message); } finally { setIsSaving(false); }
    };

    if (!activeShift) return <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center text-slate-800"><div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-3xl flex items-center justify-center mb-6 animate-pulse"><Icono path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" className="w-10 h-10" /></div><h2 className="text-3xl font-black mb-2">Caja Cerrada</h2><p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Abre turno para operar</p></div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans text-slate-800">
            <div className="flex flex-1 overflow-hidden p-6 gap-6">
                {/* --- CARRITO (CENTRO - ÁREA PRINCIPAL) --- */}
                <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-black tracking-tight">CARRITO</h2>
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest leading-none">{cart.length} ITEMS</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button onClick={() => setAutoPrint(!autoPrint)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-black transition-all ${autoPrint ? 'bg-amber-400 border-amber-400 text-slate-900' : 'bg-white border-slate-200 text-slate-400'}`}>
                                <PrinterIcon className="w-3.5 h-3.5"/> 
                                <span className="text-[9px] uppercase tracking-tighter">Auto-Ticket</span>
                            </button>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg">
                                <BarcodeIcon className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Scanner ON</span>
                            </div>
                            {cart.length > 0 && (
                                <button onClick={() => setCart([])} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all ml-2" title="Vaciar Carrito">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div onClick={() => setIsClientModalOpen(true)} className="px-6 py-3 bg-slate-50 border-b flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-all flex-shrink-0 group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-amber-400 group-hover:text-amber-900 transition-all">
                                <UserIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Cliente Seleccionado</p>
                                <h4 className="text-[11px] font-black text-slate-700 uppercase">
                                    {clients.find(c => c.id === selectedClientId)?.nombre || clients.find(c => c.id === selectedClientId)?.nombreCompleto || 'Consumidor Final'}
                                </h4>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedClientId && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setSelectedClientId(''); }}
                                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-all"
                                    title="Quitar Cliente"
                                >
                                    <Icono path="M6 18L18 6M6 6l12 12" className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <Icono path="M8.25 4.5l7.5 7.5-7.5 7.5" className="w-3 h-3 text-slate-300 group-hover:text-amber-500 transition-all" />
                        </div>
                    </div>

                    {/* Listado de Items (Centro) */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                                <Icono path="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84" className="w-16 h-16 mb-4" />
                                <p className="font-black uppercase tracking-widest text-sm">El carrito está vacío</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="p-2.5 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
                                    <div className="w-10 h-10 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0 border border-slate-50 flex items-center justify-center">
                                        {(item.imgThumb || item.img) ? <img src={item.imgThumb || item.img} className="w-full h-full object-cover" /> : <Icono path="M21 7.5L12 12.75L3 7.5" className="text-slate-200 w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-[11px] font-black text-slate-800 truncate leading-tight">{item.nombre}</h5>
                                        <p className="text-[10px] font-black text-amber-600 leading-tight">{formatCurrency(item.precio)}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 flex items-center justify-center hover:bg-white rounded-md transition-all active:scale-90"><MinusIcon className="w-3 h-3"/></button>
                                        <span className="w-6 text-center text-[10px] font-black text-slate-900">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 flex items-center justify-center hover:bg-white rounded-md transition-all active:scale-90"><PlusIcon className="w-3 h-3"/></button>
                                    </div>
                                    <div className="text-right min-w-[70px]">
                                        <p className="text-[12px] font-black text-slate-900">{formatCurrency(item.precio * item.quantity)}</p>
                                    </div>
                                    <button onClick={() => updateQuantity(item.id, -999)} className="p-2 text-slate-300 hover:text-rose-500 rounded-lg transition-all">
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer Carrito (Compacto) */}
                    <div className="p-4 bg-slate-900 text-white shadow-[0_-10px_30px_rgba(0,0,0,0.4)] flex-shrink-0">
                        <div className="flex items-end justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-amber-400 font-black tracking-widest text-[8px] uppercase mb-1">TOTAL VENTA</span>
                                <h4 className="text-3xl font-black tracking-tighter leading-none">{formatCurrency(total)}</h4>
                                <div className="mt-2 flex items-center gap-3">
                                    <span className="px-1.5 py-0.5 bg-slate-800 rounded font-black text-[9px] text-slate-400">{cart.length} ITEMS</span>
                                    {selectedClientId && (
                                        <button 
                                            onClick={() => setIsForDelivery(!isForDelivery)}
                                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all ${isForDelivery ? 'bg-amber-400 border-amber-400 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                        >
                                            <Icono path="M8.25 18.75a1.5 1.5 0 0 1-3 0" className="w-3 h-3" />
                                            <span className="text-[8px] font-black uppercase whitespace-nowrap">{isForDelivery ? 'REPARTO' : 'LOCAL'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex gap-2 flex-shrink-0">
                                {selectedClientId && (
                                    <button
                                        disabled={cart.length === 0 || !!isSaving}
                                        onClick={() => handleConfirmPayment({ pagoEfectivo: 0, pagoTransferencia: 0, pagoTarjeta: 0, nroCupon: '', vuelto: 0, isAfipEnabled: false, esCuentaCorriente: true })}
                                        className="py-3.5 px-3 bg-slate-700 text-white font-black text-[10px] rounded-xl active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5 disabled:opacity-50 disabled:grayscale"
                                    >
                                        <Icono path="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" className="w-4 h-4" />
                                        <span>CTA. CTE.</span>
                                    </button>
                                )}
                                <button
                                    disabled={cart.length === 0 || !!isSaving}
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="py-3.5 px-5 bg-amber-400 text-slate-900 font-black text-lg rounded-xl shadow-xl shadow-amber-400/10 active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:grayscale"
                                >
                                    <CheckIcon className="w-5 h-5" />
                                    COBRAR
                                    <div className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-black">F2</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- CATÁLOGO LADO DERECHO --- */}
                <div className="w-[440px] flex flex-col gap-4 overflow-hidden bg-white/50 backdrop-blur-sm p-4 rounded-[2.5rem] border border-slate-200 shadow-xl">
                    <div className="relative group shadow-sm">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500"><SearchIcon /></span>
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre o EAN..." 
                            className="w-full pl-12 pr-10 py-4 bg-white border-2 border-slate-100 rounded-[1.5rem] font-black text-sm focus:border-amber-400 focus:ring-4 focus:ring-amber-400/5 transition-all outline-none" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><Icono path="M6 18L18 6M6 6l12 12" className="w-4 h-4" /></button>}
                    </div>

                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 text-slate-800">
                        <button 
                            onClick={() => setSelectedCategoryId('all')} 
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedCategoryId === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-amber-400'}`}
                        >
                            Todos
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id} 
                                onClick={() => setSelectedCategoryId(cat.id)} 
                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedCategoryId === cat.id ? 'bg-amber-400 text-slate-900 border-amber-400' : 'bg-white text-slate-400 border-slate-100 hover:border-amber-400'}`}
                            >
                                {cat.nombre}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2 min-h-0">
                        {filteredProducts.slice(0, 15).map((p) => (
                            <button 
                                key={p.id} 
                                onClick={() => addToCart(p)} 
                                className="w-full group bg-white p-4 rounded-3xl border border-slate-100 hover:border-amber-400 hover:shadow-lg hover:shadow-slate-200 transition-all text-left flex items-center gap-4 relative active:scale-95"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-0.5">{categories.find(c => c.id === p.categoriaId)?.nombre}</p>
                                    <h4 className="text-sm font-black text-slate-800 leading-tight truncate">{p.nombre}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-base font-black text-slate-900">{formatCurrency(p.precio)}</span>
                                        {p.stock < 10 && <span className="text-[8px] font-black px-1.5 py-0.5 bg-rose-100 text-rose-500 rounded-md">STOCK CRÍTICO</span>}
                                    </div>
                                </div>
                                <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center">
                                    {(p.imgThumb || p.img) ? <img src={p.imgThumb || p.img} alt={p.nombre} className="w-full h-full object-cover" /> : <PlusIcon className="w-5 h-5 text-slate-400 group-hover:text-slate-900" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isPaymentModalOpen && (
                <PaymentModal 
                    total={total} 
                    selectedClient={clients.find(c => c.id === selectedClientId)}
                    companyConfig={companyConfig}
                    onClose={() => setIsPaymentModalOpen(false)} 
                    onConfirm={handleConfirmPayment} 
                />
            )}
            <ClientSearchModal 
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                clients={clients}
                onSelect={setSelectedClientId}
                selectedClientId={selectedClientId}
            />
            {isSaving && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-fade-in">
                    <div className="w-20 h-20 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-8"></div>
                    <p className="text-3xl font-black text-white tracking-tighter">{typeof isSaving === 'string' ? isSaving : 'Procesando Venta...'}</p>
                </div>
            )}
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none;}.animate-fade-in{animation:fadeIn 0.3s ease-out;}@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}.custom-scrollbar::-webkit-scrollbar{width:6px;}.custom-scrollbar::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:10px;}`}</style>
        </div>
    );
};

export default POS;
