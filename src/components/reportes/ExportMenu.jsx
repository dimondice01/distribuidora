import React from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet } from 'lucide-react';
import { useRanking } from './hooks/useRankingProductosClientes';

/**
 * Exporta el período filtrado a un .xlsx con 3 hojas: Resumen, Movimientos, Rankings.
 * Mismo patrón (XLSX.utils.json_to_sheet / book_new / writeFile) que ya usa Products.jsx.
 */
const ExportMenu = ({ startDate, endDate, totals, gananciaBruta, ventas, resolverVendedorNombre }) => {
    const { topProductos, topClientes } = useRanking(ventas);

    const handleExport = () => {
        const workbook = XLSX.utils.book_new();

        const resumenSheet = XLSX.utils.json_to_sheet([
            { Métrica: 'Período', Valor: `${startDate.toLocaleDateString('es-AR')} - ${endDate.toLocaleDateString('es-AR')}` },
            { Métrica: 'Total Ventas', Valor: totals.totalVenta },
            { Métrica: 'Ganancia Bruta', Valor: gananciaBruta },
            { Métrica: 'Saldo Pendiente', Valor: totals.totalDeuda },
            { Métrica: 'Costo Devoluciones', Valor: totals.totalCostoDevoluciones },
            { Métrica: 'Costo Mercadería', Valor: totals.totalCosto },
        ]);
        XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');

        const movimientosSheet = XLSX.utils.json_to_sheet(ventas.map(v => ({
            Fecha: v.fecha.toLocaleDateString('es-AR'),
            Cliente: v.clienteNombre || '',
            Vendedor: resolverVendedorNombre(v) || '',
            Estado: v.tipo === 'devolucion' ? 'Devolución' : v.estado,
            Total: v.totalVenta || 0,
            Deuda: v.saldoPendiente || 0,
            Ganancia: (v.totalVenta || 0) - (v.totalCosto || 0),
        })));
        XLSX.utils.book_append_sheet(workbook, movimientosSheet, 'Movimientos');

        const productosSheet = XLSX.utils.json_to_sheet(topProductos.map(p => ({
            Producto: p.nombre, 'Unidades vendidas': p.cantidad, Monto: p.monto, Margen: p.margen,
        })));
        XLSX.utils.book_append_sheet(workbook, productosSheet, 'Top Productos');

        const clientesSheet = XLSX.utils.json_to_sheet(topClientes.map(c => ({
            Cliente: c.nombre, Compras: c.cantidadVentas, Monto: c.monto,
        })));
        XLSX.utils.book_append_sheet(workbook, clientesSheet, 'Top Clientes');

        const nombreArchivo = `reporte_general_${startDate.toISOString().slice(0, 10)}_${endDate.toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, nombreArchivo);
    };

    return (
        <button onClick={handleExport} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="Exportar a Excel">
            <FileSpreadsheet className="w-5 h-5" />
        </button>
    );
};

export default ExportMenu;
