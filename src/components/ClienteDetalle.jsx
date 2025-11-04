// En: src/components/ClienteDetalle.jsx

import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase.js';
import { collection, doc, getDoc, query, where, onSnapshot } from 'firebase/firestore';

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

// --- Componente de la Barra de Progreso ---
const GoalProgressBar = ({ goalInfo }) => {
    const { rubro, totalSold, percentage } = goalInfo;

    // Si el cliente no tiene rubro, o la meta es 0, no mostramos nada.
    if (!rubro || !rubro.metaSemanal || rubro.metaSemanal <= 0) {
        return (
            <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700">Meta Semanal</h3>
                <p className="text-gray-500 mt-2">Este cliente no tiene un rubro o meta asignada.</p>
            </div>
        );
    }

    // Formateador de moneda
    const formatCurrency = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
                Meta Semanal ({rubro.nombre})
            </h3>
            
            <div className="flex justify-between items-end mb-1">
                <span className="text-3xl font-bold text-indigo-600">
                    {formatCurrency(totalSold)}
                </span>
                <span className="text-lg font-medium text-gray-500">
                    / {formatCurrency(rubro.metaSemanal)}
                </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                    className="bg-indigo-600 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <p className="text-right text-gray-600 mt-1 font-medium">{Math.round(percentage)}% completado</p>
        </div>
    );
};


// --- Componente Principal del Detalle ---
function ClienteDetalle({ clienteId, onBack }) {
    const [cliente, setCliente] = useState(null);
    const [ventas, setVentas] = useState([]);
    const [rubro, setRubro] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Cargar datos del cliente y su rubro
    useEffect(() => {
        if (!clienteId) return;

        setLoading(true);
        const clienteRef = doc(db, 'clientes', clienteId);
        
        const getClientData = async () => {
            const docSnap = await getDoc(clienteRef);
            if (docSnap.exists()) {
                const clienteData = docSnap.data();
                setCliente({ id: docSnap.id, ...clienteData });

                // Si el cliente tiene un rubroId, buscamos ese rubro
                if (clienteData.rubroId) {
                    const rubroRef = doc(db, 'rubros', clienteData.rubroId);
                    const rubroSnap = await getDoc(rubroRef);
                    if (rubroSnap.exists()) {
                        setRubro({ id: rubroSnap.id, ...rubroSnap.data() });
                    } else {
                        console.warn("El rubro asignado no fue encontrado.");
                        setRubro(null);
                    }
                } else {
                    setRubro(null); // El cliente no tiene rubro
                }
            } else {
                console.error("No se encontró el cliente!");
                setCliente(null);
            }
        };

        getClientData();

    }, [clienteId]);

    // 2. Cargar ventas del cliente (en tiempo real)
    useEffect(() => {
        if (!clienteId) return;

        const ventasQuery = query(
            collection(db, 'ventas'), 
            where('clienteId', '==', clienteId)
        );

        const unsubscribe = onSnapshot(ventasQuery, (snapshot) => {
            const ventasData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Ordenamos por fecha, más nuevas primero
            ventasData.sort((a, b) => b.fecha.toDate() - a.fecha.toDate());
            setVentas(ventasData);
            setLoading(false);
        });

        return () => unsubscribe(); // Limpiamos el listener al salir

    }, [clienteId]);

    // 3. Calcular la meta (usando useMemo para eficiencia)
    const weeklyGoalInfo = useMemo(() => {
        if (!rubro || !ventas) {
            return { rubro: null, totalSold: 0, percentage: 0 };
        }

        const metaSemanal = rubro.metaSemanal || 0;
        const lastMonday = getMonday(new Date());

        const salesThisWeek = ventas.filter(sale => {
            if (sale.estado === 'Anulada') return false;
            const saleDate = sale.fecha.toDate();
            return saleDate >= lastMonday;
        });

        const totalSoldThisWeek = salesThisWeek.reduce((sum, sale) => sum + sale.totalVenta, 0);
        const percentage = (metaSemanal > 0) ? (totalSoldThisWeek / metaSemanal) * 100 : 0;
        
        return {
            rubro: rubro,
            totalSold: totalSoldThisWeek,
            percentage: Math.min(100, Math.max(0, percentage)), 
        };
    }, [rubro, ventas]);

    // Formateadores
    const formatCurrency = (value) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return timestamp.toDate().toLocaleDateString('es-AR');
    };

    if (loading) {
        return <div className="p-6">Cargando detalle del cliente...</div>;
    }

    if (!cliente) {
        return <div className="p-6">Error: No se pudo cargar el cliente.</div>;
    }

    return (
        <div className="p-6 h-full overflow-y-auto">
            {/* --- Botón de Volver --- */}
            <button
                onClick={onBack}
                className="mb-6 bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition"
            >
                &larr; Volver a Clientes
            </button>

            {/* --- Info del Cliente y Widget de Meta --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Columna de Info */}
                <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">{cliente.nombre}</h2>
                    <div className="space-y-2">
                        <p className="text-gray-600"><span className="font-semibold">Dirección:</span> {cliente.direccion || 'N/A'}</p>
                        <p className="text-gray-600"><span className="font-semibold">Barrio:</span> {cliente.barrio || 'N/A'}</p>
                        <p className="text-gray-600"><span className="font-semibold">Localidad:</span> {cliente.localidad || 'N/A'}</p>
                        <p className="text-gray-600"><span className="font-semibold">Teléfono:</span> {cliente.telefono || 'N/A'}</p>
                        <p className="text-gray-600"><span className="font-semibold">Email:</span> {cliente.email || 'N/A'}</p>
                        <p className="text-gray-600"><span className="font-semibold">DNI:</span> {cliente.dni || 'N/A'}</p>
                        <p className="text-gray-600"><span className="font-semibold">Rubro:</span> {rubro ? rubro.nombre : 'Sin rubro'}</p>
                    </div>
                </div>
                
                {/* Columna de Meta */}
                <div className="md:col-span-1">
                    <GoalProgressBar goalInfo={weeklyGoalInfo} />
                </div>
            </div>

            {/* --- Historial de Facturas --- */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Historial de Compras</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold">Fecha</th>
                                <th className="p-4 font-semibold">Estado</th>
                                <th className="p-4 font-semibold">Tipo</th>
                                <th className="p-4 font-semibold text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-4 text-center text-gray-500">
                                        No se encontraron ventas para este cliente.
                                    </td>
                                </tr>
                            ) : (
                                ventas.map((venta) => (
                                    <tr key={venta.id} className="border-b hover:bg-gray-50">
                                        <td className="p-4">{formatDate(venta.fecha)}</td>
                                        <td className="p-4">
                                            <span 
                                                className={`px-2 py-1 rounded-full text-xs font-medium
                                                    ${venta.estado === 'Pagada' ? 'bg-green-100 text-green-800' : ''}
                                                    ${venta.estado === 'Adeuda' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                    ${venta.estado === 'Anulada' ? 'bg-red-100 text-red-800' : ''}
                                                    ${venta.estado === 'Pendiente de Entrega' ? 'bg-blue-100 text-blue-800' : ''}
                                                `}
                                            >
                                                {venta.estado}
                                            </span>
                                        </td>
                                        <td className="p-4 capitalize">{venta.tipo || 'Venta'}</td>
                                        <td className="p-4 text-right font-medium">{formatCurrency(venta.totalVenta)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ClienteDetalle;