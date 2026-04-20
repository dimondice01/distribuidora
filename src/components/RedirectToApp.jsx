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
  
  // Buscamos el ID corto (Nuevo Método), el ID de empresa, o la Data cruda (Viejo Método de respaldo)
  const orderId = searchParams.get('orderId') || searchParams.get('p'); 
  const tenantId = searchParams.get('c'); 
  const legacyData = searchParams.get('data');

  const [status, setStatus] = useState('Abriendo App...');
  const [deepLink, setDeepLink] = useState(null);

  useEffect(() => {
    // CASO A: Opción 1 (Delega la carga a la App Móvil vía pedidos_temporales)
    if (orderId && tenantId) {
        const finalLink = `movilappnueva://pedido?c=${encodeURIComponent(tenantId)}&p=${encodeURIComponent(orderId)}`;
        setDeepLink(finalLink);
        
        setTimeout(() => {
            window.location.href = finalLink;
            setStatus('Toca el botón si no abrió automáticamente.');
        }, 500);
    } 
    // CASO B: Legacy JSON Data
    else if (legacyData) {
        const finalLink = `movilappnueva://select-client-for-sale?data=${encodeURIComponent(legacyData)}`;
        setDeepLink(finalLink);
        
        setTimeout(() => {
            window.location.href = finalLink;
            setStatus('Toca el botón si no abrió automáticamente.');
        }, 500);
    } 
    else {
        setStatus('Enlace incompleto o inválido.');
    }
  }, [orderId, tenantId, legacyData]);

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