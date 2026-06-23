import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirestore } from '../hooks/useFirestore';
import { useTenant } from '../contexts/TenantContext';
import { Save, Camera, Info, Loader2, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';

const CompanySettings = () => {
    const { tenantId, getTenantCollection } = useFirestore();
    const { companyConfig: tenantData, logo: globalLogo } = useTenant();

    const [loading, setLoading] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const fileInputRef = useRef(null);

    const [config, setConfig] = useState({
        name: '',
        nombreFantasia: '',
        domicilioFiscal: '',
        logo: '',
        cuit: '',
        iibb: '',
        inicioActividades: '',
        razonSocial: ''
    });

    useEffect(() => {
        if (tenantId) loadAllData();
    }, [tenantId]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const companySnap = await getDoc(doc(db, 'companies', tenantId));
            const companyData = companySnap.data() || {};

            let afipData = {};
            const directSnap = await getDoc(doc(db, 'companies', tenantId, 'config', 'afip'));
            if (directSnap.exists()) {
                afipData = directSnap.data();
            } else {
                const q = query(getTenantCollection('config'), where('tipo', '==', 'afip'), limit(1));
                const afipSnap = await getDocs(q);
                if (!afipSnap.empty) afipData = afipSnap.docs[0].data();
            }

            setConfig({
                name: companyData.name || '',
                nombreFantasia: afipData.nombreFantasia || companyData.name || '',
                domicilioFiscal: afipData.domicilioFiscal || '',
                logo: companyData.logo || '',
                cuit: afipData.cuit || '',
                iibb: afipData.iibb || '',
                inicioActividades: afipData.inicioActividades || '',
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

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 800000) return toast.error("El logo es demasiado pesado. Usa una imagen de menos de 800KB.");
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result;
            handleChange('logo', base64String);
            localStorage.setItem('company_logo', base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, 'companies', tenantId), {
                name: config.name,
                logo: config.logo,
                updatedAt: new Date()
            });

            await setDoc(doc(db, 'companies', tenantId, 'config', 'afip'), {
                nombreFantasia: config.nombreFantasia,
                domicilioFiscal: config.domicilioFiscal,
                cuit: config.cuit,
                iibb: config.iibb,
                inicioActividades: config.inicioActividades,
                razonSocial: config.razonSocial,
                updatedAt: new Date()
            }, { merge: true });

            setUnsavedChanges(false);
            toast.success("✅ Configuración guardada correctamente.");
        } catch (e) {
            toast.error("Error al guardar: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl border border-slate-800">
                        <Building2 className="text-amber-400 w-8 h-8"/>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Empresa</h1>
                        <p className="text-slate-500 font-medium">Identidad corporativa y datos fiscales.</p>
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

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
                <div className="p-8 lg:p-12">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                        {/* Logo */}
                        <div className="lg:col-span-4 flex flex-col items-center">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 w-full">Logo Corporativo</label>
                            <div
                                className="group relative w-full aspect-square max-w-[280px] bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-amber-400 hover:bg-amber-50 cursor-pointer"
                                onClick={() => fileInputRef.current.click()}
                            >
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

                        {/* Datos */}
                        <div className="lg:col-span-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1.5 md:col-span-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial / Fantasía</label>
                                    <input
                                        value={config.nombreFantasia}
                                        onChange={e => handleChange('nombreFantasia', e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 px-5 py-4 rounded-2xl font-bold focus:border-amber-400 outline-none transition-all placeholder:text-slate-300"
                                        placeholder="El nombre que verán los clientes..."
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
            </div>
        </div>
    );
};

export default CompanySettings;
