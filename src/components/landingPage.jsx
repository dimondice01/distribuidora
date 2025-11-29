import React from 'react';
import { Link } from 'react-router-dom';

// --- IMPORTACIÓN DE IMÁGENES ---
import dashboardImg from '../assets/landing/dashboard.png';
import mobileImg from '../assets/landing/mobile.png';
import facturaImg from '../assets/landing/factura.png';
import mapImg from '../assets/landing/mapaInteligente.png';

// --- ICONOS DE MARKETING (Optimizados) ---
const CheckIcon = () => <svg className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>;
const ChartIcon = () => <svg className="w-10 h-10 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const TruckIcon = () => <svg className="w-10 h-10 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>;
const CloudIcon = () => <svg className="w-10 h-10 text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
const WhatsappIcon = ({className}) => <svg className={`w-5 h-5 mr-2 ${className}`} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>;
const BrandIcon = () => <svg className="w-12 h-12 text-white mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>;
const FilterIcon = () => <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>;
const FuelIcon = () => <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;

const LandingPage = () => {
  return (
    <div className="font-sans text-slate-900 bg-white overflow-x-hidden">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          {/* LOGO NOAR ERP */}
          <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:scale-105 transition-transform">
                  <span className="text-amber-400 font-black text-2xl">N</span>
              </div>
              <div className="flex flex-col leading-none">
                  <span className="text-2xl font-black tracking-tighter text-slate-900">
                      NOAR <span className="text-amber-600 font-light tracking-widest text-lg">ERP</span>
                  </span>
              </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-bold text-slate-600 hover:text-amber-600 transition-colors">Tecnología</a>
              <a href="#map" className="text-sm font-bold text-slate-600 hover:text-amber-600 transition-colors">Ruteo</a>
              <a href="#white-label" className="text-sm font-bold text-slate-600 hover:text-amber-600 transition-colors">Marca Blanca</a>
              <a href="#fiscal" className="text-sm font-bold text-slate-600 hover:text-amber-600 transition-colors">Fiscalidad</a>
          </div>
          <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-bold text-slate-900 hover:text-amber-600 hidden sm:block">Login Clientes</Link>
              <Link to="/login" className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 hover:-translate-y-0.5">
                  Demo
              </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative pt-20 pb-32 lg:pt-32 lg:pb-40 overflow-hidden bg-slate-50">
        <div className="container relative mx-auto px-4">
          <div className="flex flex-wrap items-center">
            
            {/* Left Column: Value Proposition */}
            <div className="w-full lg:w-5/12 px-4 mb-16 lg:mb-0 text-center lg:text-left z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-xs font-bold tracking-widest text-amber-700 uppercase bg-amber-100 rounded-full border border-amber-200">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span> INFRAESTRUCTURA SAAS
              </div>
              <h1 className="text-slate-900 font-black text-5xl lg:text-6xl leading-[1.1] mb-6 tracking-tight">
                Distribución Inteligente <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">de Marca Blanca.</span>
              </h1>
              <p className="text-lg text-slate-600 font-medium mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Transforme su operación con un ecosistema digital completo que integra <strong>Ventas, Logística y Fiscalidad</strong> bajo su propia identidad corporativa. 
                Elimine errores costosos y "agujeros negros" de mercadería.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
                  <Link to="/login" className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/30 hover:scale-105 transition-transform text-center text-lg flex items-center justify-center gap-2">
                      Ver en Acción <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                  </Link>
                  <a href="https://wa.me/5493804798844" target="_blank" rel="noreferrer" className="px-8 py-4 bg-white text-slate-900 border-2 border-slate-200 font-bold rounded-2xl hover:border-green-500 hover:text-green-600 transition-colors text-center flex items-center justify-center gap-2 text-lg">
                      <WhatsappIcon className="text-green-600"/> Contactar
                  </a>
              </div>

              {/* Métricas Reales */}
              <div className="grid grid-cols-3 gap-4 border-t border-slate-200 pt-8">
                  <div>
                      <p className="text-3xl font-black text-slate-900">90%</p>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ahorro Tiempo</p>
                  </div>
                  <div>
                      <p className="text-3xl font-black text-slate-900">100%</p>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Trazabilidad</p>
                  </div>
                  <div>
                      <p className="text-3xl font-black text-slate-900">24/7</p>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Operatividad</p>
                  </div>
              </div>
            </div>
            
            {/* Right Column: Ecosistema Visual */}
            <div className="w-full lg:w-7/12 px-4 relative mt-12 lg:mt-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-gradient-to-tr from-amber-200/40 to-blue-100/40 rounded-full blur-3xl -z-10"></div>
                
                <div className="relative z-10 flex items-end justify-center lg:justify-end perspective-1000">
                    {/* DASHBOARD */}
                    <div className="relative rounded-2xl shadow-2xl shadow-slate-900/40 border-[4px] border-slate-800 bg-slate-900 overflow-hidden transform transition-transform duration-700 hover:rotate-y-1 hover:scale-[1.01] z-10 w-full lg:w-[95%]">
                        <img src={dashboardImg} alt="Dashboard Control" className="w-full h-auto object-cover rounded-lg opacity-95" />
                    </div>

                    {/* MOBILE APP FLOTANTE */}
                    <div className="absolute -bottom-12 -right-2 lg:-right-8 w-36 lg:w-56 rounded-[2.5rem] shadow-2xl border-[6px] border-slate-900 bg-slate-900 overflow-hidden transform rotate-[-4deg] hover:rotate-0 transition-transform duration-500 z-20">
                          <img src={mobileImg} alt="App Chofer Offline" className="w-full h-full object-cover" />
                    </div>
                </div>
            </div>

          </div>
        </div>
      </header>

      {/* --- CORE FEATURES (Technical Portfolio) --- */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto mb-24">
                <h2 className="text-amber-600 font-bold tracking-widest uppercase text-sm mb-3">Ingeniería de Software</h2>
                <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">Tecnología que elimina la fricción</h3>
                <p className="text-slate-500 text-xl leading-relaxed">
                    Hemos desarrollado una arquitectura "Offline-First" propietaria. Su operación comercial continúa fluyendo incluso cuando la conectividad falla.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-20">
                
                {/* Feature 1: Precios Dinámicos */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600"><ChartIcon /></div>
                        <h3 className="text-2xl font-bold text-slate-900">Precios Dinámicos Inteligentes</h3>
                    </div>
                    <p className="text-slate-600 text-lg leading-relaxed">
                        El sistema actúa como un gerente comercial automatizado. Detecta el perfil del cliente (Minorista, Mayorista, Super) y aplica la lista de precios correcta al instante.
                    </p>
                    <ul className="space-y-2 mt-2 text-slate-700 font-medium">
                        <li className="flex items-start gap-3"><CheckIcon/> Segmentación automática de clientes.</li>
                        <li className="flex items-start gap-3"><CheckIcon/> Promociones complejas ("Lleva 3 Paga 2").</li>
                        <li className="flex items-start gap-3"><CheckIcon/> Validación de márgenes de rentabilidad en tiempo real.</li>
                    </ul>
                </div>

                {/* Feature 2: App Offline */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600"><CloudIcon /></div>
                        <h3 className="text-2xl font-bold text-slate-900">Fuerza de Ventas "Offline-First"</h3>
                    </div>
                    <p className="text-slate-600 text-lg leading-relaxed">
                        No es una web adaptada. Es una App Nativa Android con base de datos local. Sus vendedores operan con el catálogo completo y cuentas corrientes sin necesidad de señal.
                    </p>
                    <ul className="space-y-2 mt-2 text-slate-700 font-medium">
                        <li className="flex items-start gap-3"><CheckIcon/> Sincronización silenciosa en segundo plano.</li>
                        <li className="flex items-start gap-3"><CheckIcon/> Consulta de deuda histórica sin internet.</li>
                        <li className="flex items-start gap-3"><CheckIcon/> Cero pérdida de pedidos por desconexión.</li>
                    </ul>
                </div>

                {/* Feature 3: Logística & Mapa */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600"><TruckIcon /></div>
                        <h3 className="text-2xl font-bold text-slate-900">Control Logístico de Última Milla</h3>
                    </div>
                    <p className="text-slate-600 text-lg leading-relaxed">
                        Transforme su flota en puntos de venta móviles. El mapa interactivo con "Semáforo Financiero" guía al vendedor hacia las oportunidades más rentables y menos riesgosas.
                    </p>
                    <ul className="space-y-2 mt-2 text-slate-700 font-medium">
                        <li className="flex items-start gap-3"><CheckIcon/> Rendición de carga blindada (Stock vs. Entregado).</li>
                        <li className="flex items-start gap-3"><CheckIcon/> Alertas de deuda crítica en mapa (Rojo/Amarillo/Verde).</li>
                        <li className="flex items-start gap-3"><CheckIcon/> Registro de devoluciones y motivos de rechazo.</li>
                    </ul>
                </div>

                {/* Feature 4: B2B WhatsApp */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-600"><WhatsappIcon /></div>
                        <h3 className="text-2xl font-bold text-slate-900">Ecosistema Omnicanal</h3>
                    </div>
                    <p className="text-slate-600 text-lg leading-relaxed">
                        Rompa la barrera digital. Tecnología "Deep Link" que convierte pedidos de WhatsApp en carritos precargados en la App del vendedor asignado.
                    </p>
                    <ul className="space-y-2 mt-2 text-slate-700 font-medium">
                        <li className="flex items-start gap-3"><CheckIcon/> Catálogo Web Público sin fricción de login.</li>
                        <li className="flex items-start gap-3"><CheckIcon/> Asignación automática de vendedor por enlace.</li>
                        <li className="flex items-start gap-3"><CheckIcon/> Eliminación de errores de tipeo en la toma de pedidos.</li>
                    </ul>
                </div>
            </div>
        </div>
      </section>

      {/* --- NUEVA SECCIÓN: MAPA INTELIGENTE (Formato Móvil) --- */}
      <section id="map" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            
            {/* Texto y Beneficios */}
            <div className="w-full lg:w-1/2 order-2 lg:order-1">
              <div className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-blue-700 uppercase bg-blue-100 rounded-full">
                LOGÍSTICA DE PRECISIÓN
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
                Rutas Inteligentes que <br/>
                <span className="text-blue-600">Ahorran Dinero.</span>
              </h2>
              <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                Nuestra tecnología de <strong>Mapeo Avanzado</strong> no solo le muestra dónde están sus clientes; optimiza dinámicamente el recorrido de su flota. Filtre por zona, deuda o día de visita para generar el trayecto más eficiente posible.
              </p>

              <div className="grid grid-cols-1 gap-6">
                {/* Beneficio 1 */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-md border border-slate-100 flex items-center justify-center text-green-600 flex-shrink-0">
                    <FuelIcon />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">Ahorro de Combustible</h4>
                    <p className="text-slate-500 mt-1">Algoritmos que eliminan kilómetros muertos. Reduzca el gasto operativo de su flota hasta un 25% mensual.</p>
                  </div>
                </div>

                {/* Beneficio 2 */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-md border border-slate-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <FilterIcon />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">Filtros Estratégicos</h4>
                    <p className="text-slate-500 mt-1">Visualice solo lo que importa: clientes con deuda vencida, pedidos pendientes o zonas de baja cobertura.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Imagen del Mapa - FIXED SIZE (MOBILE FORMAT) */}
            <div className="w-full lg:w-1/2 order-1 lg:order-2 flex justify-center lg:justify-end">
              <div className="relative group perspective-1000 w-full max-w-sm mx-auto">
                {/* Glow Effect de fondo */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                
                {/* Card Container - Mobile Size */}
                <div className="relative rounded-2xl shadow-2xl shadow-blue-900/20 border border-slate-200 bg-white overflow-hidden transform transition-all duration-500 group-hover:scale-[1.02]">
                    <img 
                      src={mapImg} 
                      alt="Mapa Inteligente NOAR ERP - Rutas optimizadas y filtros" 
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl"></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- WHITE LABEL SECTION --- */}
      <section id="white-label" className="py-24 bg-slate-900 text-white overflow-hidden">
          <div className="container mx-auto px-4">
              <div className="flex flex-col lg:flex-row items-center gap-16">
                  <div className="w-full lg:w-1/2 order-2 lg:order-1">
                      <div className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-white uppercase bg-white/10 rounded-full backdrop-blur-md">
                          EXCLUSIVO MARCA BLANCA
                      </div>
                      <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Su Marca es el Activo Más Valioso.</h2>
                      <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                          No le vendemos un usuario genérico en una plataforma compartida. Le entregamos su propia infraestructura tecnológica completa. Sus clientes y empleados solo ven su marca, nunca la nuestra.
                      </p>

                      <div className="space-y-6">
                          <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 font-bold text-slate-900 text-xl">1</div>
                              <div>
                                  <h4 className="text-xl font-bold text-white">Apps Nativas Personalizadas</h4>
                                  <p className="text-slate-400 mt-1">Compilamos la App con su logotipo y colores corporativos. Publicación directa en Google Play Store bajo su cuenta.</p>
                              </div>
                          </div>
                          <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 font-bold text-slate-900 text-xl">2</div>
                              <div>
                                  <h4 className="text-xl font-bold text-white">Dominio Corporativo Propio</h4>
                                  <p className="text-slate-400 mt-1">El sistema opera bajo <code>sistema.suempresa.com</code>. Certificados SSL incluidos para máxima seguridad y confianza.</p>
                              </div>
                          </div>
                          <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 font-bold text-slate-900 text-xl">3</div>
                              <div>
                                  <h4 className="text-xl font-bold text-white">Nube Privada Dedicada</h4>
                                  <p className="text-slate-400 mt-1">Sus datos no se mezclan con los de nadie más. Base de datos aislada para garantizar privacidad absoluta y rendimiento.</p>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="w-full lg:w-1/2 order-1 lg:order-2 flex justify-center">
                      <div className="relative w-80 h-80 lg:w-96 lg:h-96">
                          <div className="absolute inset-0 bg-amber-500 rounded-full blur-[100px] opacity-20 animate-pulse"></div>
                          <BrandIcon /> {/* Icono SVG Grande Representativo */}
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* --- FISCALIDAD (PDF Proof) --- */}
      <section id="fiscal" className="py-24 bg-white">
          <div className="container mx-auto px-4">
              <div className="flex flex-wrap items-center">
                  <div className="w-full lg:w-1/2 mb-12 lg:mb-0 pr-0 lg:pr-12">
                      <div className="relative group cursor-pointer shadow-2xl rounded-lg">
                          <img src={facturaImg} alt="Ejemplo Factura AFIP" className="w-full h-auto rounded-lg border border-slate-200" />
                      </div>
                  </div>
                  <div className="w-full lg:w-1/2">
                      <h3 className="text-amber-600 font-bold tracking-widest uppercase text-sm mb-3">Cumplimiento Normativo</h3>
                      <h2 className="text-4xl font-black text-slate-900 mb-6">Facturación AFIP Nativa</h2>
                      <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                          Olvídese de los aplicativos externos. Nuestra conexión directa con WSFEv1 de AFIP permite facturar legalmente en segundos, validando CUITs automáticamente.
                      </p>

                      <ul className="grid grid-cols-1 gap-4">
                          <li className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 font-bold text-slate-700">
                              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center"><CheckIcon/></div>
                              Emisión de Facturas A, B y C.
                          </li>
                          <li className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 font-bold text-slate-700">
                              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center"><CheckIcon/></div>
                              Generación de PDF y QR automático.
                          </li>
                          <li className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 font-bold text-slate-700">
                              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center"><CheckIcon/></div>
                              Envío directo al cliente por WhatsApp.
                          </li>
                      </ul>
                  </div>
              </div>
          </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-32 bg-white text-center relative overflow-hidden border-t border-slate-100">
          <div className="container mx-auto px-4 relative z-10">
              <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-8 tracking-tight">¿Listo para evolucionar?</h2>
              <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto font-light">
                  Conozca en detalle cómo nuestra infraestructura invisible potencia su operación.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <a href="/Distribucion-Inteligente-de-Marca-Blanca.pdf" 
                     target="_blank" 
                     download="Distribucion-Inteligente-de-Marca-Blanca.pdf"
                     className="px-12 py-6 bg-amber-500 text-slate-900 font-bold rounded-full shadow-2xl hover:bg-amber-400 hover:-translate-y-1 transition-all text-xl flex items-center gap-3">
                      MÁS INFORMACIÓN (PDF) <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </a>
              </div>
              <p className="mt-6 text-sm text-slate-400">Sin compromisos. Lectura de 5 minutos.</p>
          </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-950 text-slate-500 py-16 border-t border-slate-900">
          <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
                  <div className="mb-8 md:mb-0">
                      <span className="text-3xl font-black text-white block tracking-tighter">
                          NOAR <span className="text-amber-500 font-light tracking-widest ml-1">ERP</span>
                      </span>
                      <p className="text-sm mt-3 text-slate-500 max-w-xs mx-auto md:mx-0">Infraestructura tecnológica para la distribución moderna.</p>
                  </div>
                  <div className="flex gap-8 text-sm font-bold text-slate-600">
                      <a href="https://wa.me/5493804798844" className="hover:text-amber-500 transition-colors">Soporte Técnico</a>
                      <Link to="/login" className="hover:text-amber-500 transition-colors">Acceso Clientes</Link>
                  </div>
              </div>
              <div className="mt-12 pt-8 border-t border-slate-900 text-center text-xs text-slate-600">
                  <p>© 2025 NOAR Systems. "El protagonista es usted, siempre."</p>
              </div>
          </div>
      </footer>
    </div>
  );
};

export default LandingPage;