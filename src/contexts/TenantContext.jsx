import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, query, collection, where, limit } from 'firebase/firestore';

const TenantContext = createContext();

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (!context) throw new Error("useTenant debe usarse dentro de un TenantProvider");
    return context;
};

export const TenantProvider = ({ children }) => {
    const [tenantId, setTenantId] = useState(null);
    const [companyConfig, setCompanyConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('company_config');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubCompany = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            // Limpiar suscripción previa si existe
            if (unsubCompany) {
                unsubCompany();
                unsubCompany = null;
            }

            setUser(currentUser);
            
            if (currentUser) {
                try {
                    // 1. Obtener el perfil del usuario (una sola vez)
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    
                    if (userDoc.exists()) {
                        const companyId = userDoc.data().companyId;
                        setTenantId(companyId);

                        // 2. Escuchar cambios en la configuración de la compañía (Suscripción Limpia)
                        if (companyId) {
                            // Listener 1: Datos Base (Nombre, Logo)
                            const unsubRoot = onSnapshot(doc(db, 'companies', companyId), (docSnap) => {
                                if (docSnap.exists()) {
                                    const data = docSnap.data();
                                    setCompanyConfig(prev => ({ 
                                        ...prev, 
                                        name: data.name, 
                                        logo: data.logo 
                                    }));
                                }
                            });

                            // Listener 2: Datos Fiscales (Prioridad Máxima sobre CUIT, AFIP, Domicilio)
                            const q = query(collection(db, 'companies', companyId, 'config'), where('tipo', '==', 'afip'), limit(1));
                            const unsubFiscal = onSnapshot(q, (snapshot) => {
                                if (!snapshot.empty) {
                                    const afipData = snapshot.docs[0].data();
                                    // Normalizar taxCondition: backend usa valores largos, frontend usa 'RI'/'MT'
                                    const tc = afipData.taxCondition;
                                    const normalized = {
                                        ...afipData,
                                        taxCondition: tc === 'RESPONSABLE_INSCRIPTO' ? 'RI'
                                                    : tc === 'MONOTRIBUTO' ? 'MT'
                                                    : tc
                                    };
                                    setCompanyConfig(prev => ({ ...prev, ...normalized }));
                                }
                                setLoading(false);
                            }, (err) => {
                                console.error("Error en Snapshot Fiscal:", err);
                                setLoading(false);
                            });

                            unsubCompany = () => {
                                unsubRoot();
                                unsubFiscal();
                            };
                        } else {
                            setLoading(false);
                        }
                    } else {
                        console.warn("Documento de usuario no encontrado.");
                        setLoading(false);
                    }
                } catch (error) {
                    console.error("Error cargando TenantContext (Permisos?):", error);
                    // Si falla el perfil, dejamos que App maneje la falta de tenantId
                    setUser(currentUser); 
                    setLoading(false);
                }
            } else {
                setTenantId(null);
                setCompanyConfig({});
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubCompany) unsubCompany();
        };
    }, []);

    const value = {
        tenantId,
        companyConfig,
        user,
        loading,
        isMultiTenant: !!tenantId,
        logo: companyConfig?.logo || localStorage.getItem('company_logo')
    };

    // Efecto para persistir config en LocalStorage (excluye credenciales AFIP)
    useEffect(() => {
        if (companyConfig && Object.keys(companyConfig).length > 0) {
            // cert y key no deben persistirse en disco — se recuperan del listener de Firestore al cargar
            const { cert, key, ...configSafe } = companyConfig;
            localStorage.setItem('company_config', JSON.stringify(configSafe));
            if (companyConfig.logo) {
                localStorage.setItem('company_logo', companyConfig.logo); 
            }
        }
    }, [companyConfig]);

    return (
        <TenantContext.Provider value={value}>
            {children}
        </TenantContext.Provider>
    );
};
