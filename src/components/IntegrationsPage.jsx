import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase'; // Asegúrate que la ruta a tu firebase.js sea correcta
import forge from 'node-forge';
import { 
    Save, Download, Server, CheckCircle2, XCircle, 
    ShieldCheck, AlertTriangle, FileText, Info, 
    Loader2, Key, Globe, Activity 
} from 'lucide-react';

// ==================================================================================
// 🎓 MODAL DE AYUDA (TUTORIAL PASO A PASO)
// ==================================================================================
const TutorialModal = ({ isOpen, onClose, cuit }) => {
    if (!isOpen) return null;

    const steps = [
        { 
            title: "1. Generar Pedido (CSR)", 
            desc: "Completa tus datos fiscales en esta pantalla y haz clic en 'Generar Solicitud CSR'. Se descargará un archivo en tu PC.",
            icon: Download
        },
        { 
            title: "2. Obtener Certificado en AFIP", 
            desc: "Entra a la web de AFIP con Clave Fiscal -> Servicio 'Administración de Certificados Digitales'. Agrega un Alias, sube el archivo .CSR que descargaste y obtén el certificado .crt.",
            icon: Globe
        },
        { 
            title: "3. Vincular Servicio (CRÍTICO)", 
            desc: "En AFIP, ve a 'Administrador de Relaciones'. Nueva Relación -> AFIP -> WebServices -> Facturación Electrónica. Asócialo al 'Computador Fiscal' (Alias) que creaste recién.",
            icon: Activity
        },
        { 
            title: "4. Cargar Certificado", 
            desc: "Abre el archivo .crt que te dio AFIP con el Bloc de Notas. Copia TODO el texto y pégalo en el campo 'Certificado CRT' de esta pantalla.",
            icon: FileText
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-[#2C3E50] p-5 text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Info size={20}/> Guía de Integración AFIP</h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><XCircle size={20}/></button>
                </div>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {steps.map((step, i) => (
                        <div key={i} className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold border border-blue-100">
                                <step.icon size={18}/>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">{step.title}</h4>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-5 bg-gray-50 text-center border-t">
                    <button onClick={onClose} className="bg-[#2C3E50] text-white px-6 py-2 rounded-lg font-bold text-sm w-full hover:bg-black transition-colors">
                        ¡Entendido!
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================================================================================
// 🚀 COMPONENTE PRINCIPAL
// ==================================================================================
const IntegrationsPage = () => {
    // Estado alineado con el backend (cert/key)
    const [config, setConfig] = useState({
        cuit: '', 
        ptoVta: 1, 
        razonSocial: '', 
        isProduction: false, 
        cert: '', // Contenido del CRT
        key: '',  // Contenido de la Private Key
        active: false
    });
    
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [showTutorial, setShowTutorial] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    useEffect(() => { loadConfig(); }, []);

    // Detectar cambios para avisar al usuario
    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        setUnsavedChanges(true);
    };

    const loadConfig = async () => {
        setLoading(true);
        try {
            const snap = await getDoc(doc(db, 'config', 'afip'));
            if (snap.exists()) {
                const data = snap.data();
                // Normalizamos nombres por si vienen viejos
                setConfig({
                    cuit: data.cuit || '',
                    ptoVta: data.ptoVta || 1,
                    razonSocial: data.razonSocial || '',
                    isProduction: data.isProduction || false,
                    cert: data.cert || data.certificate || '',
                    key: data.key || data.privateKey || '',
                    active: data.active || false
                });
            }
        } catch (e) {
            console.error("Error cargando config:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCSR = async () => {
        if (!config.cuit || !config.razonSocial) {
            return alert("⚠️ Por favor completa el CUIT y la Razón Social antes de generar las claves.");
        }
        
        setLoading(true);
        try {
            // 1. Generar par de claves RSA 2048 bits
            const keys = await new Promise((resolve, reject) => {
                forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 2 }, (err, keypair) => {
                    if (err) reject(err);
                    else resolve(keypair);
                });
            });

            // 2. Convertir Key a PEM y guardarla en el estado
            const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
            
            // 3. Crear CSR (Certificate Signing Request)
            const csr = forge.pki.createCertificationRequest();
            csr.publicKey = keys.publicKey;
            csr.setSubject([
                { name: 'commonName', value: config.razonSocial },
                { name: 'serialNumber', value: `CUIT ${config.cuit}` },
                { name: 'countryName', value: 'AR' },
                { name: 'organizationName', value: 'Noar ERP' }
            ]);
            csr.sign(keys.privateKey);
            
            // 4. Actualizar estado
            handleChange('key', privateKeyPem);

            // 5. Descargar archivo .csr
            const csrPem = forge.pki.certificationRequestToPem(csr);
            const blob = new Blob([csrPem], { type: "text/plain;charset=utf-8" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `pedido_afip_${config.cuit}.csr`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            alert("✅ ¡Clave Privada Generada!\n\nSe ha descargado el archivo .CSR. Súbelo a la web de AFIP para obtener tu certificado .crt");
            setShowTutorial(true); // Abrir ayuda automáticamente

        } catch (e) {
            alert("Error generando CSR: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Guardamos normalizado (cert/key)
            await setDoc(doc(db, 'config', 'afip'), config, { merge: true });
            setUnsavedChanges(false);
            setTestResult(null); // Limpiar tests viejos
            alert("✅ Configuración guardada correctamente.");
        } catch (e) {
            alert("Error al guardar: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        if (unsavedChanges) return alert("⚠️ Tienes cambios sin guardar. Guarda primero.");
        
        setTesting(true);
        setTestResult(null);
        try {
            const functions = getFunctions();
            // Asegúrate de que el nombre coincida con tu export en functions/index.js
            const probar = httpsCallable(functions, 'probarConexionAfip'); 
            const { data } = await probar();
            setTestResult(data);
        } catch (e) {
            console.error(e);
            setTestResult({ status: 'ERROR', message: e.message || "Error de conexión" });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans text-slate-800">
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Server className="text-blue-600" /> Integración ARCA (AFIP)
                        </h1>
                        <p className="text-slate-500 mt-1 text-sm">Configura la facturación electrónica automática para tu distribución.</p>
                    </div>
                    <button 
                        onClick={() => setShowTutorial(true)}
                        className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors"
                    >
                        <Info size={16}/> Ver Guía Paso a Paso
                    </button>
                </div>

                {/* MAIN CARD */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    
                    {/* TOP BAR: ESTADO */}
                    <div className="bg-slate-900 text-white p-4 flex flex-wrap gap-4 justify-between items-center">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <div className={`w-10 h-5 rounded-full p-1 transition-colors ${config.active ? 'bg-green-500' : 'bg-slate-600'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${config.active ? 'translate-x-5' : ''}`}/>
                                </div>
                                <input type="checkbox" className="hidden" checked={config.active} onChange={e => handleChange('active', e.target.checked)} />
                                <span className="font-bold text-sm uppercase tracking-wide">{config.active ? 'Módulo Activo' : 'Módulo Inactivo'}</span>
                            </label>

                            <div className="h-6 w-px bg-slate-700 mx-2 hidden md:block"></div>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" className="accent-orange-500 w-4 h-4" checked={config.isProduction} onChange={e => handleChange('isProduction', e.target.checked)} />
                                <span className={`text-sm font-bold ${config.isProduction ? 'text-orange-400' : 'text-slate-400'}`}>
                                    {config.isProduction ? '🚀 MODO PRODUCCIÓN' : '🛠 MODO PRUEBAS (HOMO)'}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                        
                        {/* COLUMNA IZQUIERDA: DATOS FISCALES */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                                <ShieldCheck size={20} className="text-slate-400"/> Datos del Contribuyente
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Razón Social</label>
                                    <input 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        placeholder="Ej: JUAN PEREZ"
                                        value={config.razonSocial}
                                        onChange={e => handleChange('razonSocial', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">CUIT (Sin guiones)</label>
                                        <input 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                            placeholder="20123456789"
                                            maxLength={11}
                                            value={config.cuit}
                                            onChange={e => handleChange('cuit', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Pto. Venta (AFIP)</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                            placeholder="1"
                                            value={config.ptoVta}
                                            onChange={e => handleChange('ptoVta', parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                                <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
                                <p className="text-xs text-blue-800 leading-relaxed">
                                    Asegúrate de que el Punto de Venta esté dado de alta en AFIP como <strong>"Web Service - Comprobantes en Línea"</strong>.
                                </p>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: CERTIFICADOS */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                                <Key size={20} className="text-slate-400"/> Certificados Digitales
                            </h3>

                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.key ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                        {config.key ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700">Clave Privada (Key)</span>
                                        <span className="text-[10px] text-slate-400">{config.key ? 'Generada y lista' : 'Pendiente de generación'}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleGenerateCSR} 
                                    disabled={loading}
                                    className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg font-bold hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={14}/> : <Download size={14}/>}
                                    {config.key ? 'Regenerar' : 'Generar CSR'}
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Certificado Digital (.crt)</label>
                                <textarea 
                                    className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-[10px] font-mono leading-tight focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-slate-600"
                                    placeholder="-----BEGIN CERTIFICATE-----&#10;Pegar el contenido del archivo .crt aquí...&#10;-----END CERTIFICATE-----"
                                    value={config.cert}
                                    onChange={e => handleChange('cert', e.target.value)}
                                />
                                <p className="text-[10px] text-slate-400 mt-1 text-right">Copia y pega todo el contenido del archivo descargado de AFIP.</p>
                            </div>
                        </div>
                    </div>

                    {/* FOOTER ACTIONS */}
                    <div className="bg-slate-50 p-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button 
                                onClick={handleTest}
                                disabled={loading || testing || unsavedChanges}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm border ${
                                    unsavedChanges 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                                    : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300'
                                }`}
                            >
                                {testing ? <Loader2 className="animate-spin" size={18}/> : <Activity size={18}/>}
                                Probar Conexión
                            </button>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            {unsavedChanges && (
                                <span className="text-xs text-orange-500 font-bold animate-pulse hidden md:block">
                                    ⚠ Cambios sin guardar
                                </span>
                            )}
                            <button 
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-200 hover:shadow-green-300 transition-all disabled:opacity-70"
                            >
                                {loading ? 'Guardando...' : 'Guardar Configuración'} <Save size={18}/>
                            </button>
                        </div>
                    </div>
                </div>

                {/* RESULTADO DEL TEST */}
                {testResult && (
                    <div className={`animate-in slide-in-from-bottom-4 fade-in duration-500 rounded-2xl p-6 border shadow-sm flex items-start gap-4 ${
                        testResult.status === 'OK' 
                            ? 'bg-emerald-50 border-emerald-100' 
                            : 'bg-red-50 border-red-100'
                    }`}>
                        <div className={`p-3 rounded-full shrink-0 ${testResult.status === 'OK' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {testResult.status === 'OK' ? <CheckCircle2 size={24}/> : <AlertTriangle size={24}/>}
                        </div>
                        <div className="flex-1">
                            <h4 className={`font-bold text-lg ${testResult.status === 'OK' ? 'text-emerald-800' : 'text-red-800'}`}>
                                {testResult.status === 'OK' ? '¡Conexión Exitosa!' : 'Error de Conexión'}
                            </h4>
                            
                            {testResult.status === 'OK' ? (
                                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    <div className="bg-white/60 p-2 rounded">Server: <strong>{testResult.server}</strong></div>
                                    <div className="bg-white/60 p-2 rounded">Auth: <strong>{testResult.auth}</strong></div>
                                    <div className="bg-white/60 p-2 rounded">DB: <strong>{testResult.db}</strong></div>
                                    <div className="bg-white/60 p-2 rounded">Modo: <strong>{testResult.mod}</strong></div>
                                </div>
                            ) : (
                                <p className="mt-1 text-sm text-red-700 font-mono bg-red-100/50 p-2 rounded border border-red-200">
                                    {testResult.message || JSON.stringify(testResult)}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* TUTORIAL MODAL */}
            <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} cuit={config.cuit} />
        </div>
    );
};

export default IntegrationsPage;