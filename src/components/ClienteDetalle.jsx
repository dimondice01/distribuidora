// En: src/components/ClienteDetalle.jsx

import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js';
import { doc, getDoc, Timestamp, writeBatch, serverTimestamp } from 'firebase/firestore';
import Button from './Button'; 
import { useFirestore } from '../hooks/useFirestore';
import { useTenant } from '../contexts/TenantContext'; // ✅ NUEVO: Contexto Multi-Tenant
import { useShift } from '../contexts/ShiftContext'; // ✅ NUEVO: Contexto para registrar cobranza
import AssetTable from './AssetTable'; // ✅ NUEVO: Tabla de Matafuegos
import { toast } from 'react-toastify';

// --- ICONOS ---
const Icono = ({ path, d2, className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
    </svg>
);
const PrintIcon = () => <Icono path="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />;
const BanknotesIcon = () => <Icono path="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75m0 1.5v.75m0 1.5v.75m0 1.5V15m1.5 1.5h1.5m1.5 1.5h1.5m1.5 1.5h1.5m1.5 1.5H18M3.75 4.5a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75H4.5a.75.75 0 01-.75-.75V4.5zM3.75 21a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75H4.5a.75.75 0 01-.75-.75V21zM5.25 5.25h.75v.75h-.75v-.75zM5.25 21.75h.75v.75h-.75v-.75zM12 12a3 3 0 11-6 0 3 3 0 016 0z" />;
const MapPinIcon = () => <Icono path="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" d2="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />;
const UserIcon = () => <Icono path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />;
const MailIcon = () => <Icono path="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />;

// --- FUNCIÓN DE IMPRESIÓN (Copiada de Facturacion.jsx) ---
const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

const printInvoicePDF = (venta, clientDetails, zonaNombre, companyConfig = {}) => {
    const fechaImpresion = venta.fecha instanceof Timestamp ? venta.fecha.toDate() : (venta.fecha || new Date());

    // Usa el snapshot guardado en la venta; si no existe, cae al config actual de la empresa
    const co = venta.companyInfo || companyConfig || {};
    const logoUrl = co.logo || '';
    const companyName = co.nombreFantasia || co.name || 'DISTRIBUIDORA';
    const companyAddress = co.domicilioFiscal || 'Argentina';
    const taxType = co.taxCondition === 'RI' ? 'Responsable Inscripto' : (co.taxCondition === 'MT' ? 'Monotributista' : 'Contribuyente');
    const companyCuit = co.cuit || 'S/D';
    const ptoVtaStr = String(co.ptoVta || '1').padStart(5, '0');

    const tieneCAE = !!venta.afipCAE;
    const letra = tieneCAE ? (venta.afipLetra || 'C') : 'X';
    const tituloComprobante = tieneCAE ? 'FACTURA' : 'PRESUPUESTO';
    const codComprobante = tieneCAE ? (letra === 'A' ? 'COD. 001' : letra === 'B' ? 'COD. 006' : 'COD. 011') : 'COD. 000';
    const numCompStr = String(venta.afipNumeroComprobante || venta.id.substring(0, 8)).padStart(8, '0');

    let qrHtml = '';
    if (tieneCAE) {
        const cleanCuit = String(companyCuit).replace(/-/g, '');
        const datosQr = {
            ver: 1,
            fecha: fechaImpresion.toISOString().split('T')[0],
            cuit: parseInt(cleanCuit) || 0,
            ptoVta: parseInt(co.ptoVta) || 1,
            tipoCmp: letra === 'A' ? 1 : (letra === 'B' ? 6 : 11),
            nroCmp: parseInt(venta.afipNumeroComprobante || 0),
            importe: parseFloat(venta.totalVenta),
            moneda: "PES",
            ctz: 1,
            codAut: parseInt(venta.afipCAE)
        };
        const urlAfip = `https://www.afip.gob.ar/fe/qr/?p=${btoa(JSON.stringify(datosQr))}`;
        const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=0&data=${encodeURIComponent(urlAfip)}`;
        qrHtml = `
            <div style="display: flex; gap: 10px; align-items: center; margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                <img src="${qrImgUrl}" alt="QR AFIP" style="width: 80px; height: 80px; border: 1px solid #ddd;" />
                <div style="font-size: 10px; font-weight: bold;">
                    <span style="font-style: italic; color: #666;">Comprobante autorizado por AFIP</span><br>
                    <span style="font-size: 11px;">CAE: ${venta.afipCAE}</span><br>
                    <span>Vto. CAE: ${venta.afipFechaVtoCAE || ''}</span>
                </div>
            </div>`;
    }

    const itemsHtml = (venta.items || []).map(item => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 5px; font-size: 11px;">${item.nombre}</td>
            <td style="text-align: center; padding: 8px 5px; font-size: 11px;">${item.quantity}</td>
            <td style="text-align: right; padding: 8px 5px; font-size: 11px;">${formatCurrency(item.precio)}</td>
            <td style="text-align: right; padding: 8px 5px; font-size: 11px; font-weight: bold;">${formatCurrency(item.quantity * item.precio)}</td>
        </tr>`).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>${tituloComprobante} #${numCompStr}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; font-size: 12px; color: #333; line-height: 1.4; }
                .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 8px; }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                .company-info { width: 50%; }
                .logo-container { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; }
                .logo-img { max-height: 60px; max-width: 200px; object-fit: contain; }
                .logo-placeholder { width: 50px; height: 50px; background-color: #1e293b; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fbbf24; font-weight: 900; font-size: 24px; }
                .company-name-text { font-size: 20px; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: -0.5px; }
                .letter-box { width: 50px; height: 55px; border: 2px solid #333; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; margin-bottom: 5px; }
                .letter { font-size: 32px; font-weight: 900; line-height: 1; }
                .letter-code { font-size: 9px; font-weight: bold; }
                .invoice-data { text-align: right; width: 40%; }
                .client-info { background: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e2e8f0; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; font-weight: 800; padding: 12px 8px; text-align: left; border-bottom: 2px solid #e2e8f0; }
                td { padding: 10px 8px; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .total-row td { border-top: 2px solid #333; font-weight: 900; font-size: 16px; padding-top: 15px; }
                .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
                .legal-notice { font-size: 8px; text-transform: uppercase; font-weight: bold; color: #64748b; margin-top: 5px; }
            </style>
        </head>
        <body>
            <div class="invoice-box">
                <div class="header">
                    <div class="company-info">
                        <div class="logo-container">
                            ${logoUrl ? `<img src="${logoUrl}" class="logo-img" />` : `
                                <div class="logo-placeholder">${(companyName || 'D')[0]}</div>
                                <div class="company-name-text">${companyName}</div>
                            `}
                        </div>
                        <p style="margin: 0; font-size: 11px; font-weight: 500;">
                            <strong>${co.name || companyName}</strong><br>
                            ${companyAddress}<br>
                            Condición IVA: ${taxType}<br>
                            ${co.iibb ? `Ingresos Brutos: ${co.iibb}<br>` : ''}
                            ${co.inicioActividades ? `Inicio de Actividades: ${co.inicioActividades}` : ''}
                        </p>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; margin-right: 20px;">
                        <div class="letter-box">
                            <div class="letter">${letra}</div>
                            <div class="letter-code">${codComprobante}</div>
                        </div>
                        ${!tieneCAE ? '<div class="legal-notice">No válido como factura</div>' : ''}
                    </div>
                    <div class="invoice-data">
                        <h2 style="margin: 0 0 10px 0; color: #1e293b; font-size: 24px; font-weight: 900;">${tituloComprobante}</h2>
                        <p style="font-size: 12px; line-height: 1.6; font-weight: 600;">
                            <span style="color: #64748b;">Número:</span> ${ptoVtaStr}-${numCompStr}<br>
                            <span style="color: #64748b;">Fecha:</span> ${fechaImpresion.toLocaleDateString('es-AR')}<br>
                            <span style="color: #64748b;">CUIT:</span> ${companyCuit}
                        </p>
                    </div>
                </div>
                <div class="client-info">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Cliente</span>
                            <strong style="font-size: 14px;">${venta.clienteNombre || 'Consumidor Final'}</strong>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">CUIT / DNI</span>
                            <strong>${venta.clienteCuit || clientDetails.cuit || clientDetails.dni || clientDetails.numeroDocumento || 'S/D'}</strong>
                        </div>
                    </div>
                    <div style="margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                        <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Dirección:</span>
                        <span style="font-size: 11px; font-weight: 600;">${clientDetails.direccion || 'N/A'} (${zonaNombre})</span>
                        <span style="margin: 0 10px; color: #cbd5e1;">|</span>
                        <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Cond. IVA:</span>
                        <span style="font-size: 11px; font-weight: 600;">${venta.clienteCondicionIVA === 'RI' ? 'Resp. Inscripto' : 'Consumidor Final'}</span>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th width="50%">Descripción del Producto</th>
                            <th width="10%" class="text-center">Cant.</th>
                            <th width="20%" class="text-right">Precio Unit.</th>
                            <th width="20%" class="text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="3" class="text-right">TOTAL A PAGAR</td>
                            <td class="text-right">${formatCurrency(venta.totalVenta)}</td>
                        </tr>
                    </tfoot>
                </table>
                ${qrHtml}
                <div class="footer">Gracias por su confianza. Este documento es un comprobante de operación.</div>
            </div>
        </body>
        </html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 1000);
};
// --- ¡NUEVO! Helper para obtener el Lunes de esta semana ---
// (Copiado de la lógica de la app móvil para que el cálculo sea idéntico)
const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // Domingo = 0, Lunes = 1, ...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajusta para Lunes
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0); // Setea a medianoche
    return monday;
};

// --- ¡NUEVO! Widget de Resumen de Seguridad (Matafuegos) ---
const SafetySummary = ({ assets }) => {
    const stats = assets.reduce((acc, asset) => {
        const today = new Date();
        const dueDate = asset.proximaVisita?.toDate ? asset.proximaVisita.toDate() : new Date(asset.proximaVisita);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) acc.vencidos++;
        else if (diffDays <= 30) acc.porVencer++;
        else acc.ok++;
        return acc;
    }, { vencidos: 0, porVencer: 0, ok: 0 });

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
            <h3 className="text-xl font-black text-slate-800 mb-4 tracking-tight">Estado de Seguridad</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                    <span className="flex items-center gap-2 text-red-700 font-bold text-sm">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        Vencidos
                    </span>
                    <span className="text-2xl font-black text-red-800">{stats.vencidos}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        Por Vencer (30d)
                    </span>
                    <span className="text-2xl font-black text-amber-800">{stats.porVencer}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Al Día
                    </span>
                    <span className="text-2xl font-black text-emerald-800">{stats.ok}</span>
                </div>
            </div>
        </div>
    );
};


const GoalProgressBar = ({ goalInfo }) => {
    const { rubro, totalSold, percentage } = goalInfo;
    if (!rubro) return null;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
            <h3 className="text-xl font-black text-slate-800 mb-4 tracking-tight">Meta Semanal ({rubro.nombre})</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Progreso</span>
                    <span className="text-2xl font-black text-slate-800">{Math.round(percentage)}%</span>
                </div>
                <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-amber-400 transition-all duration-500 shadow-[0_0_10px_rgba(251,191,36,0.4)]" 
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                    <span className="text-slate-400">Vendido: <span className="text-slate-800">${totalSold.toLocaleString()}</span></span>
                    <span className="text-slate-400">Meta: <span className="text-slate-800">${rubro.metaSemanal.toLocaleString()}</span></span>
                </div>
            </div>
        </div>
    );
};

