// src/components/RedirectToApp.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; 

// --- LOGO NOAR ERP (Animado para carga) ---
const NoarLoader = () => (
  <div className="mb-8 animate-pulse">
      <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/30">
          <span className="text-amber-400 font-black text-4xl">N</span>
      </div>
  </div>
);

export default function RedirectToApp() {
  const [searchParams] = useSearchParams();
  
  // Buscamos el ID corto (Nuevo Método) o la Data cruda (Viejo Método de respaldo)
  const orderId = searchParams.get('orderId'); 
  const legacyData = searchParams.get('data');

  const [status, setStatus] = useState('Iniciando...');
  const [deepLink, setDeepLink] = useState(null);

  useEffect(() => {
    const processRedirect = async () => {
      
      // CASO A: Viene con ID corto (Lo estándar ahora)
      if (orderId) {
        setStatus('Recuperando pedido de la nube...');
        try {
          const docRef = doc(db, "pedidos_temporales", orderId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const orderData = docSnap.data();
            
            // Empaquetamos los items recuperados para la App
            // La App Móvil espera recibir un parámetro 'data' con el JSON
            const jsonPayload = JSON.stringify(orderData.items);
            const finalLink = `movilappnueva://select-client-for-sale?data=${encodeURIComponent(jsonPayload)}`;
            
            setDeepLink(finalLink);
            setStatus('Abriendo Noar ERP...');
            
            // Redirección automática
            window.location.href = finalLink;
          } else {
            setStatus('El pedido ha expirado o no existe.');
          }
        } catch (error) {
          console.error("Error recuperando pedido:", error);
          setStatus('Error de conexión. Intente nuevamente.');
        }
      } 
      
      // CASO B: Viene con JSON directo (Legacy / Backup)
      else if (legacyData) {
         setStatus('Procesando datos...');
         const finalLink = `movilappnueva://select-client-for-sale?data=${encodeURIComponent(legacyData)}`;
         setDeepLink(finalLink);
         window.location.href = finalLink;
      }
      
      else {
          setStatus('Enlace inválido.');
      }
    };

    processRedirect();
  }, [orderId, legacyData]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans">
      
      {/* Logo de carga */}
      <NoarLoader />

      {/* Spinner sutil */}
      {!deepLink && !status.includes('Error') && !status.includes('inválido') && (
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-b-slate-900 mb-6"></div>
      )}
      
      <h1 className="text-xl font-bold text-slate-800 mb-2">{status}</h1>
      <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto leading-relaxed">
          Estamos transfiriendo su pedido al sistema de gestión.
      </p>
      
      {/* Botón Manual (Solo aparece si ya tenemos el link listo) */}
      {deepLink && (
          <a 
            href={deepLink}
            className="px-8 py-4 bg-slate-900 text-white font-bold rounded-xl shadow-xl shadow-slate-900/20 hover:bg-black hover:-translate-y-0.5 transition-all active:scale-95"
          >
            Abrir App Manualmente
          </a>
      )}
    </div>
  );
}