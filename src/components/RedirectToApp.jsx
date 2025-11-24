// src/components/RedirectToApp.jsx
import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function RedirectToApp() {
  const [searchParams] = useSearchParams();
  const data = searchParams.get('data');

  useEffect(() => {
    if (data) {
      // Construimos el Deep Link real
      const deepLink = `movilappnueva://select-client-for-sale?data=${encodeURIComponent(data)}`;
      
      // Redirección automática
      window.location.href = deepLink;
    }
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-6"></div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Abriendo la App...</h1>
      <p className="text-slate-500 mb-8 max-w-xs mx-auto">Si no sucede nada automáticamente, presiona el botón de abajo.</p>
      
      <a 
        href={`movilappnueva://select-client-for-sale?data=${data ? encodeURIComponent(data) : ''}`}
        className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
      >
        Abrir Pedido en App
      </a>
    </div>
  );
}