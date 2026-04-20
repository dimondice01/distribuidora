import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useFirestore } from '../hooks/useFirestore';
import { useShift } from '../contexts/ShiftContext';
import { toast } from 'react-toastify';
import Button from './Button';

const ProveedorCtaCte = ({ proveedor, onBack }) => {
    const { tenantId, getTenantCollection, getTenantDoc, updateTenantDoc } = useFirestore();
    const { activeShift } = useShift();
    const [compras, setCompras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pendientes'); // 'todas', 'pendientes', 'pagadas'
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [montoPago, setMontoPago] = useState('');
    const [metodoPago, setMetodoPago] = useState('Efectivo');
    const [isSaving, setIsSaving] = useState(false);

    const { onTenantSnapshot } = useFirestore();

    useEffect(() => {
        if (!tenantId || !proveedor.id) return;
        const unsub = onTenantSnapshot('compras', (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCompras(data.filter(c => c.proveedorId === proveedor.id));
            setLoading(false);
        }, [{ field: 'fecha', direction: 'desc' }]);
        return unsub;
    }, [tenantId, proveedor.id]);

    const filtered = compras.filter(c => {
        if (filter === 'pagadas') return c.saldo <= 0;
        if (filter === 'pendientes') return c.saldo > 0;
        return true;
    });

    const totalDeuda = compras.reduce((sum, c) => sum + (c.saldo || 0), 0);

    const handleRegistrarPago = async () => {
        const monto = parseFloat(montoPago);
        if (!selectedInvoice || !monto || monto <= 0) return toast.error("Ingresa un monto válido");
        if (monto > selectedInvoice.saldo) return toast.error("El pago no puede superar el saldo pendiente");

        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const compraRef = getTenantDoc('compras', selectedInvoice.id);
            const nuevoSaldo = selectedInvoice.saldo - monto;

            // 1. Actualizar Factura
            batch.update(compraRef, {
                saldo: nuevoSaldo,
                estado: nuevoSaldo <= 0 ? 'PAGADA' : 'PARCIAL',
                lastUpdate: serverTimestamp()
            });

            // 2. Registrar Pago
            const pagoRef = doc(getTenantCollection('pagos_proveedores'));
            batch.set(pagoRef, {
                companyId: tenantId,
                compraId: selectedInvoice.id,
                proveedorId: proveedor.id,
                monto: monto,
                metodoPago: metodoPago,
                fecha: serverTimestamp(),
                detalle: `Pago parcial Factura ${selectedInvoice.nroFactura || 'S/N'}`
            });

            // 3. Si es efectivo, registrar en gastos para la caja
            if (metodoPago === 'Efectivo') {
                const gastoRef = doc(getTenantCollection('gastos'));
                batch.set(gastoRef, {
                    companyId: tenantId,
                    monto: monto,
                    detalle: `Pago a Proveedor: ${proveedor.nombre} (Fact. ${selectedInvoice.nroFactura || 'S/N'})`,
                    metodoPago: 'Efectivo',
                    fechaGasto: serverTimestamp(),
                    tipo: 'pago_proveedor',
                    compraId: selectedInvoice.id,
                    shiftId: activeShift?.id || null,
                    userId: activeShift?.userId || null
                });
            }

            await batch.commit();
            toast.success("Pago registrado correctamente");
            setSelectedInvoice(null);
            setMontoPago('');
        } catch (err) {
            console.error(err);
            toast.error("Error al registrar el pago");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-fade-in max-w-6xl mx-auto flex flex-col h-[90vh]">
            <header className="bg-indigo-600 p-8 text-white flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h3 className="text-2xl font-black tracking-tight">Cuenta Corriente (Proveedor)</h3>
                        <p className="text-indigo-100 font-bold uppercase text-[10px] tracking-widest mt-1">{proveedor.nombre}</p>
                    </div>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20 text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Deuda Total Acumulada</p>
                    <p className="text-3xl font-black">${totalDeuda.toLocaleString('es-AR')}</p>
                </div>
            </header>

            <div className="p-8 flex-1 flex flex-col overflow-hidden gap-6">
                {/* Filtros */}
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-2xl border border-slate-100 w-fit">
                    <button onClick={() => setFilter('pendientes')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${filter === 'pendientes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>PENDIENTES</button>
                    <button onClick={() => setFilter('pagadas')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${filter === 'pagadas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>SALDADAS</button>
                    <button onClick={() => setFilter('todas')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${filter === 'todas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>TODAS</button>
                </div>

                {/* Grid de Facturas */}
                <div className="flex-1 overflow-y-auto border border-slate-100 rounded-[2rem] shadow-inner bg-slate-50/50">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white shadow-sm z-10">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Factura Nº</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Total</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Pendiente</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Estado</th>
                                <th className="px-6 py-4 border-b border-slate-100"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center text-slate-400 font-bold italic">No se encontraron facturas con este filtro.</td>
                                </tr>
                            ) : (
                                filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-white transition-colors group">
                                        <td className="px-6 py-5 text-sm font-bold text-slate-500">{c.fecha?.toDate().toLocaleDateString()}</td>
                                        <td className="px-6 py-5 font-black text-slate-800">{c.nroFactura || 'Sin Numero'}</td>
                                        <td className="px-6 py-5 text-right font-black text-slate-700">${c.total.toLocaleString('es-AR')}</td>
                                        <td className="px-6 py-5 text-right font-black text-rose-500">${c.saldo.toLocaleString('es-AR')}</td>
                                        <td className="px-6 py-5">
                                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${c.saldo <= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                {c.saldo <= 0 ? 'Saldada' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {c.saldo > 0 && (
                                                <button 
                                                    onClick={() => setSelectedInvoice(c)}
                                                    className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black hover:bg-black transition-all"
                                                >
                                                    PAGAR
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Pago Parcial */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in shadow-2xl">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 p-8">
                        <header className="text-center mb-8">
                            <h4 className="text-xl font-black text-slate-800">Registrar Pago de Factura</h4>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Factura Nº {selectedInvoice.nroFactura || 'S/N'}</p>
                        </header>
                        
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto a Entregar</p>
                                <div className="relative max-w-xs mx-auto">
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl">$</span>
                                    <input 
                                        type="number" 
                                        className="w-full pl-6 bg-transparent text-center font-black text-slate-900 outline-none border-b-4 border-indigo-200 focus:border-indigo-600 text-4xl" 
                                        placeholder="0.00"
                                        value={montoPago}
                                        onChange={(e) => setMontoPago(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold mt-4">Saldo Pendiente: ${selectedInvoice.saldo.toLocaleString('es-AR')}</p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Pago</label>
                                <select 
                                    value={metodoPago} 
                                    onChange={(e) => setMetodoPago(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 font-bold outline-none focus:border-indigo-500"
                                >
                                    <option value="Efectivo">💵 Efectivo (Restar de Caja)</option>
                                    <option value="Transferencia">🏦 Transferencia Bancaria</option>
                                    <option value="Cheque">📄 Cheque</option>
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button variant="secondary" onClick={() => setSelectedInvoice(null)} className="flex-1 py-4">CANCELAR</Button>
                                <Button 
                                    disabled={isSaving || !montoPago} 
                                    onClick={handleRegistrarPago}
                                    className="flex-[2] py-4 shadow-indigo-200 shadow-xl"
                                >
                                    {isSaving ? 'REGISTRANDO...' : 'CONFIRMAR PAGO'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProveedorCtaCte;
