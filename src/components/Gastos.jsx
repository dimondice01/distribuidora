import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js'; 
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import Button from './Button'; 
import { useFirestore } from '../hooks/useFirestore';
// --- Iconos SVG ---
const PlusIcon = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
const EditIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const DeleteIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const MoneyOff = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2c2 0 3-1 3-3s-1-3-3-3"/><path d="M13 5.5V1.5"/><path d="M13 22.5V18.5"/></svg>;
const Calendar = (props) => <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;

const formatCurrency = (value) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00');

function Gastos() {
    const [gastos, setGastos] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // --- CORRECCIÓN 1: Se añade 'metodoPago' al estado inicial del formulario ---
    const [formData, setFormData] = useState({ detalle: '', monto: 0, fechaGasto: '', metodoPago: 'Efectivo' });
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expenseToDelete, setExpenseToDelete] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15); 
    const [filterStartDate, setFilterStartDate] = useState(''); 
    const [filterEndDate, setFilterEndDate] = useState('');     

    const { tenantId, onTenantSnapshot, addTenantDoc, updateTenantDoc, deleteTenantDoc } = useFirestore();

    useEffect(() => {
        if (!tenantId) {
            setGastos([]);
            return;
        }
        const unsubscribe = onTenantSnapshot('gastos', (snapshot) => {
            setGastos(snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                fecha: doc.data().fechaGasto ? doc.data().fechaGasto.toDate() : new Date()
            })));
        }, [{ field: 'fechaGasto', direction: 'desc' }]);
        return () => unsubscribe();
    }, [tenantId]);

    const filteredAndAggregatedData = useMemo(() => {
        let filtered = gastos;
        if (searchTerm) {
            filtered = filtered.filter(g => (g.detalle || '').toLowerCase().includes(searchTerm.toLowerCase()));
        }
        const start = filterStartDate ? new Date(filterStartDate) : null;
        const end = filterEndDate ? new Date(filterEndDate) : null;
        if (start) { start.setUTCHours(0, 0, 0, 0); filtered = filtered.filter(g => g.fecha >= start); }
        if (end) { end.setUTCHours(23, 59, 59, 999); filtered = filtered.filter(g => g.fecha <= end); }
        
        const totalGastado = filtered.reduce((sum, g) => sum + (Number(g.monto) || 0), 0);
        
        const totalPages = Math.ceil(filtered.length / itemsPerPage);
        const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        
        return { totalGastado, totalPages, paginated };
    }, [gastos, searchTerm, filterStartDate, filterEndDate, currentPage, itemsPerPage]);

    const openModal = (expense = null) => {
        if (expense) {
            setEditingExpenseId(expense.id);
            const dateStr = expense.fecha ? new Date(expense.fecha.getTime() - (expense.fecha.getTimezoneOffset() * 60000)).toISOString().split('T')[0] : '';
            setFormData({ detalle: expense.detalle, monto: expense.monto, fechaGasto: dateStr, metodoPago: expense.metodoPago || 'Efectivo' });
        } else {
            setEditingExpenseId(null);
            setFormData({ detalle: '', monto: '', fechaGasto: new Date().toISOString().split('T')[0], metodoPago: 'Efectivo' });
        }
        setError('');
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.detalle || !formData.monto || !formData.fechaGasto || !formData.metodoPago) {
            setError("Por favor, completa todos los campos obligatorios.");
            return;
        }
        
        // --- CORRECCIÓN 2: Se añade 'metodoPago' al objeto que se guarda ---
        const expenseData = {
            detalle: formData.detalle.trim(),
            monto: Number(formData.monto),
            fechaGasto: Timestamp.fromDate(new Date(formData.fechaGasto)),
            metodoPago: formData.metodoPago,
        };

        try {
            if (editingExpenseId) {
                await updateTenantDoc('gastos', editingExpenseId, expenseData);
            } else {
                await addTenantDoc('gastos', expenseData);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error("Error al guardar el gasto:", err);
            setError("No se pudo guardar el gasto.");
        }
    };

    const handleDelete = async () => {
        try {
            await deleteTenantDoc('gastos', expenseToDelete.id);
            setExpenseToDelete(null);
        } catch (error) {
            console.error("Error al eliminar gasto:", error);
            setError("Error al eliminar el gasto.");
            setExpenseToDelete(null);
        }
    };
    
    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStartDate, filterEndDate]);

    return (
        <div className="p-4 bg-gray-50 rounded-lg min-h-screen">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center border-b pb-3">
                <MoneyOff className="w-6 h-6 mr-2 text-red-500" /> Control de Gastos Operacionales
            </h2>
            
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4 bg-white p-6 rounded-xl shadow">
                <div className="flex items-center space-x-4">
                    <div className="text-sm font-medium text-gray-600">Total Gastado en el período:</div>
                    <div className="text-3xl font-bold text-red-600">{formatCurrency(filteredAndAggregatedData.totalGastado)}</div>
                </div>
                <button onClick={() => openModal()} className="px-4 py-2 font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transition-all flex items-center">
                    <PlusIcon className="w-4 h-4 mr-1"/>Registrar Nuevo Gasto
                </button>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-lg mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[150px]"><label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Detalle</label><input type="text" placeholder="Buscar detalle..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                 <div className="flex-1 min-w-[150px]"><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Calendar className="mr-1"/> Fecha Inicio</label><input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" /></div>
                <div className="flex-1 min-w-[150px]"><label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><Calendar className="mr-1"/> Fecha Fin</label><input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" /></div>
                <button onClick={() => { setSearchTerm(''); setFilterStartDate(''); setFilterEndDate(''); setCurrentPage(1); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Limpiar</button>
            </div>
            
            {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded-md mb-4">{error}</p>}

            <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase w-1/6">Fecha</th>
                            <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase w-2/5">Detalle</th>
                            {/* --- CORRECCIÓN 3: Se añade columna de Método de Pago --- */}
                            <th className="px-6 py-3 font-semibold text-left text-gray-600 uppercase w-1/6">Método de Pago</th>
                            <th className="px-6 py-3 font-semibold text-right text-gray-600 uppercase w-1/6">Monto</th>
                            <th className="px-6 py-3 font-semibold text-center text-gray-600 uppercase w-1/6">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAndAggregatedData.paginated.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500 italic">No se encontraron gastos.</td></tr>
                        ) : (
                            filteredAndAggregatedData.paginated.map((expense) => (
                                <tr key={expense.id} className="hover:bg-red-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-gray-600">{expense.fecha.toLocaleDateString('es-AR')}</td>
                                    <td className="px-6 py-4 text-gray-800">{expense.detalle}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${expense.metodoPago === 'Efectivo' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {expense.metodoPago || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-red-600">{formatCurrency(expense.monto)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center space-x-4">
                                            <button onClick={() => openModal(expense)} className="text-blue-500 hover:text-blue-700"><EditIcon /></button>
                                            <button onClick={() => setExpenseToDelete(expense)} className="text-red-500 hover:text-red-700"><DeleteIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {filteredAndAggregatedData.totalPages > 1 && (
                <div className="flex justify-center items-center mt-4 space-x-4">
                    <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50">&larr; Anterior</button>
                    <span className="text-sm text-gray-700">Página {currentPage} de {filteredAndAggregatedData.totalPages}</span>
                    <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === filteredAndAggregatedData.totalPages} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50">Siguiente &rarr;</button>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in-scale">
                    <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">{editingExpenseId ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div><label htmlFor="detalle" className="block text-sm font-medium text-gray-700 mb-1">Detalle *</label><input id="detalle" type="text" value={formData.detalle} onChange={(e) => setFormData({ ...formData, detalle: e.target.value })} className="w-full px-4 py-2 border rounded-md" required/></div>
                            <div><label htmlFor="monto" className="block text-sm font-medium text-gray-700 mb-1">Monto ($) *</label><input id="monto" type="number" step="0.01" value={formData.monto} onChange={(e) => setFormData({ ...formData, monto: e.target.value })} className="w-full px-4 py-2 border rounded-md" required/></div>
                            <div><label htmlFor="fechaGasto" className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label><input id="fechaGasto" type="date" value={formData.fechaGasto} onChange={(e) => setFormData({ ...formData, fechaGasto: e.target.value })} className="w-full px-4 py-2 border rounded-md" required/></div>
                            {/* --- CORRECCIÓN 1: Se añade el selector de método de pago --- */}
                            <div>
                                <label htmlFor="metodoPago" className="block text-sm font-medium text-gray-700 mb-1">Método de Pago *</label>
                                <select id="metodoPago" value={formData.metodoPago} onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })} className="w-full px-4 py-2 border rounded-md bg-white" required>
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Transferencia">Transferencia</option>
                                </select>
                            </div>
                            {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg border border-red-200">{error}</p>}
                            <div className="flex justify-end pt-4 space-x-3"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700">{editingExpenseId ? 'Actualizar' : 'Registrar'}</button></div>
                        </form>
                    </div>
                </div>
            )}
            
            {expenseToDelete && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
                        <p className="mt-2 text-sm text-gray-600">¿Seguro que quieres eliminar el gasto de <strong>{formatCurrency(expenseToDelete.monto)}</strong> ({expenseToDelete.detalle})?</p>
                        <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={() => setExpenseToDelete(null)} className="px-4 py-2 bg-white border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button><button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-600 border rounded-md text-sm font-medium text-white hover:bg-red-700">Eliminar</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Gastos;