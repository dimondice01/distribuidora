import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useFirestore } from '../../../hooks/useFirestore';
import { importProductsWithMapping } from '../../../services/ImportService';
import { db } from '../../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import { toast } from 'react-toastify';
import Button from '../../../components/Button';
import { useEffect } from 'react';

const ProductImporter = () => {
    const { tenantId } = useFirestore();
    const [columnSamples, setColumnSamples] = useState([]);
    const [rawData, setRawData] = useState([]);
    const [fileName, setFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [proveedores, setProveedores] = useState([]);
    const [globalProveedorId, setGlobalProveedorId] = useState('');
    const [isCreatingProv, setIsCreatingProv] = useState(false);
    const [newProvName, setNewProvName] = useState('');
    const [fallbackMargin, setFallbackMargin] = useState(0);
    
    // Mapeo inicial por ÍNDICE (0, 1, 2...)
    const [mapping, setMapping] = useState({
        nombre: '',
        precio: '',
        costo: '',
        categoria: '',
        marca: '',
        stock: '',
        codigo: '',
        proveedor: '',
        iva: '',
        costoConIva: ''
    });

    const { onTenantSnapshot, addTenantDoc } = useFirestore();

    useEffect(() => {
        if (!tenantId) return;
        const unsub = onTenantSnapshot('proveedores', (snap) => {
            setProveedores(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, [{ field: 'nombre', direction: 'asc' }]);
        return () => unsub();
    }, [tenantId]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            
            // LECTURA CRUDA: header: 1 devuelve un array de arrays
            const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
            
            if (jsonData.length > 0) {
                // Buscamos la primera fila con datos para obtener muestras
                const sampleRow = jsonData.find(row => row.length > 0 && row.some(v => v !== null && v !== '')) || jsonData[0];
                const samples = sampleRow.map((val, idx) => ({
                    index: idx,
                    example: val ? val.toString().substring(0, 20) : 'Vacío'
                }));

                setColumnSamples(samples);
                setRawData(jsonData);
                toast.info(`Archivo cargado: ${jsonData.length} filas detectadas.`);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleMappingChange = (field, value) => {
        setMapping(prev => ({ ...prev, [field]: value }));
    };

    const handleConfirmImport = async () => {
        if (!mapping.nombre || !mapping.precio) {
            toast.error("El Nombre y Precio son obligatorios para el mapeo.");
            return;
        }

        setIsUploading(true);
        try {
            const results = await importProductsWithMapping(rawData, mapping, tenantId, globalProveedorId, fallbackMargin);
            setImportResult(results); // Nuevo estado para mostrar el resumen
            toast.success("¡Importación completada con éxito!");
            setRawData([]);
            setFileName('');
        } catch (error) {
            console.error(error);
            toast.error("Fallo crítico en la importación.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleQuickCreateProv = async () => {
        if (!newProvName.trim()) return;
        try {
            const res = await addTenantDoc('proveedores', { 
                nombre: newProvName.trim(), 
                condicionIva: 'Responsable Inscripto', 
                createdAt: serverTimestamp() 
            });
            
            const newProv = { id: res.id, nombre: newProvName.trim() };
            // Actualización optimista para que el select lo reconozca de inmediato
            setProveedores(prev => [newProv, ...prev]);
            setGlobalProveedorId(res.id);
            
            setNewProvName('');
            setIsCreatingProv(false);
            toast.success(`Proveedor "${newProv.nombre}" creado y seleccionado.`);
        } catch (e) { 
            console.error(e); 
            toast.error("Error al crear proveedor rápido.");
        }
    };

    return (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-6xl mx-auto animate-fade-in">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Importador Inteligente de Catálogo</h3>
                    <p className="text-slate-500 font-medium mt-1">Sube tu planilla y mapea las columnas a tu gusto.</p>
                </div>
            </header>

            {importResult && (
                <div className="mb-8 p-10 bg-indigo-600 rounded-[3rem] text-white animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><ProviderIcon className="w-40 h-40" /></div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-black mb-2">¡Misión Cumplida! 🚀</h3>
                        <p className="text-indigo-100 font-medium mb-8">Los datos han sido procesados e inyectados en el sistema con éxito.</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/20">
                                <div className="text-4xl font-black mb-1">{importResult.productosCreados}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Productos Creados</div>
                            </div>
                            <div className="bg-amber-400 p-6 rounded-[2rem] text-amber-900 border border-amber-300">
                                <div className="text-4xl font-black mb-1">{importResult.proveedoresCreados}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Proveedores Nuevos</div>
                            </div>
                        </div>

                        <button onClick={() => setImportResult(null)} className="mt-8 px-8 py-3 bg-white text-indigo-600 font-black rounded-2xl hover:bg-indigo-50 transition-all">TERMINAR</button>
                    </div>
                </div>
            )}

            {!rawData.length ? (
                <div className="flex flex-col items-center justify-center border-4 border-dashed border-slate-100 rounded-[2.5rem] p-16 bg-slate-50/50 hover:bg-slate-50 transition-all group cursor-pointer relative">
                    <input type="file" onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="absolute inset-0 opacity-0 cursor-pointer" />
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-all border border-slate-100">
                        <svg className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </div>
                    <p className="text-slate-700 font-extrabold text-xl">Selecciona tu Excel de Productos</p>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mt-2 px-8 py-2 bg-white rounded-full">Soporta .XLSX, .XLS, .CSV</p>
                </div>
            ) : (
                <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                    
                    {/* PANEL DE PROVEEDOR GLOBAL (NUEVO) */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-500 flex-shrink-0">
                            <ProviderIcon className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-1">¿Cargar a un Proveedor específico?</h4>
                            <p className="text-xs text-indigo-400 font-medium leading-relaxed">Si tu Excel no tiene columna de proveedores, selecciona uno aquí para asignarlo a todo el lote.</p>
                        </div>
                        <div className="w-full md:w-auto flex items-center gap-2">
                            {isCreatingProv ? (
                                <div className="flex gap-2 animate-fade-in">
                                    <input type="text" placeholder="Nombre del Proveedor..." className="px-4 py-2 bg-white border border-indigo-200 rounded-xl text-sm font-bold outline-none" value={newProvName} onChange={(e) => setNewProvName(e.target.value)} autoFocus />
                                    <button onClick={handleQuickCreateProv} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700">OK</button>
                                    <button onClick={() => setIsCreatingProv(false)} className="px-3 py-2 bg-slate-200 text-slate-500 rounded-xl text-sm font-black">X</button>
                                </div>
                            ) : (
                                <>
                                    <select 
                                        className="w-full md:w-64 px-4 py-3 bg-white border border-indigo-200 rounded-2xl text-sm font-bold text-indigo-700 outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-sans"
                                        value={globalProveedorId}
                                        onChange={(e) => setGlobalProveedorId(e.target.value)}
                                    >
                                        <option value="">-- Usar Mapeo de Columna --</option>
                                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                    <button onClick={() => setIsCreatingProv(true)} className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl hover:bg-indigo-200 transition-all" title="Crear Nuevo Proveedor">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* CONFIGURACIÓN DE COSTO AUTOMÁTICO (NUEVO) */}
                    <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-amber-600 flex-shrink-0 font-black">
                            %
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-1">Cálculo Automático de Costos</h4>
                            <p className="text-[10px] text-amber-600 font-bold leading-relaxed">Si el Excel no tiene columna de "Costo", calcularemos uno restando este % al precio de venta.</p>
                        </div>
                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-amber-200">
                             <span className="text-xs font-black text-amber-800 uppercase">MARGEN:</span>
                             <input 
                                type="number" 
                                min="0" 
                                max="99" 
                                className="w-20 bg-transparent text-center font-black text-lg text-amber-600 outline-none"
                                value={fallbackMargin}
                                onChange={(e) => setFallbackMargin(parseFloat(e.target.value) || 0)}
                             />
                             <span className="text-lg font-black text-amber-400">%</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-inner">
                        <h4 className="col-span-full text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                             Mapeo de Columnas
                        </h4>
                        
                        <MappingSelect label="Nombre del Producto" field="nombre" samples={columnSamples} value={mapping.nombre} onChange={handleMappingChange} required />
                        <MappingSelect label="Precio de Venta" field="precio" samples={columnSamples} value={mapping.precio} onChange={handleMappingChange} required />
                        <MappingSelect label="Costo (Opcional)" field="costo" samples={columnSamples} value={mapping.costo} onChange={handleMappingChange} />
                        <MappingSelect label="Categoría" field="categoria" samples={columnSamples} value={mapping.categoria} onChange={handleMappingChange} />
                        <MappingSelect label="Marca" field="marca" samples={columnSamples} value={mapping.marca} onChange={handleMappingChange} />
                        <MappingSelect label="Stock Inicial" field="stock" samples={columnSamples} value={mapping.stock} onChange={handleMappingChange} />
                        <MappingSelect label="Código / SKU" field="codigo" samples={columnSamples} value={mapping.codigo} onChange={handleMappingChange} />
                        
                        <div className="col-span-full pt-4 border-t border-slate-100"><h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2">Datos de Proveedor e IVA</h4></div>
                        
                        <MappingSelect label="Proveedor" field="proveedor" samples={columnSamples} value={mapping.proveedor} onChange={handleMappingChange} />
                        <MappingSelect label="Alícuota IVA (%)" field="iva" samples={columnSamples} value={mapping.iva} onChange={handleMappingChange} />
                        <MappingSelect label="Costo Incluye IVA? (SI/NO)" field="costoConIva" samples={columnSamples} value={mapping.costoConIva} onChange={handleMappingChange} />
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-sm text-left">
                           <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-100 italic">
                               <tr>
                                   <th className="px-6 py-4">Ejemplo Mapped Data</th>
                                   <th className="px-6 py-4">Valor Raw</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                               {rawData.slice(0, 3).map((row, i) => (
                                   <tr key={i} className="hover:bg-slate-50 transition-colors">
                                       <td className="px-6 py-4">
                                           <div className="flex flex-col gap-1">
                                               <span className="font-black text-slate-800">{row[mapping.nombre] || "-"}</span>
                                               <span className="text-emerald-600 font-bold">${row[mapping.precio] || "0.00"}</span>
                                           </div>
                                       </td>
                                       <td className="px-6 py-4 text-slate-400 text-xs">Fila #{i+1}</td>
                                   </tr>
                               ))}
                           </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end pt-4">
                         <button 
                            onClick={handleConfirmImport}
                            disabled={isUploading || !mapping.nombre || !mapping.precio}
                            className={`
                                flex items-center gap-4 px-12 py-5 bg-slate-900 text-white font-black rounded-2xl shadow-2xl transition-all
                                ${isUploading ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:bg-black hover:-translate-y-2 active:scale-95'}
                            `}
                         >
                            {isUploading ? (
                                <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    IMPORTAR TODO EL CATÁLOGO
                                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-amber-400"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </>
                            )}
                         </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const MappingSelect = ({ label, field, samples, value, onChange, required }) => (
    <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1 ml-1 tracking-widest">
            {label} {required && <span className="text-rose-500" title="Obligatorio">*</span>}
        </label>
        <select 
            value={value} 
            onChange={(e) => onChange(field, e.target.value)}
            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-amber-400 transition-all shadow-sm"
        >
            <option value="">Ignorar esta columna</option>
            {samples.map((s, i) => (
                <option key={i} value={s.index}>
                    Columna {s.index + 1} - (Ej: "{s.example}")
                </option>
            ))}
        </select>
    </div>
);

const ProviderIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

export default ProductImporter;
