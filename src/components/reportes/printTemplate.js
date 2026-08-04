import { formatCurrency } from './formatters';

/**
 * Genera e imprime el reporte en una ventana nueva. Se mantiene como HTML
 * generado a mano (en vez de renderizar los componentes React reales) porque
 * window.print() sobre un documento standalone es más simple y confiable que
 * montar un segundo árbol de React en la ventana nueva; a cambio, cualquier
 * métrica nueva que se quiera imprimir hay que sumarla acá también.
 */
export function printReport(startDate, endDate, totals, ventas, topProductos = []) {
    const startStr = startDate.toLocaleDateString('es-AR');
    const endStr = endDate.toLocaleDateString('es-AR');

    const rows = ventas.map(v => `
        <tr>
            <td>${v.fecha.toLocaleDateString('es-AR')}</td>
            <td>${v.clienteNombre}</td>
            <td>${v.vendedorNombre || 'N/A'}</td>
            <td>${v.tipo === 'devolucion' ? 'Devolución' : v.estado}</td>
            <td style="text-align:right">${formatCurrency(v.totalVenta)}</td>
            <td style="text-align:right; color:${v.saldoPendiente > 0 ? '#dc2626' : '#111'}">${formatCurrency(v.saldoPendiente)}</td>
            <td style="text-align:right">${formatCurrency(v.totalVenta - (v.totalCosto || 0))}</td>
        </tr>
    `).join('');

    const productoRows = topProductos.slice(0, 10).map(p => `
        <tr>
            <td>${p.nombre}</td>
            <td style="text-align:right">${p.cantidad}</td>
            <td style="text-align:right">${formatCurrency(p.monto)}</td>
            <td style="text-align:right">${formatCurrency(p.margen)}</td>
        </tr>
    `).join('');

    const html = `
    <html>
        <head>
            <title>Reporte General ${startStr} - ${endStr}</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
                h1 { color: #111; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                h2 { font-size: 16px; color: #111; margin-top: 36px; }
                .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .metrics { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
                .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; flex: 1; min-width: 150px; text-align: center; background: #f9fafb; }
                .card h3 { margin: 0 0 5px 0; font-size: 12px; color: #666; text-transform: uppercase; }
                .card p { margin: 0; font-size: 22px; font-weight: bold; color: #333; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
                th { background: #f3f4f6; font-weight: 600; }
                tr:nth-child(even) { background: #f9fafb; }
                @media print {
                    .card { break-inside: avoid; }
                    table { break-inside: auto; }
                    tr { break-inside: avoid; }
                    thead { display: table-header-group; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>Reporte General de Ventas</h1>
                    <p>Período: ${startStr} al ${endStr}</p>
                </div>
                <div style="text-align:right">
                    <p>Generado el: ${new Date().toLocaleString('es-AR')}</p>
                </div>
            </div>

            <div class="metrics">
                <div class="card"><h3>Total Ventas</h3><p>${formatCurrency(totals.totalVenta)}</p></div>
                <div class="card"><h3>Ganancia Bruta</h3><p style="color:#059669">${formatCurrency(totals.gananciaBruta)}</p></div>
                <div class="card"><h3>Deuda</h3><p style="color:#d97706">${formatCurrency(totals.totalDeuda)}</p></div>
                <div class="card"><h3>Costo Mercadería</h3><p>${formatCurrency(totals.totalCosto)}</p></div>
            </div>

            ${productoRows ? `
            <h2>Top Productos del Período</h2>
            <table>
                <thead>
                    <tr><th>Producto</th><th style="text-align:right">Unidades</th><th style="text-align:right">Monto</th><th style="text-align:right">Margen</th></tr>
                </thead>
                <tbody>${productoRows}</tbody>
            </table>
            ` : ''}

            <h2>Movimientos Detallados</h2>
            <table>
                <thead>
                    <tr><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Estado</th><th style="text-align:right">Total</th><th style="text-align:right">Deuda</th><th style="text-align:right">Ganancia</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </body>
    </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
}
