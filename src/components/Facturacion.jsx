import React, { useState, useEffect, useMemo, useRef } from 'react';
// Importamos 'app' además de 'db'
import { db, app } from '../firebase.js'; 
import { collection, onSnapshot, orderBy, query, getDocs, doc, runTransaction, Timestamp, updateDoc, increment, addDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import Button from './Button'; // Asegúrate de la ruta correcta
// Importamos las funciones de la Nube
import { getFunctions as getFunctionsFromApp, httpsCallable } from 'firebase/functions'; 

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
const BarcodeIcon = () => <Icono path="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" d2="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />;
const XIcon = () => <Icono path="M6 18L18 6M6 6l12 12" />;
const SearchIcon = () => <Icono path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />;
const CheckIcon = () => <Icono path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;

const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

// Función helper para calcular costo desde items (solo usada al CREAR o si falta el total)
const calculateTotalCostoFromItems = (items) => (items || []).reduce((total, item) => total + ((item.costo || 0) * (item.quantity || 0)), 0);

// Función helper para calcular comisión desde items
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

const printInvoicePDF = (venta, clientDetails, zonaNombre) => {
    const fechaImpresion = venta.fecha instanceof Timestamp ? venta.fecha.toDate() : (venta.fecha || new Date()); 
    const itemsHtml = (venta.items || []).map(item => `
        <tr class="item"><td>${item.nombre}</td><td class="text-center">${item.quantity}</td><td class="text-right">${formatCurrency(item.precio)}</td><td class="text-right">${formatCurrency(item.quantity * item.precio)}</td></tr>
        ${item.promoAplicada ? `<tr class="promotion"><td colspan="4"><span class="promo-tag">Promo Aplicada:</span> ${item.promoAplicada}</td></tr>` : ''}
    `).join('');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>Factura #${venta.numeroFactura || venta.id.substring(0,8)}</title><style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; font-size: 12px; color: #333; } .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,.15); border-radius: 8px; } h1, h2, h3 { margin: 0; } .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; } .header .company-details { text-align: left; } .header .invoice-details { text-align: right; } .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; } .details-table th, .details-table td { padding: 10px; border-bottom: 1px solid #eee; } .details-table thead th { background-color: #f7f7f7; font-weight: 600; text-transform: uppercase; font-size: 11px; color: #555; } .text-right { text-align: right; } .text-center { text-align: center; } .totals-table { width: 40%; margin-left: 60%; margin-top: 20px; } .totals-table td { padding: 8px; } .totals-table .total { font-size: 1.2em; font-weight: bold; border-top: 2px solid #333; } .client-info { margin-top: 30px; padding: 15px; background-color: #f7f7f7; border-radius: 5px; } .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #888; } .promotion { font-size: 11px; color: #555; background-color: #f0fff4; } .promo-tag { font-weight: bold; color: #10B981; }
        </style></head><body><div class="invoice-box">
            <div class="header"><div class="company-details"><h1>Tu Distribuidora</h1><p>Dirección, Ciudad<br>Teléfono</p></div><div class="invoice-details"><h2>FACTURA</h2><p><strong>Nº:</strong> ${venta.numeroFactura || venta.id.substring(0, 8)}<br><strong>Fecha:</strong> ${fechaImpresion.toLocaleDateString('es-AR')}<br><strong>Vendedor:</strong> ${venta.vendedorNombre || 'N/A'}</p></div></div>
            <div class="client-info"><strong>Cliente:</strong> ${venta.clienteNombre || 'Consumidor Final'}<br><strong>Dirección:</strong> ${clientDetails.direccion || 'N/A'}<br><strong>Teléfono:</strong> ${clientDetails.telefono || 'N/A'} | <strong>CUIT/DNI:</strong> ${clientDetails.cuit || clientDetails.dni || 'N/A'}<br><strong>Zona:</strong> ${zonaNombre}</div>
            <table class="details-table"><thead><tr><th>Producto</th><th class="text-center">Cant.</th><th class="text-right">P. Unit.</th><th class="text-right">Subtotal</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <table class="totals-table"><tr class="total"><td>TOTAL</td><td class="text-right">${formatCurrency(venta.totalVenta)}</td></tr></table>
            ${venta.observaciones ? `<div class="mt-4 p-3 border rounded-md text-sm bg-gray-50"><strong>Observaciones:</strong> ${venta.observaciones}</div>` : ''}
            <div class="footer">Gracias por su compra. El estado de esta factura es: <strong>${venta.estado}</strong>.</div>
        </div></body></html>`);
    printWindow.document.close();
    printWindow.print();
};

const CollectSaleModal = ({ total, onConfirm, onClose }) => {
    const [pagoEfectivo, setPagoEfectivo] = useState('');
    const [pagoTransferencia, setPagoTransferencia] = useState('');
    const [error, setError] = useState('');
    const totalPagado = (parseFloat(pagoEfectivo) || 0) + (parseFloat(pagoTransferencia) || 0);
    const saldoPendiente = total - totalPagado;

    const handleConfirm = () => { 
        if (totalPagado > total + 0.01) { 
            setError('El pago no puede superar el total.'); return; 
        } 
        onConfirm({ 
            pagoEfectivo: parseFloat(pagoEfectivo) || 0, 
            pagoTransferencia: parseFloat(pagoTransferencia) || 0 
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
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Efectivo</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                            <input type="number" step="0.01" value={pagoEfectivo} onChange={(e) => { setPagoEfectivo(e.target.value); setError(''); }} className="w-full pl-7 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-green-500 outline-none" placeholder="0.00" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Transferencia</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                            <input type="number" step="0.01" value={pagoTransferencia} onChange={(e) => { setPagoTransferencia(e.target.value); setError(''); }} className="w-full pl-7 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
                        </div>
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
    const [ventas, setVentas] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
    const [productos, setProductos] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [categorias, setCategorias] = useState([]); 
    const [clientes, setClientes] = useState([]);
    const [zonas, setZonas] = useState([]);
    const [priceLists, setPriceLists] = useState([]); // Listas de precios
    
    // ESTADO PRINCIPAL DE NUEVA FACTURA
    const [newInvoice, setNewInvoice] = useState({ vendedorId: '', clienteId: '', items: [], observaciones: '', listaPreciosId: '' });
    
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    
    // Modal selección producto
    const [productForQuantity, setProductForQuantity] = useState(null);
    const [quantityToAdd, setQuantityToAdd] = useState(1);
    const [productSearch, setProductSearch] = useState('');
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [filterDate, setFilterDate] = useState('');
    const [clientSearchTerm, setClientSearchTerm] = useState(''); 

    useEffect(() => {
        const q = query(collection(db, 'ventas'), orderBy('fecha', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(), 
                fecha: doc.data().fecha.toDate() 
            }));
            
            // --- FILTRO VISUAL: SOLO VENTAS ---
            // Excluimos cobros, cobranzas, rendiciones.
            // Solo mostramos lo que sea una VENTA explícita o devoluciones.
            // Si no tiene tipo, asumimos venta (legacy).
            const cleanDocs = docs.filter(d => {
                if (!d.tipo) return true; // Legacy (probablemente venta)
                return !['cobro', 'cobranza', 'rendicion', 'rendicion_vendedor', 'rendicion_cobranza'].includes(d.tipo);
            });

            setVentas(cleanDocs);
        }, (err) => { console.error("Error ventas:", err); toast.error("Error al cargar ventas."); });

        const fetchInitialData = async () => {
            try {
                const [productsSnap, vendorsSnap, categoriesSnap, clientsSnap, zonasSnap, listsSnap] = await Promise.all([
                    getDocs(collection(db, 'productos')), getDocs(collection(db, 'vendedores')),
                    getDocs(collection(db, 'categorias')), getDocs(collection(db, 'clientes')), getDocs(collection(db, 'zonas')), getDocs(collection(db, 'listas_precios'))
                ]);
                setProductos(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setVendedores(vendorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setCategorias(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setClientes(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setZonas(zonasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setPriceLists(listsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) { setError("Error cargando datos maestros."); }
        };
        fetchInitialData();
        return () => unsubscribe();
    }, []);
    
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
        
        // 1. Determinar precio según lista
        let finalPrice = product.precio;
        if (newInvoice.listaPreciosId && product.preciosExtra) {
             if (product.preciosExtra[newInvoice.listaPreciosId]) {
                 finalPrice = Number(product.preciosExtra[newInvoice.listaPreciosId]);
             } else {
                 const matchingKey = Object.keys(product.preciosExtra).find(key => key.toLowerCase() === newInvoice.listaPreciosId.toLowerCase());
                 if (matchingKey) finalPrice = Number(product.preciosExtra[matchingKey]);
             }
        }

        // 2. Calcular comisión EN MONTO ($)
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
                costo: product.costo, 
                quantity: numQuantity,
                comision: totalComisionLinea, 
                _metaComisionPorcentaje: porcentajeComision 
            }] }));
        }
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
    const resetForm = () => { setNewInvoice({ vendedorId: '', clienteId: '', items: [], observaciones: '', listaPreciosId: '' }); setError(''); setProductSearch(''); setClientSearchTerm(''); };
    const handleOpenModalForCreate = () => { resetForm(); setIsModalOpen(true); };
    
    const handleClientChange = (e) => {
        const client = clientes.find(c => c.id === e.target.value);
        if (!client) return;

        const listaAsignada = client.listaPreciosAsignada || '';

        setNewInvoice(prev => ({ 
            ...prev, 
            clienteId: client.id, 
            clienteNombre: client.nombre || client.nombreCompleto || 'Cliente Sin Nombre', 
            listaPreciosId: listaAsignada,
            items: [] 
        }));
        if(listaAsignada) toast.info(`Lista de precios "${listaAsignada}" aplicada.`);
    };

    const handleSaveInvoice = async (paymentData = null) => {
        if (!newInvoice.vendedorId) { setError('Seleccione un vendedor.'); return; }
        if (newInvoice.items.length === 0) { setError('Carrito vacío.'); return; }
    
        const vendedor = vendedores.find(v => v.id === newInvoice.vendedorId);
        
        const totalVenta = calculateTotal();
        let finalSaleData = {
            ...newInvoice,
            tipo: 'venta', // ✅ IMPORTANTE: MARCAMOS COMO VENTA EXPLÍCITA
            vendedorNombre: vendedor?.nombreCompleto || 'N/A',
            fecha: Timestamp.now(),
            totalVenta,
            estado: 'Adeuda', 
            totalCosto: calculateTotalCostoFromItems(newInvoice.items),
            totalComision: calculateTotalComisionFromItems(newInvoice.items), 
            pagoEfectivo: 0,
            pagoTransferencia: 0,
            saldoPendiente: totalVenta,
            descuentoAplicado: 0, 
            totalVentaBruto: totalVenta,
            totalDescuento: 0,
            observaciones: newInvoice.observaciones || '', 
            paymentMethod: 'cuenta_corriente'
        };
        
        finalSaleData.totalNetProfit = finalSaleData.totalVenta - finalSaleData.totalCosto - finalSaleData.totalComision;
    
        const clienteSeleccionado = clientes.find(c => c.id === newInvoice.clienteId);
        finalSaleData.clienteNombre = clienteSeleccionado?.nombre || clienteSeleccionado?.nombreCompleto || 'Consumidor Final';
        finalSaleData.clienteId = clienteSeleccionado?.id || '';
        finalSaleData.clienteZonaId = clienteSeleccionado?.zonaId || '';
    
        if (paymentData) {
            const { pagoEfectivo, pagoTransferencia } = paymentData;
            const totalPagado = pagoEfectivo + pagoTransferencia;
            finalSaleData.pagoEfectivo = pagoEfectivo;
            finalSaleData.pagoTransferencia = pagoTransferencia;
            finalSaleData.saldoPendiente = totalVenta - totalPagado;
            finalSaleData.estado = finalSaleData.saldoPendiente > 0.01 ? 'Adeuda' : 'Pagada';
            finalSaleData.paymentMethod = finalSaleData.saldoPendiente <= 0.01 ? 'contado' : 'cuenta_corriente'; 
        }
    
        const newSaleRef = doc(collection(db, "ventas"));
        try {
            await runTransaction(db, async (transaction) => {
                const productReads = finalSaleData.items.map(item => {
                    const productRef = doc(db, 'productos', item.productId);
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
                    const productRef = doc(db, 'productos', item.productId);
                    transaction.update(productRef, { stock: increment(-item.quantity) });
                });
                transaction.set(newSaleRef, finalSaleData);
            });
            
            const clientDetails = clientes.find(c => c.id === finalSaleData.clienteId) || {};
            const zonaNombre = getZonaNombre(clientDetails.zonaId);
            printInvoicePDF({ ...finalSaleData, id: newSaleRef.id, fecha: new Date() }, clientDetails, zonaNombre);
    
            setIsModalOpen(false);
            setIsCollectModalOpen(false);
            resetForm();
            toast.success("Factura guardada correctamente.");
        } catch (err) {
            console.error(err);
            setError(err.message);
            toast.error(err.message);
        }
    };
    
    const handleDeleteInvoice = async (venta) => {
        if (!venta || !venta.id) return;
        if (!window.confirm(`¿Eliminar factura #${venta.numeroFactura || venta.id.substring(0,8)}? Se repondrá el stock.`)) return;

        try {
            await runTransaction(db, async (transaction) => {
                for (const item of (venta.items || []).filter(i => i.productId)) { 
                    const productRef = doc(db, 'productos', item.productId);
                    transaction.update(productRef, { stock: increment(item.quantity) });
                }
                transaction.delete(doc(db, 'ventas', venta.id));
            });
            toast.success('Factura anulada y stock repuesto.');
        } catch (err) { 
            console.error(err);
            toast.error(`Error al eliminar: ${err.message}`); 
        }
    };

    // --- NUEVA FUNCIÓN: RESET TOTAL ---
    const handleDeleteAllInvoices = async () => {
        if (!window.confirm("⚠️ PELIGRO: ¿Estás seguro de BORRAR TODAS las facturas? Esto restaurará el stock de cada venta y reiniciará las métricas. Esta acción no se puede deshacer.")) return;
        
        try {
            const salesSnapshot = await getDocs(collection(db, 'ventas'));
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
                        const productRef = doc(db, 'productos', item.productId);
                        transaction.update(productRef, { stock: increment(item.quantity) });
                    }
                    // Borrar venta
                    transaction.delete(doc(db, 'ventas', sale.id));
                });
                count++;
            }
            toast.success(`Se eliminaron ${count} facturas y se restauró el stock.`);
        } catch (error) {
            console.error("Error borrando todo:", error);
            toast.error("Hubo un error en la eliminación masiva.");
        }
    };
    
    const getZonaNombre = (zonaId) => zonas.find(z => z.id === zonaId)?.nombre || 'N/A';
    
    const printVentaFromList = (venta) => {
        const clientDetails = clientes.find(c => c.id === venta.clienteId) || {};
        const zonaNombre = getZonaNombre(venta.clienteZonaId || clientDetails.zonaId);
        const robustClienteNombre = venta.clienteNombre || clientDetails.nombre || clientDetails.nombreCompleto || 'Consumidor Final';
        const robustVendedorNombre = venta.vendedorNombre || vendedores.find(v => v.id === venta.vendedorId)?.nombreCompleto || 'N/A';
        const saleToPrint = { ...venta, clienteNombre: robustClienteNombre, vendedorNombre: robustVendedorNombre };
        printInvoicePDF(saleToPrint, clientDetails, zonaNombre);
    };

    // --- RENDERIZADO UI PREMIUM ---
    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans animate-fade-in">
            <style>{`.animate-fade-in { animation: fadeIn 0.5s ease-out; } @keyframes fadeIn { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
            
            {/* KPI CARDS CORREGIDOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                    { 
                        title: 'Ventas Hoy', 
                        val: metrics.salesToday, 
                        icon: DollarSignIcon, 
                        color: 'green', 
                        sub: 'Cobrado efectivo/transf' 
                    },
                    { 
                        title: 'Ventas Mes', 
                        val: metrics.salesMonth, 
                        icon: BarChartIcon, 
                        color: 'blue', 
                        sub: 'Facturación Bruta' 
                    },
                    { 
                        title: 'Ganancia Real', 
                        val: metrics.netProfitMonth, 
                        icon: DollarSignIcon, 
                        color: 'indigo', 
                        sub: 'Ventas - (Costos + Comisiones)' 
                    }
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

            {/* MAIN CONTAINER */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* TOOLBAR */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-800">Historial de Operaciones</h2>
                    <div className="flex flex-wrap items-center gap-3">
                        
                        {/* BOTÓN RESET PARA TESTING */}
                        <button onClick={handleDeleteAllInvoices} className="px-3 py-2 bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors flex items-center gap-2 shadow-sm">
                            <TrashIcon className="w-4 h-4"/> RESET TOTAL
                        </button>

                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors"><SearchIcon /></span>
                            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none w-40 md:w-60 transition-all"/>
                        </div>
                        
                        {/* FILTROS CORREGIDOS */}
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                            <option>Todos</option>
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

                {/* TABLA MODERNIZADA */}
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
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800">{formatCurrency(venta.totalVenta)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => printVentaFromList(venta)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"><PrintIcon/></button>
                                            <button onClick={() => handleDeleteInvoice(venta)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon/></button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                
                {/* PAGINACIÓN */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex justify-center gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50">Anterior</button>
                        <span className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg">{currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 disabled:opacity-50">Siguiente</button>
                    </div>
                )}
            </div>

            {/* --- MODAL NUEVA VENTA (DISEÑO SPLIT) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200">
                        
                        {/* IZQUIERDA: DATOS Y CARRITO (60%) */}
                        <div className="w-full md:w-[60%] flex flex-col h-full border-r border-slate-100">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="text-xl font-extrabold text-slate-800">Nueva Operación</h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 text-slate-400"><XIcon/></button>
                            </div>
                            
                            <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Vendedor</label>
                                        <select value={newInvoice.vendedorId} onChange={(e) => setNewInvoice({...newInvoice, vendedorId: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                                            <option value="">Seleccionar...</option>
                                            {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombreCompleto}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-1">
                                         <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cliente</label>
                                         <input type="text" placeholder="Buscar..." value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} className="w-full mb-2 px-3 py-1.5 bg-slate-50 border-none rounded-lg text-xs"/>
                                         <select value={newInvoice.clienteId} onChange={handleClientChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" size={3}>
                                            <option value="">-- Consumidor Final --</option>
                                            {filteredClients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                        </select>
                                        {newInvoice.listaPreciosId && <span className="text-[10px] text-amber-600 font-bold mt-1 block">⭐ Lista Aplicada: {newInvoice.listaPreciosId}</span>}
                                    </div>
                                    <div className="col-span-2">
                                        <textarea placeholder="Observaciones..." value={newInvoice.observaciones} onChange={(e) => setNewInvoice({...newInvoice, observaciones: e.target.value})} rows="2" className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
                                    </div>
                                </div>

                                {/* CARRITO */}
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
                            
                            {/* FOOTER IZQUIERDO: TOTALES */}
                            <div className="p-6 bg-white border-t border-slate-100 z-10">
                                <div className="flex justify-between items-end mb-4">
                                    <span className="text-sm font-bold text-slate-500">Total a Pagar</span>
                                    <span className="text-4xl font-extrabold text-slate-900">{formatCurrency(calculateTotal())}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => handleSaveInvoice()} className="py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                                        Guardar (Cta. Cte.)
                                    </button>
                                    <button onClick={() => setIsCollectModalOpen(true)} className="py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                                        Cobrar Ahora
                                    </button>
                                </div>
                                {error && <p className="mt-2 text-center text-xs font-bold text-red-500">{error}</p>}
                            </div>
                        </div>

                        {/* DERECHA: SELECTOR PRODUCTOS (40%) */}
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

            {/* MODAL CANTIDAD RAPIDA */}
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
        </div>
    );
}

export default Facturacion;