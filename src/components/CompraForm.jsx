import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import { useFirestore } from '../hooks/useFirestore';
import { useShift } from '../contexts/ShiftContext';
import { toast } from 'react-toastify';
import Button from './Button';

const CompraForm = ({ proveedor, onCancel, onSuccess }) => {
    const { tenantId, addTenantDoc, getTenantCollection, getTenantDoc } = useFirestore();
    const { activeShift } = useShift();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [items, setItems] = useState([]);
    const [pagoInicial, setPagoInicial] = useState(0);
    const [metodoPago, setMetodoPago] = useState('Efectivo');
    const [isSaving, setIsSaving] = useState(false);
    const [nroFactura, setNroFactura] = useState('');
    const [otrosImpuestos, setOtrosImpuestos] = useState('');
    const searchInputRef = useRef(null);

    // 1. Buscador de productos para añadir a la grilla
    useEffect(() => {
        if (searchTerm.length < 2) {
            setSearchResults([]);
            return;
        }
        const search = async () => {
            const q = query(
                getTenantCollection('productos'),
                where('nombre', '>=', searchTerm),
                where('nombre', '<=', searchTerm + '\uf8ff')
            );
            const snap = await getDocs(q);
            setSearchResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        const timeout = setTimeout(search, 300);
        return () => clearTimeout(timeout);
    }, [searchTerm, tenantId]);

    const addItem = (product) => {
        if (items.find(i => i.id === product.id)) {
            toast.warning("El producto ya está en la lista.");
            return;
        }
        
        // Calculamos margen inicial basado en costo y precio actual
        const currentCosto = product.costo || 0;
        const currentPrecio = product.precio || 0;
        const currentMargin = currentCosto > 0 ? ((currentPrecio / currentCosto) - 1) * 100 : 0;

        const newItem = {
            id: product.id,
            nombre: product.nombre,
            cantidad: 1,
            costo: currentCosto,
            margen: currentMargin.toFixed(2),
            precioVenta: currentPrecio,
            costoAnterior: currentCosto,
            stockAnterior: product.stock || 0
        };
        setItems([newItem, ...items]); 
        setSearchTerm('');
        setSearchResults([]);
        if (searchInputRef.current) searchInputRef.current.focus();
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        const item = { ...newItems[index] };
        
        const numVal = parseFloat(value) || 0;
        item[field] = value; 

        // LÓGICA DE CÁLCULO BIDIRECCIONAL
        if (field === 'costo' || field === 'margen') {
            const c = field === 'costo' ? numVal : parseFloat(item.costo) || 0;
            const m = field === 'margen' ? numVal : parseFloat(item.margen) || 0;
            if (c > 0) {
                item.precioVenta = (c * (1 + m / 100)).toFixed(2);
            }
        } else if (field === 'precioVenta') {
            const c = parseFloat(item.costo) || 0;
            const p = numVal;
            if (c > 0) {
                item.margen = (((p / c) - 1) * 100).toFixed(2);
            }
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

    const baseTotalCompra = items.reduce((sum, item) => sum + (parseFloat(item.costo) || 0) * (parseFloat(item.cantidad) || 0), 0);
    const totalCompra = baseTotalCompra * (1 + (parseFloat(otrosImpuestos) || 0) / 100);
    const saldoPendiente = totalCompra - parseFloat(pagoInicial || 0);

    const handleConfirm = async () => {
        if (items.length === 0) return toast.error("La lista está vacía.");
        setIsSaving(true);

        try {
            const batch = writeBatch(db);
            const itemsProcessed = [];

            // A. Actualizar cada producto
            const factorImpuesto = 1 + (parseFloat(otrosImpuestos) || 0) / 100;
            
            for (const item of items) {
                const productRef = getTenantDoc('productos', item.id);
                const nuevaCantidad = parseFloat(item.cantidad) || 0;
                
                const baseCosto = parseFloat(item.costo) || 0;
                const nuevoCosto = baseCosto * factorImpuesto;
                
                const margenDecimal = (parseFloat(item.margen) || 0) / 100;
                const nuevoPrecio = nuevoCosto * (1 + margenDecimal);

                batch.update(productRef, {
                    stock: increment(nuevaCantidad),
                    costo: Number(nuevoCosto.toFixed(2)),
                    precio: Number(nuevoPrecio.toFixed(2)),
                    lastUpdate: serverTimestamp()
                });

                itemsProcessed.push({
                    id: item.id,
                    nombre: item.nombre,
                    cantidad: nuevaCantidad,
                    costo: Number(nuevoCosto.toFixed(2)),
                    costoBase: baseCosto,
                    subtotal: nuevoCosto * nuevaCantidad
                });
            }

            // B. Crear Registro de Compra
            const compraRef = doc(getTenantCollection('compras'));
            const compraData = {
                companyId: tenantId,
                proveedorId: proveedor.id,
                proveedorNombre: proveedor.nombre,
                nroFactura: nroFactura,
                total: totalCompra,
                otrosImpuestosPorcentaje: parseFloat(otrosImpuestos) || 0,
                pagoInicial: parseFloat(pagoInicial) || 0,
                saldo: saldoPendiente,
                items: itemsProcessed,
                fecha: serverTimestamp(),
                estado: saldoPendiente <= 0 ? 'PAGADA' : (pagoInicial > 0 ? 'PARCIAL' : 'PENDIENTE')
            };
            batch.set(compraRef, compraData);

            // C. Si hubo pago inicial, registrar pago y gasto
            if (parseFloat(pagoInicial) > 0) {
                const pagoRef = doc(getTenantCollection('pagos_proveedores'));
                batch.set(pagoRef, {
                    companyId: tenantId,
                    compraId: compraRef.id,
                    proveedorId: proveedor.id,
                    monto: parseFloat(pagoInicial),
                    metodoPago: metodoPago,
                    fecha: serverTimestamp(),
                    detalle: `Pago inicial factura ${nroFactura || 'S/N'}`
                });

                if (metodoPago === 'Efectivo') {
                    const gastoRef = doc(getTenantCollection('gastos'));
                    batch.set(gastoRef, {
                        companyId: tenantId,
                        monto: parseFloat(pagoInicial),
                        detalle: `Pago Proveedor: ${proveedor.nombre} (Fact. ${nroFactura || 'S/N'})`,
                        metodoPago: 'Efectivo',
                        fechaGasto: serverTimestamp(),
                        tipo: 'pago_proveedor',
                        compraId: compraRef.id,
                        shiftId: activeShift?.id || null,
                        userId: activeShift?.userId || null
                    });
                }
            }

            await batch.commit();
            toast.success("¡Compra registrada y stock actualizado!");
            onSuccess();
        } catch (err) {
            console.error(err);
            toast.error("Error al registrar la compra.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-fade-in max-w-6xl mx-auto flex flex-col h-[90vh]">
            <header className="bg-slate-900 p-8 text-white flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black tracking-tight">Registar Factura de Compra</h3>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Proveedor: {proveedor.nombre} • {proveedor.cuit || 'Sin CUIT'}</p>
                </div>
                <div className="flex gap-4">
                    <input 
                        type="text" 
                        placeholder="Nº Factura..." 
                        value={nroFactura} 
                        onChange={(e) => setNroFactura(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 font-bold text-sm outline-none focus:bg-white/20 transition-all placeholder:text-white/30"
                    />
                    <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col p-8 overflow-hidden gap-8">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="Buscar producto a ingresar (Nombre o Código)..." 
                        className="w-full pl-14 pr-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-lg font-bold text-slate-800 focus:border-indigo-400 focus:bg-white outline-none transition-all shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    
                    {searchResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-[2rem] shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in slide-in-from-top-2">
                            {searchResults.map(p => (
                                <button 
                                    key={p.id} 
                                    onClick={() => addItem(p)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-indigo-50 border-b border-slate-50 transition-colors last:border-0"
                                >
                                    <div className="text-left">
                                        <p className="font-black text-slate-800">{p.nombre}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Stock Actual: {p.stock} • Costo: ${p.costo}</p>
                                    </div>
                                    <div className="text-indigo-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-2 mb-2">
                    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 shadow-sm">
                        <label className="text-xs font-black text-indigo-800 uppercase tracking-widest">+ Otros Impuestos %</label>
                        <input 
                            type="number" 
                            step="0.1" 
                            min="0"
                            placeholder="0.0"
                            value={otrosImpuestos}
                            onChange={(e) => setOtrosImpuestos(e.target.value)}
                            className="w-20 px-3 py-1.5 bg-white border border-indigo-200 rounded-lg font-black text-indigo-700 outline-none focus:border-indigo-500 text-right"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto border border-slate-100 rounded-[2rem] shadow-inner bg-slate-50/50 relative">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10 bg-white shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 italic">Producto</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 italic">Cant.</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 italic">Costo U.</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 italic">Mgn (%)</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 italic">P. Venta</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 italic text-right">Subtotal</th>
                                <th className="px-6 py-4 border-b border-slate-100"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-transparent">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center text-slate-400 font-bold italic opacity-40">La lista está vacía. Añade productos arriba para empezar.</td>
                                </tr>
                            ) : (
                                items.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-white transition-colors group">
                                        <td className="px-6 py-5">
                                            <p className="font-black text-slate-800">{item.nombre}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Anterior: ${item.costoAnterior} • Stock: {item.stockAnterior}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <input 
                                                type="number" 
                                                className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-slate-700 outline-none focus:border-indigo-500 transition-all font-sans" 
                                                value={item.cantidad} 
                                                onChange={(e) => updateItem(idx, 'cantidad', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-6 py-5">
                                            <input 
                                                type="number" 
                                                className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-slate-700 outline-none focus:border-indigo-500 transition-all font-sans" 
                                                value={item.costo} 
                                                onChange={(e) => updateItem(idx, 'costo', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-6 py-5">
                                            <input 
                                                type="number" 
                                                className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl font-black text-slate-700 outline-none focus:border-indigo-500 transition-all font-sans" 
                                                value={item.margen} 
                                                onChange={(e) => updateItem(idx, 'margen', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-6 py-5 text-indigo-600">
                                            <input 
                                                type="number" 
                                                className="w-24 px-3 py-2 bg-white border border-indigo-200 rounded-xl font-black text-indigo-700 outline-none focus:border-indigo-500 transition-all font-sans" 
                                                value={item.precioVenta} 
                                                onChange={(e) => updateItem(idx, 'precioVenta', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-6 py-5 text-right font-black text-slate-900">
                                            ${((parseFloat(item.costo) || 0) * (parseFloat(item.cantidad) || 0)).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-5 text-right w-10">
                                            <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <footer className="bg-slate-50 p-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl z-20">
                <div className="flex flex-wrap items-center gap-8">
                    <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200 text-center min-w-[140px]">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto de Pago</p>
                        <div className="relative">
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                            <input 
                                type="number" 
                                className="pl-4 w-24 bg-transparent font-black text-slate-900 outline-none border-b-2 border-indigo-200 focus:border-indigo-600 text-xl font-sans" 
                                value={pagoInicial}
                                onChange={(e) => setPagoInicial(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200 text-center min-w-[140px]">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Medio de Pago</p>
                        <select 
                            className="bg-transparent font-black text-slate-700 outline-none text-md cursor-pointer"
                            value={metodoPago}
                            onChange={(e) => setMetodoPago(e.target.value)}
                        >
                            <option value="Efectivo">💵 Efectivo</option>
                            <option value="Transferencia">🏦 Transferencia</option>
                            <option value="Cheque">📄 Cheque</option>
                        </select>
                    </div>

                    <div className="h-12 w-px bg-slate-200 hidden md:block"></div>

                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Factura {parseFloat(otrosImpuestos) > 0 ? '(C/ Impuestos)' : ''}</p>
                        <p className="text-4xl font-black text-slate-900">${totalCompra.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                        {saldoPendiente > 0 && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">Saldo a Deuda: ${saldoPendiente.toLocaleString('es-AR')}</p>}
                    </div>
                </div>

                <div className="flex gap-4">
                    <Button variant="secondary" onClick={onCancel} className="px-10 py-5">CANCELAR</Button>
                    <Button 
                        disabled={isSaving || items.length === 0} 
                        onClick={handleConfirm} 
                        className="px-12 py-5 shadow-indigo-200 shadow-xl"
                    >
                        {isSaving ? 'REGISTRANDO...' : 'PROCESAR COMPRA'}
                    </Button>
                </div>
            </footer>
        </div>
    );
};

export default CompraForm;
