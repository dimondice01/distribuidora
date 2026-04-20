import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, query, collection, where, limit, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase'; 
import { useFirestore } from '../hooks/useFirestore';
import { useTenant } from '../contexts/TenantContext';
import forge from 'node-forge';
import { 
    Save, Camera, ShieldCheck, FileText, Info, 
    Loader2, Key, Globe, Activity, Building2,
    Download
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useShift } from '../contexts/ShiftContext';

// ==================================================================================
// 🎓 PASOS DE AYUDA AFIP
// ==================================================================================
const AFIP_STEPS = [
    { title: "1. Generar CSR", desc: "Haz clic en 'Generar Pedido CSR'. Se descargará un archivo clave en tu PC.", icon: Download },
    { title: "2. Web AFIP", desc: "Sube el archivo .CSR en 'Administración de Certificados' de la web de AFIP y descarga el .crt.", icon: Globe },
    { title: "3. Vincular WS", desc: "En 'Administrador de Relaciones', asocia el nuevo alias al servicio 'Facturación Electrónica'.", icon: Activity },
    { title: "4. Pegar Certificado", desc: "Copia el contenido del archivo .crt y pégalo en el campo correspondiente abajo.", icon: FileText }
];

const CompanySettings = () => {
    const { tenantId, getTenantCollection, updateTenantDoc, addTenantDoc } = useFirestore();
    const { companyConfig: tenantData, logo: globalLogo } = useTenant();
    const { activeShift } = useShift();
    
    const [activeTab, setActiveTab] = useState('identidad');
    const [loading, setLoading] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const fileInputRef = useRef(null);

    // Estado Unificado: Identidad + Fiscal
    const [config, setConfig] = useState({
        // Identidad
        name: '',
        nombreFantasia: '',
        domicilioFiscal: '',
        logo: '',
        // Fiscal (AFIP)
        cuit: '',
        ptoVta: 1,
        iibb: '',
        inicioActividades: '',
        taxCondition: 'MT', // MT o RI
        isProduction: false,
        cert: '',
        key: '',
        active: false,
        razonSocial: ''
    });

    const [configDocId, setConfigDocId] = useState(null);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // Cargar datos iniciales
    useEffect(() => {
        if (tenantId) loadAllData();
    }, [tenantId]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            // 1. Cargar Datos de la Compañía (Nombre y Logo)
            const companySnap = await getDoc(doc(db, 'companies', tenantId));
            const companyData = companySnap.data() || {};

            // 2. Cargar Configuración Fiscal (tipo AFIP)
            const q = query(getTenantCollection('config'), where('tipo', '==', 'afip'), limit(1));
            const afipSnap = await getDocs(q);
            
            let afipData = {};
            if (!afipSnap.empty) {
                const docSnap = afipSnap.docs[0];
                setConfigDocId(docSnap.id);
                afipData = docSnap.data();
            }

            setConfig({
                name: companyData.name || '',
                nombreFantasia: afipData.nombreFantasia || companyData.name || '',
                domicilioFiscal: afipData.domicilioFiscal || '',
                logo: companyData.logo || '',
                cuit: afipData.cuit || '',
                ptoVta: afipData.ptoVta || 1,
                iibb: afipData.iibb || '',
                inicioActividades: afipData.inicioActividades || '',
                taxCondition: afipData.taxCondition || 'MT',
                isProduction: afipData.isProduction || false,
                cert: afipData.cert || '',
                key: afipData.key || '',
                active: afipData.active || false,
                razonSocial: afipData.razonSocial || companyData.name || ''
            });
        } catch (e) {
            console.error("Error cargando configuración:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        setUnsavedChanges(true);
    };

    // --- MANEJO DE LOGO (BASE64 + RESILIENCIA) ---
    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 800000) { // 800KB aprox
            return toast.error("El logo es demasiado pesado. Usa una imagen de menos de 800KB.");
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result;
            handleChange('logo', base64String);
            // Cache local inmediato para UX fluida
            localStorage.setItem('company_logo', base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            // 1. Guardar Identidad en la Compañía (Root)
            await updateDoc(doc(db, 'companies', tenantId), {
                name: config.name,
                logo: config.logo,
                updatedAt: new Date()
            });

            // 2. Guardar Configuración Fiscal en subcolección config
            const afipPayload = {
                tipo: 'afip',
                cuit: config.cuit,
                ptoVta: config.ptoVta,
                iibb: config.iibb,
                inicioActividades: config.inicioActividades,
                taxCondition: config.taxCondition,
                isProduction: config.isProduction,
                cert: config.cert,
                key: config.key,
                active: config.active,
                razonSocial: config.razonSocial,
                nombreFantasia: config.nombreFantasia,
                domicilioFiscal: config.domicilioFiscal,
                updatedAt: new Date()
            };

            if (configDocId) {
                await updateTenantDoc('config', configDocId, afipPayload);
            } else {
                const newDocRef = await addTenantDoc('config', afipPayload);
                setConfigDocId(newDocRef.id);
            }

            setUnsavedChanges(false);
            toast.success("✅ Configuración guardada correctamente.");
        } catch (e) {
            toast.error("Error al guardar: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE AFIP (CSR) ---
    const handleGenerateCSR = async () => {
        if (!config.cuit || !config.razonSocial) return toast.warning("Completa CUIT y Razón Social");
        setLoading(true);
        try {
            const keys = await new Promise((res, rej) => {
                forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 2 }, (err, kp) => err ? rej(err) : res(kp));
            });
            const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
            const csr = forge.pki.createCertificationRequest();
            csr.publicKey = keys.publicKey;
            csr.setSubject([{ name: 'commonName', value: config.razonSocial }, { name: 'serialNumber', value: `CUIT ${config.cuit}` }, { name: 'countryName', value: 'AR' }]);
            csr.sign(keys.privateKey);
            
            handleChange('key', privateKeyPem);
            const csrPem = forge.pki.certificationRequestToPem(csr);
            const blob = new Blob([csrPem], { type: "text/plain" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `pedido_afip_${config.cuit}.csr`;
            link.click();
            toast.info("CSR Descargado. Súbelo a AFIP.");
        } catch (e) { toast.error(e.message); } finally { setLoading(false); }
    };

    const handleTestAfip = async () => {
        setTesting(true);
        try {
            const probar = httpsCallable(getFunctions(), 'probarConexionAfip'); 
            const { data } = await probar();
            setTestResult(data);
        } catch (e) { setTestResult({ status: 'ERROR', message: e.message }); } finally { setTesting(false); }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in">
            
            {/* Header Pro */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl border border-slate-800">
                        <Building2 className="text-amber-400 w-8 h-8"/>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Empresa</h1>
                        <p className="text-slate-500 font-medium">Identidad corporativa y configuración fiscal.</p>
                    </div>
                </div>
                
                <button 
                    onClick={handleSave} 
                    disabled={loading || !unsavedChanges}
                    className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-sm transition-all shadow-xl hover:scale-105 active:scale-95 ${
                        unsavedChanges ? 'bg-amber-400 text-slate-900 shadow-amber-400/20' : 'bg-slate-100 text-slate-400 grayscale cursor-not-allowed'
                    }`}
                >
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                    GUARDAR CAMBIOS
                </button>
            </div>

            {/* Tabs Industriales */}
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] mb-8 w-fit">
                {[
                    { id: 'identidad', label: 'Datos de Empresa', icon: Building2 },
                    { id: 'fiscal', label: 'Fiscal (AFIP)', icon: ShieldCheck }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all ${
                            activeTab === tab.id ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <tab.icon size={18}/>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden min-h-[500px]">
                
                {/* --- TAB IDENTIDAD --- */}
                {activeTab === 'identidad' && (
                    <div className="p-8 lg:p-12">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                            {/* Logo Upload Section */}
                            <div className="lg:col-span-4 flex flex-col items-center">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 w-full">Logo Corporativo</label>
                                <div className="group relative w-full aspect-square max-w-[280px] bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-amber-400 hover:bg-amber-50 cursor-pointer" onClick={() => fileInputRef.current.click()}>
                                    {config.logo ? (
                                        <>
                                            <img src={config.logo} alt="Preview" className="w-full h-full object-contain p-4" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                <Camera size={40} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-400 group-hover:text-amber-500">
                                            <Camera size={48} strokeWidth={1.5} />
                                            <p className="mt-4 text-xs font-black uppercase tracking-tighter">Subir Logo</p>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                                </div>
                                <p className="mt-4 text-center text-[10px] text-slate-400 font-medium">Recomendado: PNG Transparente o cuadrado fondo blanco (Max 800KB).</p>
                            </div>

                            {/* Info Section */}
                            <div className="lg:col-span-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1.5 md:col-span-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial / Fantasía</label>
                                        <input 
                                            value={config.nombreFantasia} 
                                            onChange={e => handleChange('nombreFantasia', e.target.value)} 
                                            className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl font-bold focus:border-amber-400 outline-none transition-all placeholder:text-slate-300"
                                            placeholder="EL nombre que verán los clientes..."
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social Legal</label>
                                        <input 
                                            value={config.razonSocial} 
                                            onChange={e => handleChange('razonSocial', e.target.value)} 
                                            className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl font-bold focus:border-amber-400 outline-none transition-all placeholder:text-slate-300"
                                            placeholder="Tu Empresa S.R.L / S.A."
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-1">
                                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">CUIT de la Empresa</label>
                                        <input 
                                            value={config.cuit} 
                                            onChange={e => handleChange('cuit', e.target.value)} 
                                            className="w-full bg-blue-50 border-2 border-blue-100 px-5 py-4 rounded-2xl font-bold focus:border-blue-400 outline-none transition-all font-mono"
                                            placeholder="20123456789"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Domicilio Fiscal / Central</label>
                                        <input 
                                            value={config.domicilioFiscal} 
                                            onChange={e => handleChange('domicilioFiscal', e.target.value)} 
                                            className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl font-bold focus:border-amber-400 outline-none transition-all"
                                            placeholder="Pueyrredón 123, CP 5300, La Rioja, Argentina"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IIBB</label>
                                            <input 
                                                value={config.iibb} 
                                                onChange={e => handleChange('iibb', e.target.value)} 
                                                className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl font-bold focus:border-amber-400 outline-none transition-all"
                                                placeholder="912-123456"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inicio Act.</label>
                                            <input 
                                                value={config.inicioActividades} 
                                                onChange={e => handleChange('inicioActividades', e.target.value)} 
                                                className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl font-bold focus:border-amber-400 outline-none transition-all"
                                                placeholder="01/01/2020"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex items-start gap-4">
                                    <Info className="text-amber-500 shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-black text-amber-900 mb-1">Manejo Offline Activo</h4>
                                        <p className="text-xs text-amber-700 leading-relaxed font-medium">El logo se guarda localmente en este navegador. Las facturas se verán correctamente incluso si estás trabajando en zonas sin señal de internet.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB FISCAL --- */}
                {activeTab === 'fiscal' && (
                    <div className="p-8 lg:p-12 space-y-12">
                        <div className="bg-slate-900 text-white p-6 rounded-[2rem] flex flex-wrap gap-8 justify-between items-center shadow-xl">
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${config.active ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${config.active ? 'translate-x-6' : ''}`}/>
                                    </div>
                                    <input type="checkbox" className="hidden" checked={config.active} onChange={e => handleChange('active', e.target.checked)} />
                                    <span className="font-extrabold text-sm uppercase tracking-wider">{config.active ? 'Módulo AFIP Online' : 'Módulo AFIP Inactivo'}</span>
                                </label>
                                <div className="w-px h-8 bg-slate-800"></div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="accent-amber-400 w-5 h-5 rounded-lg" checked={config.isProduction} onChange={e => handleChange('isProduction', e.target.checked)} />
                                    <span className={`text-sm font-extrabold tracking-tight ${config.isProduction ? 'text-amber-400' : 'text-slate-500'}`}>MODO PRODUCCIÓN</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl">
                                <ShieldCheck size={16} className="text-indigo-400"/>
                                <span className="text-[10px] font-black uppercase text-slate-400">Certificación ARCA v2.0</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Datos Contribuyente */}
                            <div className="space-y-8">
                                <h3 className="text-xl font-black text-slate-800 border-b-4 border-slate-100 pb-3">Perfil Fiscal</h3>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CUIT Emisor (Sin –)</label>
                                            <input value={config.cuit} onChange={e => handleChange('cuit', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl font-bold focus:border-indigo-500 outline-none transition-all font-mono" placeholder="20123456789"/>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pto de Venta (PDV)</label>
                                            <input type="number" value={config.ptoVta} onChange={e => handleChange('ptoVta', parseInt(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl font-bold focus:border-indigo-500 outline-none transition-all font-mono"/>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Condición Frente al IVA</label>
                                        <div className="flex gap-4">
                                            {['MT', 'RI'].map(c => (
                                                <button key={c} onClick={() => handleChange('taxCondition', c)} className={`flex-1 py-4 rounded-2xl border-2 font-black text-sm transition-all ${config.taxCondition === c ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}>
                                                    {c === 'MT' ? 'MONOTRIBUTO (C)' : 'RESP. INSCRIPTO (A/B)'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Seguridad y Certs */}
                            <div className="space-y-8">
                                <h3 className="text-xl font-black text-slate-800 border-b-4 border-slate-100 pb-3">Seguridad y Firma</h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${config.key ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                                <Key size={24} strokeWidth={2.5}/>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-emerald-900 leading-none mb-1">Clave Privada RSA</p>
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">{config.key ? '🔐 Clave Protegida y Lista' : '⚠ No generada'}</p>
                                            </div>
                                        </div>
                                        <button onClick={handleGenerateCSR} className="px-4 py-2 bg-emerald-600 text-white font-black text-[10px] rounded-xl hover:bg-emerald-700 transition-all uppercase tracking-widest">{config.key ? 'REGENERAR' : 'GENERAR CSR'}</button>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Certificado CRT (.crt de AFIP)</label>
                                        <textarea 
                                            value={config.cert} 
                                            onChange={e => handleChange('cert', e.target.value)}
                                            className="w-full h-40 bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl font-mono text-[9px] focus:border-indigo-500 outline-none transition-all resize-none leading-relaxed text-slate-600"
                                            placeholder="-----BEGIN CERTIFICATE-----..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AFIP Status Footer */}
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-8 border-t border-slate-100">
                             <div className="flex -space-x-2">
                                {AFIP_STEPS.map((step, i) => (
                                    <div key={i} title={step.title} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors cursor-help">
                                        <step.icon size={14}/>
                                    </div>
                                ))}
                             </div>
                             <div className="flex items-center gap-4">
                                {testResult && (
                                     <span className={`text-[11px] font-black uppercase px-4 py-1.5 rounded-full ${testResult.status === 'OK' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                         {testResult.status === 'OK' ? 'Conexión OK (Ping 42ms)' : 'Fallo en la nube'}
                                     </span>
                                )}
                                <button onClick={handleTestAfip} disabled={testing} className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl font-black text-xs text-slate-600 hover:bg-slate-50 transition-all">
                                    {testing ? <Loader2 className="animate-spin" size={16}/> : <Activity size={16}/>}
                                    PROBAR CONEXIÓN
                                </button>
                             </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default CompanySettings;