const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    // Soporta Firestore Timestamp y Date nativo
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};


function ClienteDetalle({ clienteId, onBack }) {
    const { tenantId, onTenantSnapshot, getTenantDoc, getTenantCollection, updateTenantDoc } = useFirestore();
    const { companyConfig } = useTenant(); 
    const { activeShift } = useShift();
    const [cliente, setCliente] = useState(null);
    const [ventas, setVentas] = useState([]);
    const [assets, setAssets] = useState([]); 
    const [rubro, setRubro] = useState(null);
    const [vendedorNombre, setVendedorNombre] = useState('Buscando...');
    const [loading, setLoading] = useState(true);

    // --- ESTADOS DE PAGINACIÓN Y COBRANZA ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [selectedVenta, setSelectedVenta] = useState(null);
    const [montoCobro, setMontoCobro] = useState('');
    const [metodoCobro, setMetodoCobro] = useState('Efectivo');
    const [isSaving, setIsSaving] = useState(false);

    const isMatafuegos = companyConfig?.modules?.includes('matafuegos');

    useEffect(() => {
        if (!clienteId || !tenantId) return;

        setLoading(true);
        const getClientData = async () => {
            try {
                const clienteRef = getTenantDoc('clientes', clienteId);
                const docSnap = await getDoc(clienteRef);
                if (docSnap.exists()) {
                    const clienteData = docSnap.data();
                    setCliente({ id: docSnap.id, ...clienteData });

                    if (clienteData.rubroId) {
                        const rubroRef = getTenantDoc('rubros', clienteData.rubroId);
                        const rubroSnap = await getDoc(rubroRef);
                        if (rubroSnap.exists()) {
                            setRubro({ id: rubroSnap.id, ...rubroSnap.data() });
                        }
                    }

                    if (clienteData.vendedorAsignadoId) {
                        const vRef = doc(db, 'companies', tenantId, 'vendedores', clienteData.vendedorAsignadoId);
                        const vSnap = await getDoc(vRef);
                        if (vSnap.exists()) {
                            setVendedorNombre(vSnap.data().nombreCompleto);
                        } else {
                            setVendedorNombre('No encontrado');
                        }
                    } else {
                        setVendedorNombre('No Asignado');
                    }
                }
            } catch (e) {
                console.error("Error cargando detalle:", e);
            } finally {
                setLoading(false);
            }
        };
        getClientData();
    }, [clienteId, tenantId]);

    useEffect(() => {
        if (!clienteId || !tenantId) return;

        const unsubVentas = onTenantSnapshot('ventas', (snapshot) => {
            const ventasData = snapshot.docs
                .filter(d => d.data().clienteId === clienteId)
                .map(doc => ({ id: doc.id, ...doc.data() }));
            ventasData.sort((a, b) => b.fecha?.toDate() - a.fecha?.toDate());
            setVentas(ventasData);
        });

        let unsubAssets = () => {};
        if (isMatafuegos) {
            unsubAssets = onTenantSnapshot('assets', (snapshot) => {
                const assetsData = snapshot.docs
                    .filter(d => d.data().clientId === clienteId)
                    .map(doc => ({ id: doc.id, ...doc.data() }));
                setAssets(assetsData);
            });
        }

        return () => {
            unsubVentas();
            unsubAssets();
        };
    }, [clienteId, tenantId, isMatafuegos]);

    // Cálculo de Deuda y Metas
    const debtAndGoal = useMemo(() => {
        const totalDeuda = ventas.reduce((sum, v) => sum + (v.estado !== 'Anulada' ? (v.saldoPendiente || 0) : 0), 0);
        
        if (!rubro) return { totalDeuda, weeklyGoal: { rubro: null, totalSold: 0, percentage: 0 }};

        const metaSemanal = rubro.metaSemanal || 0;
        const lastMonday = getMonday(new Date());
        const salesThisWeek = ventas.filter(v => v.estado !== 'Anulada' && v.fecha?.toDate() >= lastMonday);
        const totalSoldThisWeek = salesThisWeek.reduce((sum, v) => sum + (v.totalVenta || 0), 0);
        const percentage = (metaSemanal > 0) ? (totalSoldThisWeek / metaSemanal) * 100 : 0;

        return {
            totalDeuda,
            weeklyGoal: { rubro, totalSold: totalSoldThisWeek, percentage: Math.min(100, percentage) }
        };
    }, [rubro, ventas]);

    // Paginación
    const totalPages = Math.ceil(ventas.length / itemsPerPage);
    const paginatedVentas = ventas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Handlers
    const handleRegistrarCobro = async () => {
        const monto = parseFloat(montoCobro);
        if (!selectedVenta || isNaN(monto) || monto <= 0) return toast.error("Monto inválido");
        if (monto > (selectedVenta.saldoPendiente + 0.01)) return toast.error("El monto supera el saldo");

        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const ventaRef = getTenantDoc('ventas', selectedVenta.id);
            const nuevoSaldo = Math.max(0, selectedVenta.saldoPendiente - monto);

            // 1. Actualizar Venta
            batch.update(ventaRef, {
                saldoPendiente: nuevoSaldo,
                estado: nuevoSaldo <= 0.05 ? 'Pagada' : 'Adeuda',
                lastPayment: serverTimestamp()
            });

            // 2. Registrar Cobranza
            const cobranzaRef = doc(getTenantCollection('cobranzas'));
            batch.set(cobranzaRef, {
                companyId: tenantId,
                ventaId: selectedVenta.id,
                clienteId: cliente.id,
                clienteNombre: cliente.nombre,
                monto: monto,
                metodoPago: metodoCobro,
                fecha: serverTimestamp(),
                shiftId: activeShift?.id || null,
                detalle: `Cobro parcial Factura ${selectedVenta.afipNumeroComprobante || selectedVenta.id.substring(0,8)}`
            });

            // 3. Si es efectivo, impactar en Caja
            if (metodoCobro === 'Efectivo') {
                const cajaRef = doc(getTenantCollection('movimientos_caja'));
                batch.set(cajaRef, {
                    companyId: tenantId,
                    monto: monto,
                    tipo: 'ingreso',
                    categoria: 'cobranza_cliente',
                    detalle: `Cobranza: ${cliente.nombre} (Venta ${selectedVenta.id.substring(0,8)})`,
                    fecha: serverTimestamp(),
                    shiftId: activeShift?.id || null
                });
            }

            await batch.commit();
            toast.success("Pago registrado correctamente");
            setSelectedVenta(null);
            setMontoCobro('');
        } catch (err) {
            console.error(err);
            toast.error("Error al registrar el cobro");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-10 flex justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
    if (!cliente) return <div className="p-10 text-center text-red-500 font-bold">Error: Cliente no encontrado.</div>;

    return (
        <div className="p-6 h-full overflow-y-auto bg-slate-50 font-sans">
            <header className="flex justify-between items-center mb-8">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold transition-colors uppercase text-xs tracking-widest">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Volver a Cartera
                </button>
                <div className="flex gap-4">
                    <div className="bg-white px-6 py-2 rounded-2xl border border-slate-200 shadow-sm text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Deuda Total</p>
                        <p className={`text-xl font-black ${debtAndGoal.totalDeuda > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCurrency(debtAndGoal.totalDeuda)}
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                       <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                    </div>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-black">
                            {cliente.nombre.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">{cliente.nombre}</h2>
                            <p className="text-indigo-500 font-bold text-xs mt-2 uppercase tracking-widest">{cliente.localidad} | {cliente.barrio || 'Sin Barrio'} | <span className="text-slate-400 font-medium">Creado: {formatDate(cliente.fechaCreacion)}</span></p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contacto</p>
                            <p className="text-slate-700 font-bold text-sm tracking-tight">{cliente.telefono || 'S/D'}</p>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{cliente.email || 'Sin Email'}</p>
                        </div>
                        <div className="col-span-2">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ubicación</p>
                                    <p className="text-slate-700 font-bold text-sm truncate">{cliente.direccion || 'S/D'}</p>
                                </div>
                                {cliente.location && (
                                    <a 
                                        href={`https://www.google.com/maps?q=${cliente.location.latitude},${cliente.location.longitude}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-1 text-[10px] font-black uppercase"
                                    >
                                        <MapPinIcon className="w-3 h-3"/> GPS
                                    </a>
                                )}
                             </div>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gestión Venta</p>
                            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-sm">
                                <UserIcon className="w-3 h-3 text-slate-400"/>
                                <span className="truncate">{vendedorNombre}</span>
                            </div>
                            <p className="text-[10px] text-indigo-500 font-bold uppercase mt-0.5">{cliente.listaPreciosAsignada || 'Lista General'}</p>
                        </div>
                    </div>

                    {/* --- SECCIÓN FISCAL (NUEVO: BLINDAJE & AUTOMATIZACIÓN) --- */}
                    <div className="mt-8 pt-8 border-t border-slate-50 flex flex-wrap items-center gap-8">
                        <div className="flex items-center gap-3">
                            <label className="flex items-center cursor-pointer group">
                                <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${cliente.isArca ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${cliente.isArca ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={cliente.isArca || false} 
                                    onChange={async (e) => {
                                        const newVal = e.target.checked;
                                        setCliente(prev => ({ ...prev, isArca: newVal }));
                                        try {
                                            await updateTenantDoc('clientes', cliente.id, { isArca: newVal, condicionIva: newVal ? (cliente.condicionIva || 'CF') : 'CF' });
                                            toast.success(`Facturación ${newVal ? 'Activada' : 'Desactivada'}`);
                                        } catch (err) { toast.error("Error al actualizar"); }
                                    }} 
                                />
                                <div className="ml-3">
                                    <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${ (cliente.isArca || cliente.requiereFacturaAfip) ? 'text-indigo-600' : 'text-slate-400'}`}>Facturación Automática</p>
                                    <p className="text-xs font-bold text-slate-800 mt-1">Sincronización ARCA / AFIP</p>
                                </div>
                            </label>
                        </div>

                        {(cliente.isArca || cliente.requiereFacturaAfip) && (
                            <div className="animate-fade-in flex items-center gap-6 bg-indigo-50/50 px-5 py-3 rounded-[2rem] border border-indigo-100">
                                <div>
                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 leading-none">Documento ({cliente.tipoDocumento || 'DNI'})</p>
                                    <p className="text-sm font-black text-indigo-900">{cliente.numeroDocumento || cliente.cuit || 'S/D'}</p>
                                </div>
                                <div className="w-[1px] h-8 bg-indigo-100"></div>
                                <div>
                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 leading-none">Condición IVA</p>
                                    <select 
                                        value={cliente.condicionIva || 'CF'}
                                        onChange={async (e) => {
                                            const newVal = e.target.value;
                                            setCliente(prev => ({ ...prev, condicionIva: newVal }));
                                            try {
                                                await updateTenantDoc('clientes', cliente.id, { condicionIva: newVal });
                                                toast.success("Condición IVA actualizada");
                                            } catch (err) { toast.error("Error al actualizar"); }
                                        }}
                                        className="bg-transparent text-sm font-black text-indigo-900 outline-none cursor-pointer"
                                    >
                                        <option value="RI">Responsable Inscripto</option>
                                        <option value="MT">Monotributista</option>
                                        <option value="EX">Exento</option>
                                        <option value="NR">No Responsable</option>
                                        <option value="CF">Consumidor Final</option>
                                    </select>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-black text-white ${
                                    cliente.condicionIva === 'RI' ? 'bg-amber-500' :
                                    cliente.condicionIva === 'MT' ? 'bg-emerald-500' :
                                    'bg-indigo-500'
                                }`}>
                                    FACTURA {cliente.condicionIva === 'RI' ? 'A' : (cliente.condicionIva === 'EX' ? 'B' : 'B')}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="md:col-span-1">
                    {isMatafuegos ? (
                        <SafetySummary assets={assets} />
                    ) : (
                        <GoalProgressBar goalInfo={debtAndGoal.weeklyGoal} />
                    )}
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Historial de Cuenta Corriente</h3>
                    <div className="flex gap-2">
                         <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Mostrando {itemsPerPage} por página</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Comprobante</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Total</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Saldo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedVentas.length === 0 ? (
                                <tr><td colSpan="6" className="p-12 text-center text-slate-400 font-bold italic">No hay registros de ventas.</td></tr>
                            ) : (
                                paginatedVentas.map((venta) => (
                                    <tr key={venta.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-bold text-slate-500">{formatDate(venta.fecha)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-700">{venta.afipNumeroComprobante ? `Factura ${venta.afipNumeroComprobante}` : (venta.tipo || 'Venta')}</span>
                                                <span className="text-[9px] text-slate-400 font-mono">#{venta.id.substring(0,8)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                                venta.estado === 'Pagada' ? 'bg-emerald-100 text-emerald-600' : 
                                                venta.estado === 'Adeuda' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {venta.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-600 text-sm">{formatCurrency(venta.totalVenta)}</td>
                                        <td className="px-6 py-4 text-right font-black text-rose-500 text-sm">
                                            {venta.saldoPendiente > 0 ? formatCurrency(venta.saldoPendiente) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => printInvoicePDF(venta, cliente, cliente.zonaId, companyConfig)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm group-hover:shadow-md" title="Ver Comprobante">
                                                    <PrintIcon />
                                                </button>
                                                {venta.saldoPendiente > 0 && (
                                                    <button onClick={() => setSelectedVenta(venta)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-xl transition-all shadow-sm group-hover:shadow-md" title="Registrar Pago">
                                                        <BanknotesIcon />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-center gap-4">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm">ANTERIOR</button>
                        <span className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest">{currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm">SIGUIENTE</button>
                    </div>
                )}
            </div>

            {/* Modal de Pago Parcial */}
            {selectedVenta && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in shadow-2xl">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 p-8">
                        <header className="text-center mb-8">
                            <h4 className="text-xl font-black text-slate-800">Registrar Cobranza</h4>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Factura #{selectedVenta.afipNumeroComprobante || selectedVenta.id.substring(0,8)}</p>
                        </header>
                        
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto Recibido</p>
                                <div className="relative max-w-xs mx-auto">
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl">$</span>
                                    <input 
                                        type="number" 
                                        className="w-full pl-6 bg-transparent text-center font-black text-slate-900 outline-none border-b-4 border-indigo-200 focus:border-indigo-600 text-4xl" 
                                        placeholder="0.00"
                                        value={montoCobro}
                                        onChange={(e) => setMontoCobro(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold mt-4 italic">Saldo Pendiente: {formatCurrency(selectedVenta.saldoPendiente)}</p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Cobro</label>
                                <select 
                                    value={metodoCobro} 
                                    onChange={(e) => setMetodoCobro(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 font-bold outline-none focus:border-indigo-500 appearance-none"
                                >
                                    <option value="Efectivo">💵 Efectivo (Suma a Caja)</option>
                                    <option value="Transferencia">🏦 Transferencia Bancaria</option>
                                    <option value="Cheque">📄 Cheque</option>
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button variant="secondary" onClick={() => { setSelectedVenta(null); setMontoCobro(''); }} className="flex-1 py-4">CANCELAR</Button>
                                <Button 
                                    disabled={isSaving || !montoCobro} 
                                    onClick={handleRegistrarCobro}
                                    className="flex-[2] py-4 shadow-indigo-200 shadow-xl"
                                >
                                    {isSaving ? 'REGISTRANDO...' : 'CONFIRMAR COBRO'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ClienteDetalle;