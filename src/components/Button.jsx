import React from 'react';

// Componente Reutilizable "Industrial Premium"
const Button = ({ 
  children, 
  onClick, 
  icon, 
  className = "", 
  variant = "primary", // 'primary' | 'secondary' | 'danger'
  disabled = false,
  type = "button"
}) => {
  
  // Definimos los estilos base para no repetir
  const baseStyle = "font-bold rounded-xl transition-all duration-200 px-5 py-2.5 flex items-center gap-2 justify-center active:scale-95 disabled:opacity-50 disabled:scale-100";
  
  // Variantes de color centralizadas
  const variants = {
    primary: "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:scale-105",
    secondary: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm",
    danger: "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 hover:text-red-800",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
  };

  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {/* Si pasas un icono, lo renderiza con un margen */}
      {icon && <span className={children ? "mr-1" : ""}>{icon}</span>}
      {children}
    </button>
  );
};

export default Button;