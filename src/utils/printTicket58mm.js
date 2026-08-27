// --- TICKET TÉRMICO 58mm (POS Móvil) ---
// Mismo patrón que src/components/reportes/printTemplate.js: HTML armado a
// mano + window.open + window.print(), en vez de sumar una librería nueva.
// Recibe la misma forma de "venta" que ya arma POS.jsx al confirmar un cobro.

const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

const formatAfipDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr || '';
    return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
};

const idToNumeroRemito = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    }
    return String(hash % 100000000).padStart(8, '0');
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
        return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(urlAfip)}`;
    } catch { return null; }
};

const formatCuit = (val) => {
    const c = String(val || '').replace(/\D/g, '');
    if (c.length === 11) return `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}`;
    return val || 'S/D';
};

export function printTicket58mm(venta, clientDetails, zonaNombre) {
    const config = venta.companyInfo || {};
    const fechaImpresion = venta.fecha?.toDate ? venta.fecha.toDate() : (venta.fecha instanceof Date ? venta.fecha : new Date());

    const tieneCAE = !!venta.afipCAE;
    const letra = tieneCAE ? (venta.afipLetra || 'C') : 'X';
    const esFacturaA = letra === 'A';
    const tituloComprobante = tieneCAE ? 'FACTURA' : 'REMITO';
    const ptoVtaStr = String(config.ptoVta || '00001').padStart(5, '0');
    const numCompStr = venta.afipNumeroComprobante
        ? String(venta.afipNumeroComprobante).padStart(8, '0')
        : idToNumeroRemito(venta.id || '');

    const condicionVenta = (venta.saldoPendiente !== undefined && venta.saldoPendiente <= 0.01)
        ? ((venta.pagoTarjeta || 0) > 0 ? 'Tarjeta' : 'Contado')
        : 'Cuenta Corriente';

    const isRI = config.taxCondition === 'RI' || config.taxCondition === 'RESPONSABLE_INSCRIPTO';
    const qrUrl = getAfipQrUrl(venta, config);
    const vtoCaeFormateado = formatAfipDate(venta.afipFechaVtoCAE);

    const itemsHtml = (venta.items || []).map((item) => {
        if (item.esRegalo) {
            return `
            <div class="item-row">
                <div class="item-nombre">${item.nombre}</div>
                <div class="item-detalle">
                    <span>${item.quantity} x GRATIS</span>
                    <span class="item-importe">$0,00</span>
                </div>
            </div>`;
        }
        const precioUnit = esFacturaA ? item.precio / 1.21 : item.precio;
        const subtotal = precioUnit * item.quantity;
        return `
        <div class="item-row">
            <div class="item-nombre">${item.nombre}</div>
            <div class="item-detalle">
                <span>${item.quantity} x ${formatCurrency(precioUnit)}</span>
                <span class="item-importe">${formatCurrency(subtotal)}</span>
            </div>
        </div>`;
    }).join('');

    const descuentoPromociones = Number(venta.descuentoPromociones || 0);

    const bloqueFiscal = tieneCAE ? `
        <div class="afip-block">
            ${qrUrl ? `<img src="${qrUrl}" alt="QR AFIP" class="qr-img">` : ''}
            <div class="afip-text">
                <div>CAE N°: ${venta.afipCAE}</div>
                <div>Vto. CAE: ${vtoCaeFormateado}</div>
            </div>
        </div>
    ` : `
        <div class="no-fiscal">DOCUMENTO NO VÁLIDO COMO FACTURA</div>
    `;

    const bodyContent = `
    <div class="ticket">
        <div class="center bold big">${config.nombreFantasia || config.name || ''}</div>
        <div class="center small">${config.razonSocial || ''}</div>
        <div class="center small">CUIT: ${formatCuit(config.cuit)}</div>
        <div class="center small">${isRI ? 'Responsable Inscripto' : 'Monotributo'}</div>
        <div class="divider"></div>
        <div class="center bold">${tituloComprobante} ${letra}</div>
        <div class="center small">Pto. Vta ${ptoVtaStr} - Comp. N° ${numCompStr}</div>
        <div class="center small">${fechaImpresion.toLocaleDateString('es-AR')} ${fechaImpresion.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
        <div class="divider"></div>
        <div class="small"><strong>Cliente:</strong> ${venta.clienteNombre || 'CONSUMIDOR FINAL'}</div>
        <div class="small"><strong>CUIT/DNI:</strong> ${formatCuit(venta.clienteCuit || clientDetails?.numeroDocumento || clientDetails?.cuit || clientDetails?.dni)}</div>
        <div class="small"><strong>Cond. Venta:</strong> ${condicionVenta}</div>
        ${zonaNombre ? `<div class="small"><strong>Zona:</strong> ${zonaNombre}</div>` : ''}
        <div class="small"><strong>Vendedor:</strong> ${venta.vendedorNombre || 'N/A'}</div>
        <div class="divider"></div>
        ${itemsHtml}
        <div class="divider"></div>
        ${descuentoPromociones > 0 ? `
        <div class="small" style="display:flex;justify-content:space-between;">
            <span>Subtotal</span><span>${formatCurrency(venta.totalVenta + descuentoPromociones)}</span>
        </div>
        <div class="small" style="display:flex;justify-content:space-between;">
            <span>Descuento promociones</span><span>-${formatCurrency(descuentoPromociones)}</span>
        </div>
        ` : ''}
        <div class="total-row">
            <span>TOTAL</span>
            <span>${formatCurrency(venta.totalVenta)}</span>
        </div>
        <div class="divider"></div>
        ${bloqueFiscal}
        <div class="center small footer">¡Gracias por su compra!</div>
    </div>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert("El navegador bloqueó la impresión. Deshabilite el bloqueador de pop-ups."); return; }
    printWindow.document.write(`<html><head><title>${tituloComprobante} ${ptoVtaStr}-${numCompStr}</title><style>
        * { box-sizing: border-box; }
        @page { size: 58mm auto; margin: 0; }
        body { margin: 0; padding: 2mm; font-family: 'Courier New', Courier, monospace; width: 54mm; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .ticket { width: 100%; }
        .center { text-align: center; }
        .bold { font-weight: 700; }
        .big { font-size: 13px; }
        .small { font-size: 10px; line-height: 1.5; word-break: break-word; }
        .divider { border-top: 1px dashed #000; margin: 4px 0; }
        .item-row { margin-bottom: 3px; }
        .item-nombre { font-size: 10px; font-weight: 700; }
        .item-detalle { display: flex; justify-content: space-between; font-size: 10px; }
        .item-importe { font-weight: 700; }
        .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; }
        .afip-block { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .qr-img { width: 32mm; height: 32mm; }
        .afip-text { font-size: 8px; text-align: center; line-height: 1.4; }
        .no-fiscal { text-align: center; font-size: 9px; font-weight: 700; border: 1px dashed #000; padding: 4px; }
        .footer { margin-top: 6px; }
        @media print { body { padding: 0 2mm; } }
    </style></head><body>${bodyContent}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 800);
}
