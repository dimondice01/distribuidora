import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { db } from '../firebase';
// ✅ AGREGAMOS: addDoc y serverTimestamp para el link corto
import { collection, onSnapshot, query, where, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';

// --- LOGO NOAR ERP (Estilo Landing) ---
const NoarLogoLight = () => (
    <div className="flex items-center gap-3 cursor-pointer group select-none">
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:scale-105 transition-transform">
            <span className="text-amber-400 font-black text-2xl">N</span>
        </div>
        <div className="flex flex-col leading-none">
            <span className="text-2xl font-black tracking-tighter text-slate-900">
                NOAR <span className="text-amber-600 font-light tracking-widest text-lg">ERP</span>
            </span>
        </div>
    </div>
);

// --- Iconos Estilo iOS ---
const CartIcon = ({ count }) => (
    <div className="relative group cursor-pointer transition-transform active:scale-95">
        <div className="p-2.5 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
        </div>
        {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-sm ring-2 ring-white animate-bounce-short">
                {count}
            </span>
        )}
    </div>
);

const SearchIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const CloseIcon = () => <svg className="w-8 h-8 text-gray-500 bg-gray-100 rounded-full p-1.5 hover:bg-gray-200 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const GiftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" /><path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" /></svg>;
const FireIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.45-.412-1.725a1 1 0 00-1.457-.895c-1.387.634-2.182 2.055-2.019 3.789.164 1.734 1.391 3.158 2.793 3.975C7.548 16.049 9.73 16.5 11.976 15.46c2.246-1.04 3.596-3.507 3.35-5.854-.123-1.174-.842-2.165-1.91-2.719a5.838 5.838 0 00-1.021-.334z" clipRule="evenodd" /></svg>;
const UserCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// --- COMPONENTE VISUAL: SKELETON CARD ---
const SkeletonProduct = () => (
    <div className="bg-white rounded-[1.5rem] p-3 border border-gray-100 shadow-sm">
        <div className="aspect-square bg-gray-100 rounded-2xl mb-3 animate-pulse"></div>
        <div className="space-y-2 mb-3">
            <div className="h-4 bg-gray-100 rounded-lg w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-100 rounded-lg w-1/3 animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-100 rounded-xl w-full animate-pulse"></div>
    </div>
);

