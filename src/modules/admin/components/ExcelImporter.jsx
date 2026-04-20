import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useFirestore } from '../../../hooks/useFirestore';
import { processImportData, clearTenantFullData } from '../../../services/ImportService';
import { toast } from 'react-toastify';

const ExcelImporter = () => {
    const { tenantId } = useFirestore();
    const [data, setData] = useState([]);
    const [fileName, setFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [stats, setStats] = useState(null);

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
            
            // 1. Obtener datos crudos (Array de Arrays)
            const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
            
            // 2. Buscar la fila que contiene la cabecera (EMPRESA o FECHA)
            const headerRowIndex = rawData.findIndex(row => 
                row && row.some(cell => 
                    cell && ['EMPRESA', 'CLIENTE', 'FECHA'].includes(cell.toString().trim().toUpperCase())
                )
            );

            if (headerRowIndex === -1) {
                toast.error("No se encontró la cabecera (EMPRESA, FECHA, etc) en el archivo.");
                return;
            }

            // 3. Extraer cabeceras y datos reales
            const headers = rawData[headerRowIndex].map(h => h ? h.toString().trim().toUpperCase() : `EMPTY_${Math.random()}`);
            const rows = rawData.slice(headerRowIndex + 1);

            // 4. Convertir a Array de Objetos usando las cabeceras encontradas
            const jsonData = rows.map(row => {
                const obj = {};
                headers.forEach((h, i) => {
                    obj[h] = row[i];
                });
                return obj;
            }).filter(row => Object.values(row).some(v => v !== null && v !== undefined && v !== ''));

            setData(jsonData.slice(0, 50)); // Preview
            setFullData(jsonData); // Guardamos todo para la subida
            toast.info(`Cargado: ${jsonData.length} registros`);
            setStats(null);
        };
        reader.readAsBinaryString(file);
    };

    const [fullData, setFullData] = useState([]); // Nuevo estado para no perder datos

    const handleConfirmImport = async () => {
        if (fullData.length === 0) return;
        setIsUploading(true);
        try {
            const results = await processImportData(fullData, tenantId);
            setStats(results);
            toast.success("¡Importación Finalizada!");
            setData([]);
        } catch (error) {
            console.error(error);
            toast.error("Fallo crítico en la importación.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleResetAssets = async () => {
        if (!window.confirm("¿Estás seguro de borrar TODOS los activos de prueba? Esta acción no se puede deshacer.")) return;
        setIsUploading(true);
        try {
            const count = await clearTenantFullData(tenantId);
            toast.info(`Sistema reseteado: ${count} registros eliminados.`);
            setStats(null);
            setData([]);
            setFullData([]);
            setFileName('');
        } catch (error) {
            console.error(error);
            toast.error("Error al limpiar activos.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-6xl mx-auto">
            <header className="mb-8 border-b border-gray-100 pb-6 flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Importador Masivo de Órdenes</h3>
                    <p className="text-slate-500 text-sm mt-1">Carga masiva de clientes y activos desde planillas Excel o CSV.</p>
                </div>
                <button 
                    onClick={handleResetAssets}
                    disabled={isUploading}
                    className={`
                        flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 transition-all
                        ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100 active:scale-95'}
                    `}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1-1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Limpiar Base de Datos (Pruebas)
                </button>
            </header>

            {/* Drag & Drop Area Placeholder */}
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-10 bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer relative">
                <input type="file" onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </div>
                <p className="text-slate-700 font-bold">{fileName || "Arrastrá tu archivo aquí o hacé click"}</p>
                <p className="text-slate-400 text-xs mt-2">Soporta: EXCEL (.xlsx) y CSV con columnas EMPRESA, DIRECCION, OBSERVACIONES.</p>
            </div>

            {/* Stats Summary */}
            {stats && (
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                    <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                        <p className="text-xs text-green-600 font-bold uppercase">Clientes</p>
                        <p className="text-2xl font-black text-green-800">{stats.clientesCreados}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <p className="text-xs text-blue-600 font-bold uppercase">Activos</p>
                        <p className="text-2xl font-black text-blue-800">{stats.activosCreados}</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <p className="text-xs text-amber-600 font-bold uppercase">Omitidos</p>
                        <p className="text-2xl font-black text-amber-800">{stats.filasOmitidas}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                        <p className="text-xs text-red-600 font-bold uppercase">Errores</p>
                        <p className="text-2xl font-black text-red-800">{stats.errores.length}</p>
                    </div>
                </div>
            )}

            {/* Preview Table */}
            {data.length > 0 && (
                <div className="mt-10 animate-fade-in">
                    <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center">
                        <span className="w-1.5 h-6 bg-amber-400 rounded-full mr-3"></span>
                        Vista Previa de Datos
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3">Empresa</th>
                                    <th className="px-5 py-3">Dirección</th>
                                    <th className="px-5 py-3">Fecha</th>
                                    <th className="px-5 py-3">Observaciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.map((row, index) => {
                                    // Normalización de llaves para preview flexible
                                    const keys = Object.keys(row);
                                    const getVal = (aliases) => {
                                        const key = keys.find(k => aliases.includes(k.trim().toUpperCase()));
                                        return key ? row[key] : null;
                                    };

                                    const empresa = getVal(['EMPRESA', 'CLIENTE', 'NOMBRE', 'RAZON SOCIAL']);
                                    const direccion = getVal(['DIRECCION', 'DOMICILIO', 'UBICACION', 'DIRECCIÓN']);
                                    const fecha = getVal(['FECHA', 'ULTIMO SERVICE', 'PROCESADO']);
                                    const observaciones = getVal(['OBSERVACIONES', 'OBSERVACONES', 'DETALLE', 'REQUISITO', 'NOTAS']);

                                    return (
                                        <tr key={index} className="hover:bg-slate-50 transition-colors text-xs">
                                            <td className="px-5 py-3 font-bold text-slate-800">{empresa || "N/A"}</td>
                                            <td className="px-5 py-3 text-slate-600">{direccion || "N/A"}</td>
                                            <td className="px-5 py-3 text-slate-500">{fecha || "N/A"}</td>
                                            <td className="px-5 py-3 italic text-slate-400 truncate max-w-[200px]">{observaciones || "-"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                     <div className="mt-8 flex justify-end gap-4">
                         <button 
                            onClick={handleConfirmImport}
                            disabled={isUploading}
                            className={`
                                flex items-center gap-3 px-10 py-4 bg-slate-900 text-white font-black rounded-xl shadow-xl transition-all
                                ${isUploading ? 'opacity-50 cursor-not-allowed scale-95' : 'hover:bg-slate-800 hover:-translate-y-1 active:scale-95'}
                            `}
                         >
                            {isUploading ? (
                                <>
                                    <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    Confirmar y Subir a la Nube
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                                    </svg>
                                </>
                            )}
                         </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExcelImporter;
