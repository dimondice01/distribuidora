import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js';
import { collection, onSnapshot, orderBy, query, getDocs, doc, runTransaction, Timestamp, updateDoc, increment, addDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

// --- Iconos SVG ---
const PlusIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
const PrintIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width={12} height={8}/></svg>;
const DollarSignIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const BarChartIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>;
const TrashIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const EditIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const BarcodeIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M16 5v14"/><path d="M21 5v14"/></svg>;
const XIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0,00');

const calculateTotalCosto = (items) => (items || []).reduce((total, item) => total + ((item.costo || 0) * (item.quantity || 0)), 0);
const calculateTotalComision = (items = []) => {
    return items.reduce((total, item) => {
        const itemTotal = (item.precio || 0) * (item.quantity || 0);
        const itemComision = itemTotal * ((item.comision || 0) / 100);
        return total + itemComision;
    }, 0);
};
const calculateTotalNetProfit = (venta) => {
    const totalVenta = venta.totalVenta || 0;
    const totalCosto = calculateTotalCosto(venta.items);
    const totalComision = calculateTotalComision(venta.items);
    return totalVenta - totalCosto - totalComision;
};

const printInvoicePDF = (venta, clientDetails, zonaNombre) => {
    const fechaImpresion = venta.fecha instanceof Timestamp ? venta.fecha.toDate() : new Date();
    const itemsHtml = (venta.items || []).map(item => `
        <tr class="item"><td>${item.nombre}</td><td class="text-center">${item.quantity}</td><td class="text-right">${formatCurrency(item.precio)}</td><td class="text-right">${formatCurrency(item.quantity * item.precio)}</td></tr>
        ${item.promoAplicada ? `<tr class="promotion"><td colspan="4"><span class="promo-tag">Promo Aplicada:</span> ${item.promoAplicada}</td></tr>` : ''}
    `).join('');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>Factura #${venta.numeroFactura || venta.id.substring(0,8)}</title><style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; font-size: 12px; color: #333; } .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,.15); border-radius: 8px; } h1, h2, h3 { margin: 0; } .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; } .header .company-details { text-align: left; } .header .invoice-details { text-align: right; } .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; } .details-table th, .details-table td { padding: 10px; border-bottom: 1px solid #eee; } .details-table thead th { background-color: #f7f7f7; font-weight: 600; text-transform: uppercase; font-size: 11px; color: #555; } .text-right { text-align: right; } .text-center { text-align: center; } .totals-table { width: 40%; margin-left: 60%; margin-top: 20px; } .totals-table td { padding: 8px; } .totals-table .total { font-size: 1.2em; font-weight: bold; border-top: 2px solid #333; } .client-info { margin-top: 30px; padding: 15px; background-color: #f7f7f7; border-radius: 5px; } .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #888; } .promotion { font-size: 11px; color: #555; background-color: #f0fff4; } .promo-tag { font-weight: bold; color: #10B981; }
        </style></head><body><div class="invoice-box">
            <div class="header"><div class="company-details"><h1>Tu Distribuidora</h1><p>Dirección, Ciudad<br>Teléfono</p></div><div class="invoice-details"><h2>FACTURA</h2><p><strong>Nº:</strong> ${venta.numeroFactura || venta.id.substring(0, 8)}<br><strong>Fecha:</strong> ${fechaImpresion.toLocaleDateString('es-AR')}<br><strong>Vendedor:</strong> ${venta.vendedorNombre}</p></div></div>
            <div class="client-info"><strong>Cliente:</strong> ${venta.clienteNombre}<br><strong>Dirección:</strong> ${clientDetails.direccion || 'N/A'}<br><strong>Teléfono:</strong> ${clientDetails.telefono || 'N/A'} | <strong>CUIT/DNI:</strong> ${clientDetails.cuit || clientDetails.dni || 'N/A'}<br><strong>Zona:</strong> ${zonaNombre}</div>
            <table class="details-table"><thead><tr><th>Producto</th><th class="text-center">Cant.</th><th class="text-right">P. Unit.</th><th class="text-right">Subtotal</th></tr></thead><tbody>${itemsHtml}</tbody></table>
            <table class="totals-table"><tr class="total"><td>TOTAL</td><td class="text-right">${formatCurrency(venta.totalVenta)}</td></tr></table>
            <div class="footer">Gracias por su compra. El estado de esta factura es: <strong>${venta.estado}</strong>.</div>
        </div></body></html>`);
    printWindow.document.close();
    printWindow.print();
};

const CollectSaleModal = ({ total, onConfirm, onClose }) => {
    const [pagoEfectivo, setPagoEfectivo] = useState('');
    const [pagoTransferencia, setPagoTransferencia] = useState('');
    const [error, setError] = useState('');
    const handleConfirm = () => { const efectivo = parseFloat(pagoEfectivo) || 0; const transferencia = parseFloat(pagoTransferencia) || 0; if (efectivo + transferencia > total) { setError('El pago no puede superar el total.'); return; } onConfirm({ pagoEfectivo: efectivo, pagoTransferencia: transferencia }); };
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 animate-fade-in-scale"><div className="w-full max-w-md p-6 bg-white rounded-xl shadow-2xl"><h3 className="text-xl font-bold text-gray-800 mb-4">Registrar Cobro Inmediato</h3><p className="text-lg mb-4">Total: <span className="font-bold">{formatCurrency(total)}</span></p><div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Efectivo</label><input type="number" step="0.01" value={pagoEfectivo} onChange={(e) => setPagoEfectivo(e.target.value)} className="w-full px-3 py-2 border rounded-md" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Transferencia</label><input type="number" step="0.01" value={pagoTransferencia} onChange={(e) => setPagoTransferencia(e.target.value)} className="w-full px-3 py-2 border rounded-md" /></div></div>{error && <p className="mt-4 text-sm text-red-600">{error}</p>}<div className="flex justify-end pt-6 space-x-3"><button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button><button type="button" onClick={handleConfirm} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700">Confirmar</button></div></div></div>;
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
    const [newInvoice, setNewInvoice] = useState({ vendedorId: '', clienteId: '', items: [] });
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('Todos');
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [editingInvoice, setEditingInvoice] = useState(null);
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
            setVentas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), fecha: doc.data().fecha.toDate() })));
        }, (err) => { console.error("Error cargando ventas:", err); toast.error("Error al cargar ventas."); });

        const fetchInitialData = async () => {
            try {
                const [productsSnap, vendorsSnap, categoriesSnap, clientsSnap, zonasSnap] = await Promise.all([
                    getDocs(collection(db, 'productos')), getDocs(collection(db, 'vendedores')),
                    getDocs(collection(db, 'categorias')), getDocs(collection(db, 'clientes')), getDocs(collection(db, 'zonas')),
                ]);
                setProductos(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setVendedores(vendorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setCategorias(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setClientes(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setZonas(zonasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) { setError("No se pudieron cargar datos esenciales."); }
        };
        fetchInitialData();
        return () => unsubscribe();
    }, []);
    
    const filteredClients = useMemo(() => {
        if (!clientSearchTerm) return clientes;
        const term = clientSearchTerm.toLowerCase();
        return clientes.filter(c => (c.nombre || c.nombreCompleto || '').toLowerCase().includes(term));
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

    const handleAddItem = (product, quantity) => {
        setError('');
        const numQuantity = parseInt(quantity, 10);
        if (isNaN(numQuantity) || numQuantity <= 0) return;
        const existingItem = newInvoice.items.find(item => item.productId === product.id);
        if (existingItem) {
            setNewInvoice(prev => ({ ...prev, items: prev.items.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + numQuantity } : item) }));
        } else {
            const category = categorias.find(cat => cat.id === product.categoriaId);
            const effectiveCommission = product.comisionEspecifica ?? (category?.comisionGeneral ?? 0);
            setNewInvoice(prev => ({ ...prev, items: [...prev.items, { productId: product.id, nombre: product.nombre, precio: product.precio, costo: product.costo, comision: effectiveCommission, quantity: numQuantity }] }));
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
            setNewInvoice(prev => ({ ...prev, items: prev.items.map(item => item.productId === productId ? { ...item, quantity: numQuantity } : item) }));
        }
    };

    const calculateTotal = () => newInvoice.items.reduce((total, item) => total + ((item.precio || 0) * (item.quantity || 0)), 0);
    const resetForm = () => { setNewInvoice({ vendedorId: '', clienteId: '', items: [] }); setEditingInvoice(null); setError(''); setProductSearch(''); setClientSearchTerm(''); };
    const handleOpenModalForCreate = () => { resetForm(); setIsModalOpen(true); };
    const handleClientChange = (e) => {
        const client = clientes.find(c => c.id === e.target.value);
        setNewInvoice(prev => ({ ...prev, clienteId: client?.id || '', clienteNombre: client?.nombre || client?.nombreCompleto || '' }));
    };

    const handleSaveInvoice = async (paymentData = null) => {
        if (!newInvoice.vendedorId) {
            setError('Debes seleccionar un vendedor.');
            toast.error('Debes seleccionar un vendedor.');
            return;
        }
        if (newInvoice.items.length === 0) {
            setError('El carrito no puede estar vacío.');
            toast.error('El carrito no puede estar vacío.');
            return;
        }
    
        const vendedor = vendedores.find(v => v.id === newInvoice.vendedorId);
        if (!vendedor) {
            setError('Vendedor no válido.');
            toast.error('Vendedor no válido.');
            return;
        }
        
        const totalVenta = calculateTotal();
        let finalSaleData = {
            ...newInvoice,
            vendedorNombre: vendedor.nombreCompleto,
            fecha: Timestamp.now(),
            totalVenta,
            estado: 'Pendiente de Pago',
            totalCosto: calculateTotalCosto(newInvoice.items),
            totalComision: calculateTotalComision(newInvoice.items),
            pagoEfectivo: 0,
            pagoTransferencia: 0,
            saldoPendiente: totalVenta,
            descuentoAplicado: 0, 
            promoDescription: null,
            totalVentaBruto: totalVenta,
            totalDescuento: 0,
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
            finalSaleData.saldoPendiente = finalSaleData.totalVenta - totalPagado;
            finalSaleData.estado = finalSaleData.saldoPendiente > 0.01 ? 'Adeuda' : 'Pagada';
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
                        throw new Error(`Stock insuficiente para ${item.nombre}.`);
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
            toast.success("Factura creada con éxito!");
    
        } catch (err) {
            console.error("Error al guardar la factura:", err);
            setError(err.message || 'No se pudo guardar la factura.');
            toast.error(err.message || 'No se pudo guardar la factura.');
        }
    };
    
    const handleDeleteInvoice = async (venta) => {
        if (!venta || !venta.id) return;
        try {
            await runTransaction(db, async (transaction) => {
                for (const item of (venta.items || [])) {
                    const productRef = doc(db, 'productos', item.productId);
                    transaction.update(productRef, { stock: increment(item.quantity) });
                }
                transaction.delete(doc(db, 'ventas', venta.id));
            });
            setInvoiceToDelete(null);
            toast.success('Factura eliminada con éxito.');
        } catch (err) { setError(`Error al eliminar: ${err.message}`); setInvoiceToDelete(null); toast.error('Error al eliminar la factura.'); }
    };
    
    const getZonaNombre = (zonaId) => zonas.find(z => z.id === zonaId)?.nombre || 'N/A';
    
    const printVentaFromList = (venta) => {
        const clientDetails = clientes.find(c => c.id === venta.clienteId) || {};
        const zonaNombre = getZonaNombre(venta.clienteZonaId || clientDetails.zonaId);
        printInvoicePDF(venta, clientDetails, zonaNombre);
    };

    return (
        <div className="p-4 bg-gray-50 rounded-lg min-h-screen animate-fade-in">
            <style>{`.animate-fade-in { animation: fadeIn 0.5s ease-out; } @keyframes fadeIn { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow flex items-center transition-transform hover:scale-105"><div className="bg-green-100 text-green-600 p-3 rounded-full mr-4"><DollarSignIcon/></div><div><p className="text-sm text-gray-500">Ventas del Día (Pagadas)</p><p className="text-2xl font-bold">{formatCurrency(metrics.salesToday)}</p></div></div>
                <div className="bg-white p-6 rounded-lg shadow flex items-center transition-transform hover:scale-105"><div className="bg-blue-100 text-blue-600 p-3 rounded-full mr-4"><DollarSignIcon/></div><div><p className="text-sm text-gray-500">Ventas del Mes (Pagadas)</p><p className="text-2xl font-bold">{formatCurrency(metrics.salesMonth)}</p></div></div>
                <div className="bg-white p-6 rounded-lg shadow flex items-center transition-transform hover:scale-105"><div className="bg-indigo-100 text-indigo-600 p-3 rounded-full mr-4"><BarChartIcon/></div><div><p className="text-sm text-gray-500">Ganancia Neta (Mes)</p><p className="text-2xl font-bold">{formatCurrency(metrics.netProfitMonth)}</p></div></div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-gray-700">Historial de Facturación</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-2 border rounded-md w-full sm:w-auto"/>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="p-2 border rounded-md">
                            <option>Todos</option><option>Pagada</option><option>Adeuda</option><option>Pendiente de Pago</option><option>Repartiendo</option><option>Anulada</option>
                        </select>
                        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="p-2 border rounded-md"/>
                        <button onClick={handleOpenModalForCreate} className="flex items-center gap-2 px-4 py-2 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 whitespace-nowrap"><PlusIcon/> Crear Factura</button>
                    </div>
                </div>
            
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                             <tr>
                                <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase"># Factura</th>
                                <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Fecha</th>
                                <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Cliente</th>
                                <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Vendedor</th>
                                <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Estado</th>
                                <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase">Total</th>
                                <th className="px-6 py-3 font-semibold text-right text-gray-600 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedVentas.map((venta) => {
                                const clienteNombre = venta.clienteNombre || (clientes.find(c => c.id === venta.clienteId)?.nombre);
                                const vendedorNombre = venta.vendedorNombre || (vendedores.find(v => v.id === venta.vendedorId)?.nombreCompleto);
                                return (
                                <tr key={venta.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono text-gray-600">#{venta.numeroFactura || venta.id.substring(0, 8)}</td>
                                    <td className="px-6 py-4 text-gray-800">{venta.fecha.toLocaleDateString('es-AR')}</td>
                                    <td className="px-6 py-4 text-gray-600">{clienteNombre}</td>
                                    <td className="px-6 py-4 text-gray-600">{vendedorNombre}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                                            venta.estado === 'Pagada' ? 'bg-green-100 text-green-800' : 
                                            venta.estado === 'Adeuda' ? 'bg-yellow-100 text-yellow-800' :
                                            venta.estado === 'Pendiente de Pago' ? 'bg-orange-100 text-orange-800' : 
                                            venta.estado === 'Repartiendo' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                                        }`}>{venta.estado}</span>
                                    </td>
                                    <td className="px-6 py-4 text-green-600 font-bold">{formatCurrency(venta.totalVenta)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => printVentaFromList(venta)} className="p-2 text-gray-500 hover:text-indigo-600" title="Imprimir/Exportar"><PrintIcon/></button>
                                        <button onClick={() => setInvoiceToDelete(venta)} className="p-2 text-gray-500 hover:text-red-600" title="Eliminar Factura"><TrashIcon/></button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Anterior</button>
                        <span className="text-sm text-gray-700">Página {currentPage} de {totalPages}</span>
                        <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Siguiente</button>
                    </div>
                )}
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                     <div className="w-full max-w-4xl p-6 bg-white rounded-lg shadow-xl overflow-hidden">
                        <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-medium text-gray-900">{editingInvoice ? 'Editar Factura' : 'Nueva Factura'}</h3><button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-gray-200"><XIcon/></button></div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <select value={newInvoice.vendedorId} onChange={(e) => setNewInvoice({...newInvoice, vendedorId: e.target.value})} className="w-full p-2 border rounded-md" required><option value="" disabled>Seleccionar Vendedor *</option>{vendedores.map(v => <option key={v.id} value={v.id}>{v.nombreCompleto}</option>)}</select>
                                <input type="text" placeholder="Buscar cliente por nombre..." value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} className="w-full p-2 border rounded-md"/>
                                <select value={newInvoice.clienteId} onChange={handleClientChange} className="w-full p-2 border rounded-md" size={filteredClients.length > 5 ? 5 : undefined}><option value="">-- Consumidor Final --</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre || c.nombreCompleto} ({c.dni || c.cuit})</option>)}</select>
                                <div className="p-2 border rounded-md min-h-[200px] flex flex-col"><h4 className="font-semibold mb-2">Carrito de Compra:</h4><div className="flex-grow space-y-2 overflow-y-auto">{newInvoice.items.length === 0 ? (<p className="text-gray-400 text-sm">Agrega productos.</p>) : (newInvoice.items.map((item) => (<div key={item.productId} className="flex justify-between items-center text-sm"><span className="flex-1 truncate pr-2">{item.nombre}</span><div className="flex items-center gap-2"><input type="number" value={item.quantity} onChange={(e) => handleCartQuantityChange(item.productId, e.target.value)} className="w-16 p-1 border rounded-md text-center" min="1" /><span>{formatCurrency(item.precio * item.quantity)}</span><button type="button" onClick={() => handleRemoveItemFromCart(item.productId)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon width={14} height={14}/></button></div></div>)))}</div><div className="mt-4 pt-2 border-t font-bold flex justify-between"><span>TOTAL:</span><span>{formatCurrency(calculateTotal())}</span></div></div>
                            </div>
                            <div className="border rounded-md p-2 flex flex-col max-h-[400px]">
                                <h4 className="font-semibold mb-2 text-center">Agregar Productos</h4>
                                <div className="p-1 flex gap-2 mb-2 sticky top-0 bg-white z-10"><input type="text" placeholder="Buscar producto..." className="w-full p-2 border rounded-md" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} /><button type="button" onClick={() => {}} className="p-2 border rounded-md hover:bg-gray-100" title="Escanear código de barras"><BarcodeIcon width={20} height={20} /></button></div>
                                <div className="overflow-y-auto">{filteredProducts.map(p => (<div key={p.id} onClick={() => { setProductForQuantity(p); setQuantityToAdd(1); }} className="p-2 mb-1 flex justify-between items-center hover:bg-indigo-100 cursor-pointer rounded-md"><span>{p.nombre}</span><span className="font-semibold text-green-600">{formatCurrency(p.precio)}</span></div>))}</div>
                            </div>
                        </div>
                        {error && <p className="col-span-1 md:col-span-2 text-sm text-red-600 bg-red-100 p-2 rounded-md mt-4">{error}</p>}
                        <div className="col-span-1 md:col-span-2 flex justify-end pt-4 space-x-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border rounded-md">Cancelar</button>
                            <button type="button" onClick={() => handleSaveInvoice()} className="px-4 py-2 text-white bg-gray-600 rounded-md">Guardar Pendiente</button>
                            <button type="button" onClick={() => setIsCollectModalOpen(true)} className="px-4 py-2 text-white bg-green-600 rounded-md">Finalizar y Cobrar</button>
                        </div>
                    </div>
                </div>
            )}
            {productForQuantity && ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"> <div className="w-full max-w-xs p-6 bg-white rounded-lg shadow-xl"><h3 className="text-lg font-medium text-gray-900">Agregar {productForQuantity.nombre}</h3><div className="mt-4"><label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Cantidad</label><input type="number" id="quantity" value={quantityToAdd} onChange={(e) => setQuantityToAdd(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm" autoFocus min="1" /></div><div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={() => setProductForQuantity(null)} className="px-4 py-2 bg-white border rounded-md">Cancelar</button><button type="button" onClick={() => { handleAddItem(productForQuantity, quantityToAdd); setProductForQuantity(null); }} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Agregar</button></div></div> </div> )}
            {isCollectModalOpen && ( <CollectSaleModal total={calculateTotal()} onClose={() => setIsCollectModalOpen(false)} onConfirm={(paymentData) => handleSaveInvoice(paymentData)} /> )}
            {invoiceToDelete && ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"> <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl"><h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3><p className="mt-2 text-sm text-gray-600">¿Estás seguro de que quieres eliminar la factura <strong>#{invoiceToDelete.numeroFactura}</strong>? Se devolverá el stock de los productos.</p><div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={() => setInvoiceToDelete(null)} className="px-4 py-2 bg-white border rounded-md">Cancelar</button><button type="button" onClick={() => handleDeleteInvoice(invoiceToDelete)} className="px-4 py-2 bg-red-600 text-white rounded-md">Eliminar</button></div></div> </div> )}
        </div>
    );
}

export default Facturacion;