export default function CatalogoPublico() {
    const { lista } = useParams();
    const [searchParams] = useSearchParams();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [companyId, setCompanyId] = useState(null);
    const [companyData, setCompanyData] = useState(null);

    const [cart, setCart] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // ESTADO DE CARGA AL ENVIAR (Para evitar doble click)
    const [isSending, setIsSending] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [vendorData, setVendorData] = useState(null);

    const [qtyModalOpen, setQtyModalOpen] = useState(false);
    const [selectedProductForQty, setSelectedProductForQty] = useState(null);
    const [qtyInputValue, setQtyInputValue] = useState('');
    const [clienteNombre, setClienteNombre] = useState('');
    const qtyInputRef = useRef(null);

    useEffect(() => {
        const cId = searchParams.get('c');
        if (!cId) {
            setLoading(false);
            return;
        }
        setCompanyId(cId);

        const qProducts = query(collection(db, 'companies', cId, 'productos'));
        const unsubProducts = onSnapshot(qProducts, (snap) => {
            setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const qCats = query(collection(db, 'companies', cId, 'categorias'));
        const unsubCategories = onSnapshot(qCats, (snap) => {
            setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const qPromos = query(collection(db, 'companies', cId, 'promociones'), where('estado', '==', 'activa'));
        const unsubPromos = onSnapshot(qPromos, (snap) => {
            setPromotions(snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
                productoIds: d.data().productoIds || (d.data().productoId ? [d.data().productoId] : [])
            })));
        });

        // Cargar Identidad de Empresa (Branding)
        const unsubCompany = onSnapshot(doc(db, 'companies', cId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCompanyData(prev => ({ ...prev, ...data }));
            }
        });

        // Cargar Nombre de Fantasía de Configuración
        const qConfig = query(collection(db, 'companies', cId, 'config'), where('tipo', '==', 'branding'));
        const unsubConfig = onSnapshot(qConfig, (snap) => {
            if (!snap.empty) {
                const configData = snap.docs[0].data();
                setCompanyData(prev => ({ ...prev, nombreFantasia: configData.nombreFantasia }));
            }
            setLoading(false);
        });

        return () => {
            unsubProducts();
            unsubCategories();
            unsubPromos();
            unsubCompany();
            unsubConfig();
        };
    }, [searchParams]);

    useEffect(() => {
        const vendorId = searchParams.get('v');
        const cId = searchParams.get('c');
        if (vendorId && cId) {
            const fetchVendor = async () => {
                try {
                    const docRef = doc(db, 'companies', cId, 'vendedores', vendorId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setVendorData({
                            nombre: data.nombreCompleto,
                            telefono: data.telefono || ''
                        });
                    }
                } catch (error) {
                    console.error("Error cargando vendedor:", error);
                }
            };
            fetchVendor();
        }
    }, [searchParams]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory]);

    const getProductBasePrice = (product) => {
        let basePrice = Number(product.precio);
        if (lista && product.preciosExtra && product.preciosExtra[lista]) {
            basePrice = Number(product.preciosExtra[lista]);
        }

        const specialPricePromo = promotions.find(p =>
            p.tipo === 'precio_especial' && p.productoIds?.includes(product.id)
        );

        let finalPrice = basePrice;
        let isPromo = false;

        if (specialPricePromo && specialPricePromo.nuevoPrecio) {
            finalPrice = Number(specialPricePromo.nuevoPrecio);
            isPromo = true;
        }

        return { finalPrice, originalPrice: basePrice, isPromo };
    };

    const getProductPromoBadge = (product) => {
        const promo = promotions.find(p => p.productoIds?.includes(product.id));
        if (!promo) return null;

        if (promo.tipo === 'LLEVA_X_PAGA_Y') {
            return { text: `${promo.condicion?.cantidadMinima}x${promo.beneficio?.cantidadAPagar}`, color: 'bg-blue-500', icon: '⚡' };
        }
        if (promo.tipo === 'DESCUENTO_POR_CANTIDAD') {
            return { text: `-${promo.beneficio?.porcentajeDescuento}% x ${promo.condicion?.cantidadMinima}u`, color: 'bg-green-500', icon: '%' };
        }
        if (promo.tipo === 'REGALO_POR_COMPRA') {
            return { text: `Regalo x ${promo.condicion?.cantidadMinima}`, color: 'bg-purple-500', icon: '🎁' };
        }
        return null;
    };

    const calculatedGifts = useMemo(() => {
        const gifts = [];
        promotions.forEach(promo => {
            if (promo.tipo === 'REGALO_POR_COMPRA') {
                const triggerIds = promo.productoIds || [];
                const totalTriggerQty = triggerIds.reduce((sum, id) => sum + (cart[id] || 0), 0);
                const minQty = parseInt(promo.condicion?.cantidadMinima || 0);
                const giftQtyPerBatch = parseInt(promo.beneficio?.cantidadRegalo || 0);
                const giftId = promo.beneficio?.productoRegaloId;

                if (minQty > 0 && giftQtyPerBatch > 0 && giftId && totalTriggerQty >= minQty) {
                    const batches = Math.floor(totalTriggerQty / minQty);
                    const totalGifts = batches * giftQtyPerBatch;
                    const giftProduct = products.find(p => p.id === giftId);
                    if (totalGifts > 0 && giftProduct) {
                        gifts.push({ ...giftProduct, quantity: totalGifts, isGift: true });
                    }
                }
            }
        });
        return gifts;
    }, [cart, promotions, products]);

    const cartTotals = useMemo(() => {
        let subTotalBruto = 0;
        const itemDiscounts = {};

        const cartItems = Object.keys(cart).map(id => {
            const p = products.find(prod => prod.id === id);
            if (!p) return null;
            const { finalPrice } = getProductBasePrice(p);
            return { ...p, quantity: cart[id], currentPrice: finalPrice };
        }).filter(Boolean);

        cartItems.forEach(item => { subTotalBruto += item.currentPrice * item.quantity; });

        promotions.forEach(promo => {
            const matchingItems = cartItems.filter(item => promo.productoIds?.includes(item.id));
            if (matchingItems.length === 0) return;
            const totalQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);

            if (promo.tipo === 'LLEVA_X_PAGA_Y' && promo.condicion?.cantidadMinima && promo.beneficio?.cantidadAPagar) {
                const X = Number(promo.condicion.cantidadMinima);
                const Y = Number(promo.beneficio.cantidadAPagar);
                if (totalQty >= X && X > 0) {
                    const itemsGratis = Math.floor(totalQty / X) * (X - Y);
                    if (itemsGratis > 0) {
                        let allUnits = [];
                        matchingItems.forEach(i => { for (let k = 0; k < i.quantity; k++) allUnits.push(i.currentPrice); });
                        allUnits.sort((a, b) => a - b);
                        const discountVal = allUnits.slice(0, itemsGratis).reduce((a, b) => a + b, 0);
                        itemDiscounts[matchingItems[0].id] = (itemDiscounts[matchingItems[0].id] || 0) + discountVal;
                    }
                }
            } else if (promo.tipo === 'DESCUENTO_POR_CANTIDAD' && promo.condicion?.cantidadMinima) {
                const minQty = Number(promo.condicion.cantidadMinima);
                const pct = Number(promo.beneficio?.porcentajeDescuento || 0);
                if (totalQty >= minQty && pct > 0) {
                    matchingItems.forEach(item => {
                        const discountVal = (item.currentPrice * item.quantity) * (pct / 100);
                        itemDiscounts[item.id] = (itemDiscounts[item.id] || 0) + discountVal;
                    });
                }
            }
        });

        const totalDescuentos = Object.values(itemDiscounts).reduce((a, b) => a + b, 0);
        return { subTotalBruto, totalFinal: subTotalBruto - totalDescuentos, totalDescuentos, itemDiscounts };
    }, [cart, products, promotions, lista]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchSearch = (p.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = selectedCategory ? p.categoriaId === selectedCategory : true;
            return matchSearch && matchCat;
        });
    }, [products, searchTerm, selectedCategory]);

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const currentItems = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const updateCartQty = (id, qty) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (qty <= 0) delete newCart[id]; else newCart[id] = qty;
            return newCart;
        });
    };

    const openQtyModal = (product) => {
        if ((product.stock || 0) <= 0) return; // Bloqueo de seguridad
        setSelectedProductForQty(product);
        setQtyInputValue(cart[product.id] ? String(cart[product.id]) : '1');
        setQtyModalOpen(true);
        setTimeout(() => qtyInputRef.current?.select(), 100);
    };

    const handleQtySubmit = (e) => {
        e.preventDefault();
        const qty = parseInt(qtyInputValue);

        // Validación extra de stock al escribir manual
        if (selectedProductForQty && qty > selectedProductForQty.stock) {
            alert(`Solo hay ${selectedProductForQty.stock} unidades disponibles.`);
            return;
        }

        if (!isNaN(qty) && selectedProductForQty) updateCartQty(selectedProductForQty.id, qty);
        setQtyModalOpen(false);
    };

    // ✅ LÓGICA NUEVA: LINK CORTO EN WHATSAPP + FIRESTORE TEMP
    const handleCheckout = async () => {
        const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
        if (totalItems === 0) return;

        setIsSending(true); // Loader en botón

        try {
            const itemsForLink = [];
            Object.keys(cart).forEach(id => {
                const p = products.find(prod => prod.id === id);
                if (p) {
                    const { finalPrice } = getProductBasePrice(p);
                    itemsForLink.push({ 
                        id: p.id, 
                        nombre: p.nombre, 
                        precio: finalPrice, 
                        quantity: cart[id],
                        subtotal: finalPrice * cart[id]
                    });
                }
            });

            // 1. Guardar Ticket en Firestore (Colección PEDIDOS_TEMPORALES según requisito Móvil)
            const docRef = await addDoc(collection(db, "companies", companyId, "pedidos_temporales"), {
                tipo: "venta",
                estado: "Web: Pendiente",
                source: "web_catalog",
                vendedorId: searchParams.get('v') || 'sin_asignar',
                listaPrecios: lista || 'Base',
                clienteId: '', // Se vinculará en Desktop
                clienteNombre: clienteNombre || 'Cliente Web',
                items: itemsForLink,
                totalVenta: cartTotals.totalFinal,
                fecha: serverTimestamp(),
                companyId: companyId
            });

            // 2. Generar Mensaje con Link Corto
            let message = `*¡Hola${vendorData ? ' ' + vendorData.nombre : ''}! Quiero hacer un pedido${lista ? ` (Lista: ${lista})` : ''}:*\n\n`;

            // Resumen texto para humano
            Object.keys(cart).forEach(id => {
                const p = products.find(prod => prod.id === id);
                if (p) {
                    const { finalPrice } = getProductBasePrice(p);
                    const qty = cart[id];
                    const subtotal = finalPrice * qty;
                    message += `📦 ${qty}x ${p.nombre} ($${subtotal.toLocaleString('es-AR')})\n`;
                }
            });

            if (calculatedGifts.length > 0) {
                message += `\n*🎁 REGALOS INCLUIDOS:*\n`;
                calculatedGifts.forEach(gift => {
                    message += `🎉 ${gift.quantity}x ${gift.nombre} (GRATIS)\n`;
                });
            }

            if (cartTotals.totalDescuentos > 0) {
                message += `\n🎉 *Descuentos aplicados: -$${cartTotals.totalDescuentos.toLocaleString('es-AR')}*\n`;
            }

            message += `\n💰 *Total Estimado: $${cartTotals.totalFinal.toLocaleString('es-AR')}*`;
            message += `\n\n📍 *[TOCA AQUÍ PARA CARGAR EN APP]* 👇\n`;

            // EL LINK MAGICO CORTO 
            // Delegamos la lectura a la App Móvil (Opción 1), ya que ella tiene los permisos nativos de Firebase para leer 'pedidos_temporales'
            const webLink = `${window.location.origin}/abrir-pedido?orderId=${docRef.id}&c=${companyId}`;
            message += webLink;

            const targetPhone = vendorData?.telefono ? vendorData.telefono.replace(/\D/g, '') : '';
            const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

            window.open(whatsappUrl, '_blank');

            setCart({});
            setIsCartOpen(false);
            setShowSuccess(true);

        } catch (error) {
            console.error("Error checkout:", error);
            alert("Hubo un problema al generar el pedido. Intente nuevamente.");
        } finally {
            setIsSending(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-white font-sans text-gray-900 pb-32">
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100/50">
                <div className="max-w-5xl mx-auto px-4 pt-4 pb-2">
                    <div className="flex justify-between items-center mb-3">
                        <div className="space-y-2">
                            <div className="h-8 w-32 bg-gray-100 rounded-lg animate-pulse"></div>
                            <div className="h-4 w-48 bg-gray-50 rounded-lg animate-pulse"></div>
                        </div>
                        <div className="h-10 w-10 bg-gray-100 rounded-full animate-pulse"></div>
                    </div>
                    <div className="w-full h-12 bg-gray-100 rounded-2xl animate-pulse mb-3"></div>
                    <div className="flex gap-2 overflow-hidden">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-9 w-24 bg-gray-100 rounded-full animate-pulse"></div>)}
                    </div>
                </div>
            </div>
            <div className="max-w-5xl mx-auto p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <SkeletonProduct key={i} />)}
                </div>
            </div>
        </div>
    );

    if (!companyId) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
                <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">🏬</span>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Catálogo No Encontrado</h2>
                <p className="text-slate-500 font-medium leading-relaxed mb-6">
                    Este enlace no parece contener una tienda válida. Por favor, solicita un link oficial a tu distribuidor.
                </p>
                <div className="h-1 w-12 bg-amber-400 rounded-full mx-auto"></div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 pb-32">

            {/* --- HEADER --- */}
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100/50 transition-all duration-300">
                <div className="max-w-5xl mx-auto px-4 pt-4 pb-2">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                                {/* Identidad Dinámica */}
                                {companyData?.logo ? (
                                    <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex-shrink-0 animate-fade-in bg-white p-1">
                                        <img src={companyData.logo} alt="Logo" className="w-full h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                                        <span className="text-amber-400 font-black text-2xl">
                                            {(companyData?.nombreFantasia || companyData?.name || 'N').charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex flex-col leading-none">
                                    <span className="text-xl font-black tracking-tight text-slate-900 uppercase">
                                        {companyData?.nombreFantasia || companyData?.name || 'Cargando...'}
                                    </span>
                                    <span className="text-[10px] font-bold text-blue-600 tracking-widest uppercase opacity-60">Catálogo Digital</span>
                                </div>
                                {lista && <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-100 ml-1">{lista}</span>}
                            </div>
                            {vendorData && (
                                <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-2 animate-fade-in bg-green-50 w-fit px-2 py-0.5 rounded-lg">
                                    <UserCheckIcon className="w-3 h-3 text-green-500" />
                                    Vendedor: <span className="text-gray-800 font-bold">{vendorData.nombre}</span>
                                </p>
                            )}
                        </div>
                        <button onClick={() => setIsCartOpen(true)} className="relative hover:scale-105 transition-transform active:scale-95">
                            <CartIcon count={Object.values(cart).reduce((a, b) => a + b, 0)} />
                        </button>
                    </div>

                    <div className="relative mb-3">
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-100 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all outline-none font-medium border-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-3 top-3.5"><SearchIcon /></span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 items-center">
                        <button
                            onClick={() => setIsPromoModalOpen(true)}
                            className="flex items-center gap-1 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all shadow-sm bg-gradient-to-r from-orange-400 to-pink-500 text-white hover:opacity-90 active:scale-95 border border-transparent"
                        >
                            <FireIcon className="text-white"/> Promociones
                        </button>

                        <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>

                        <button 
                            onClick={() => setSelectedCategory('')}
                            className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all border ${!selectedCategory ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                        >
                            Todo
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id} 
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all border ${selectedCategory === cat.id ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                            >
                                {cat.nombre}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- GRILLA CON PAGINACIÓN --- */}
            <div className="max-w-5xl mx-auto p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {currentItems.map(product => {
                        const { finalPrice, originalPrice, isPromo } = getProductBasePrice(product);
                        const promoBadge = getProductPromoBadge(product);
                        const qty = cart[product.id] || 0;

                        // ✅ CONTROL DE STOCK VISUAL
                        const hasStock = (product.stock || 0) > 0;

                        return (
                            <div key={product.id} className={`group bg-white rounded-[1.5rem] p-3 border transition-all duration-300 relative ${hasStock ? (qty > 0 ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2 shadow-lg' : 'border-gray-100 hover:shadow-xl hover:border-gray-200') : 'border-gray-200 opacity-60 grayscale pointer-events-none select-none'}`}>

                                <div
                                    className="aspect-square bg-gray-50 rounded-2xl relative cursor-pointer overflow-hidden mb-3"
                                    onClick={() => hasStock && openQtyModal(product)}
                                >
                                    {product.imgThumb || product.img ? (
                                        <img src={product.imgThumb || product.img} alt={product.nombre} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                    )}

                                    {/* ✅ BADGE AGOTADO */}
                                    {!hasStock && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px] z-20">
                                            <div className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg transform -rotate-12 border-2 border-white">AGOTADO</div>
                                        </div>
                                    )}

                                    {hasStock && promoBadge && (
                                        <div className={`absolute top-2 left-2 ${promoBadge.color} text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm tracking-wide backdrop-blur-sm bg-opacity-95 z-10`}>
                                            {promoBadge.text}
                                        </div>
                                    )}
                                    {hasStock && !promoBadge && isPromo && (
                                        <div className="absolute top-2 left-2 bg-amber-400 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm tracking-wide backdrop-blur-sm bg-opacity-95 z-10">
                                            OFERTA
                                        </div>
                                    )}

                                    {qty > 0 && <div className="absolute bottom-2 right-2 bg-blue-600 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white z-10">{qty}</div>}
                                </div>

                                <div className="flex flex-col justify-between h-[6.5rem]">
                                    <div>
                                        <h3 className="text-[15px] font-bold text-gray-900 leading-tight line-clamp-2 mb-1 h-[2.4rem]" title={product.nombre}>
                                            {product.nombre}
                                        </h3>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg font-extrabold text-gray-900">${finalPrice.toLocaleString('es-AR')}</span>
                                            {isPromo && hasStock && <span className="text-xs text-gray-400 line-through decoration-gray-300">${originalPrice}</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => hasStock && openQtyModal(product)}
                                        disabled={!hasStock}
                                        className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm ${!hasStock ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' : (qty > 0 ? 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100' : 'bg-gray-900 text-white hover:bg-gray-800')}`}
                                    >
                                        {hasStock ? (qty > 0 ? 'Editar Cantidad' : 'Agregar') : 'Sin Stock'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* --- CONTROLES DE PAGINACIÓN --- */}
                {filteredProducts.length > itemsPerPage && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <button
                            onClick={() => {
                                setCurrentPage(prev => Math.max(prev - 1, 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={currentPage === 1}
                            className={`px-4 py-2 rounded-xl font-bold transition-colors ${currentPage === 1 ? 'text-gray-300 bg-gray-50' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
                        >
                            Anterior
                        </button>

                        <span className="text-sm font-medium text-gray-500">
                            Página <span className="text-gray-900 font-bold">{currentPage}</span> de {totalPages}
                        </span>

                        <button
                            onClick={() => {
                                setCurrentPage(prev => Math.min(prev + 1, totalPages));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={currentPage === totalPages}
                            className={`px-4 py-2 rounded-xl font-bold transition-colors ${currentPage === totalPages ? 'text-gray-300 bg-gray-50' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
                        >
                            Siguiente
                        </button>
                    </div>
                )}

                {filteredProducts.length === 0 && <div className="text-center py-20 text-gray-400 font-medium">No se encontraron productos.</div>}
            </div>

            {/* --- MODAL PROMOS VIGENTES --- */}
            {isPromoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 relative max-h-[80vh] flex flex-col">
                        <button onClick={() => setIsPromoModalOpen(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition"><CloseIcon /></button>

                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-2xl">🔥</span>
                            <h2 className="text-xl font-extrabold text-gray-900">Promociones Vigentes</h2>
                        </div>

                        <div className="overflow-y-auto pr-2 space-y-4 flex-1">
                            {promotions.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">No hay promociones activas en este momento.</p>
                            ) : (
                                promotions.map(promo => (
                                    <div key={promo.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-gray-800">{promo.nombrePromocion}</h3>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full text-white uppercase ${promo.tipo === 'REGALO_POR_COMPRA' ? 'bg-purple-500' : (promo.tipo === 'DESCUENTO_POR_CANTIDAD' ? 'bg-green-500' : 'bg-blue-500')}`}>
                                                {promo.tipo === 'LLEVA_X_PAGA_Y' ? 'Pack Ahorro' : (promo.tipo === 'REGALO_POR_COMPRA' ? 'Regalo' : 'Descuento')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-3">{promo.descripcion}</p>
                                        <div className="text-xs font-semibold text-gray-500 bg-white p-2 rounded-lg border border-gray-200 inline-block">
                                            👉 {promo.productoNombre}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <button onClick={() => setIsPromoModalOpen(false)} className="mt-6 w-full py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition">Entendido</button>
                    </div>
                </div>
            )}

            {/* --- MODAL CANTIDAD --- */}
            {qtyModalOpen && selectedProductForQty && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/60 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-xs rounded-[2rem] shadow-2xl p-8 transform transition-all scale-100 border border-gray-100">
                        <h3 className="text-center text-lg font-bold text-gray-900 mb-1 line-clamp-1">{selectedProductForQty.nombre}</h3>
                        <p className="text-center text-gray-400 text-sm mb-8 font-medium">Ingresa cantidad</p>
                        <form onSubmit={handleQtySubmit}>
                            <input
                                ref={qtyInputRef}
                                type="number"
                                className="w-full text-center text-5xl font-black text-blue-600 border-b-2 border-gray-100 focus:border-blue-500 outline-none py-2 mb-8 bg-transparent placeholder-gray-200 transition-colors"
                                value={qtyInputValue}
                                onChange={(e) => setQtyInputValue(e.target.value)}
                                placeholder="0"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setQtyModalOpen(false)} className="py-3.5 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Cancelar</button>
                                <button type="submit" className="py-3.5 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-colors">Confirmar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL ÉXITO (CONFIRMACIÓN) --- */}
            {showSuccess && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl scale-100 transition-transform">
                        <div className="mb-6 animate-bounce-short">
                            <CheckCircleIcon />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">¡Pedido Enviado!</h2>
                        <p className="text-gray-500 mb-8 font-medium leading-relaxed">
                            Serás redirigido a WhatsApp para finalizar.
                        </p>
                        <button
                            onClick={() => setShowSuccess(false)}
                            className="w-full py-4 rounded-2xl font-bold text-white text-lg bg-green-500 hover:bg-green-600 shadow-xl shadow-green-200 transition-all active:scale-95"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {/* --- BOTTOM SHEET CARRITO --- */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
                    <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-[2rem] shadow-2xl relative flex flex-col max-h-[85vh] animate-slide-up overflow-hidden">

                        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Tu Pedido</h2>
                                <p className="text-sm text-gray-400 font-medium">{Object.values(cart).reduce((a, b) => a + b, 0)} items</p>
                            </div>
                            <button onClick={() => setIsCartOpen(false)} className="transition-transform active:scale-90"><CloseIcon /></button>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-6 flex-1 bg-white">
                            {/* CAMPO NOMBRE CLIENTE (Protocolo Perfecto) */}
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-2">
                                <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Tu Nombre / Negocio</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Juan Pérez / Kiosco El Sol"
                                    className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={clienteNombre}
                                    onChange={(e) => setClienteNombre(e.target.value)}
                                />
                            </div>

                            {Object.keys(cart).length === 0 ? (
                                <div className="text-center py-12 text-gray-400 font-medium">Tu carrito está vacío 🛒</div>
                            ) : (
                                <>
                                    {/* ITEMS NORMALES */}
                                    {Object.keys(cart).map(id => {
                                        const p = products.find(prod => prod.id === id);
                                        if (!p) return null;
                                        const { finalPrice } = getProductBasePrice(p);
                                        const discount = cartTotals.itemDiscounts[id] || 0;

                                        return (
                                            <div key={id} className="flex gap-4 items-center group border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                                <div className="w-16 h-16 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100">{(p.imgThumb || p.img) ? <img src={p.imgThumb || p.img} className="w-full h-full object-cover" /> : null}</div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-gray-900 line-clamp-1 mb-0.5">{p.nombre}</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <p className="text-xs font-medium text-gray-400">${finalPrice} x {cart[id]}</p>
                                                        {discount > 0 && <span className="text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-full">-{discount}</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900 text-lg">${(finalPrice * cart[id]).toLocaleString('es-AR')}</p>
                                                    <button onClick={() => openQtyModal(p)} className="text-xs text-blue-600 font-bold mt-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors">Editar</button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* 🎁 SECCIÓN REGALOS */}
                                    {calculatedGifts.length > 0 && (
                                        <div className="mt-2 pt-6 border-t border-dashed border-gray-200 bg-purple-50/30 rounded-2xl p-4">
                                            <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-3 flex items-center gap-2"><GiftIcon /> Regalos Aplicados</h4>
                                            {calculatedGifts.map((gift, idx) => (
                                                <div key={`gift-${idx}`} className="flex gap-3 items-center mb-3 last:mb-0">
                                                    <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm border border-purple-100">
                                                        {(gift.imgThumb || gift.img) ? <img src={gift.imgThumb || gift.img} className="w-full h-full object-cover" /> : <span className="text-lg">🎁</span>}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-purple-900 line-clamp-1">{gift.nombre}</p>
                                                        <p className="text-xs text-purple-600 font-bold">{gift.quantity} unidades GRATIS</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-50 bg-white safe-area-pb shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                            {cartTotals.totalDescuentos > 0 && (
                                <div className="flex justify-between items-center mb-2 text-green-600">
                                    <span className="text-sm font-medium">Ahorras</span>
                                    <span className="font-bold">-${cartTotals.totalDescuentos.toLocaleString('es-AR')}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Total Estimado</span>
                                <span className="text-3xl font-black text-gray-900">${cartTotals.totalFinal.toLocaleString('es-AR')}</span>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={Object.keys(cart).length === 0 || isSending}
                                className={`w-full py-4 rounded-2xl font-bold text-white text-lg shadow-xl shadow-green-200/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${Object.keys(cart).length === 0 || isSending ? 'bg-gray-100 cursor-not-allowed text-gray-400 shadow-none' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:to-emerald-700'}`}
                            >
                                {/* 8. BOTÓN PERSONALIZADO CON LOADING */}
                                {isSending ? (
                                    <span className="flex items-center gap-2 animate-pulse">
                                        Enviando...
                                    </span>
                                ) : (
                                    vendorData ? `Enviar a ${vendorData.nombre}` : 'Confirmar por WhatsApp'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}