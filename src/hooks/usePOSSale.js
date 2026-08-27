import { useState, useEffect, useMemo } from 'react';
import { auth, app } from '../firebase.js';
import { doc, runTransaction, Timestamp, increment, addDoc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'react-toastify';
import { useFirestore } from './useFirestore';
import { useShift } from '../contexts/ShiftContext';
import { useTenant } from '../contexts/TenantContext';
import { printTicket58mm } from '../utils/printTicket58mm';

// Adaptación de la lógica de venta de src/components/POS.jsx (carrito +
// confirmación de pago + AFIP/ARCA) para el POS Móvil. Es una copia
// deliberada, no un refactor compartido: así POS.jsx queda sin tocar y el
// POS de escritorio no corre ningún riesgo por este módulo nuevo. La única
// diferencia de comportamiento es la impresión: acá se imprime un ticket
// térmico de 58mm en vez de la factura A4.
//
// El cálculo de promociones (precio_especial / LLEVA_X_PAGA_Y /
// DESCUENTO_POR_CANTIDAD / REGALO_POR_COMPRA) es el mismo algoritmo que ya
// usa src/components/CatalogoPublico.jsx (única referencia existente de
// "promoción aplicada a un carrito" en el repo — ni POS.jsx ni
// Facturacion.jsx tienen lógica de promociones).
const functions = getFunctions(app, 'southamerica-west1');
const emitirFacturaCloud = httpsCallable(functions, 'emitirFacturasReparto');

export function usePOSSale() {
    const { tenantId, onTenantSnapshot, onTenantSnapshotFiltered, getTenantDoc, getTenantCollection, addTenantDoc, db } = useFirestore();
    const { activeShift } = useShift();
    const { companyConfig, logo: globalLogo } = useTenant();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [clients, setClients] = useState([]);
    const [zonas, setZonas] = useState([]);
    const [promotions, setPromotions] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [cart, setCart] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [isForDelivery, setIsForDelivery] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [autoPrint, setAutoPrint] = useState(true);

    useEffect(() => {
        if (!tenantId) return;
        const unsubP = onTenantSnapshot('productos', (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubC = onTenantSnapshot('categorias', (snap) => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))), [{ field: 'nombre' }]);
        const unsubCl = onTenantSnapshot('clientes', (snap) => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))), [{ field: 'nombre' }]);
        const unsubZ = onTenantSnapshot('zonas', (snap) => setZonas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubPromo = onTenantSnapshotFiltered('promociones', (snap) => {
            setPromotions(snap.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, productoIds: data.productoIds || (data.productoId ? [data.productoId] : []) };
            }));
        }, { wheres: [['estado', '==', 'activa']] });
        return () => { unsubP(); unsubC(); unsubCl(); unsubZ(); unsubPromo(); };
    }, [tenantId]);

    // --- HELPERS DE PROMOCIONES (mismo algoritmo que CatalogoPublico.jsx) ---
    const getProductBasePrice = (product) => {
        const basePrice = Number(product.precio);
        const specialPricePromo = promotions.find(p => p.tipo === 'precio_especial' && p.productoIds?.includes(product.id));
        if (specialPricePromo && specialPricePromo.nuevoPrecio) {
            return { finalPrice: Number(specialPricePromo.nuevoPrecio), originalPrice: basePrice, isPromo: true };
        }
        return { finalPrice: basePrice, originalPrice: basePrice, isPromo: false };
    };

    const getProductPromoBadge = (product) => {
        const promo = promotions.find(p => p.productoIds?.includes(product.id));
        if (!promo) return null;
        if (promo.tipo === 'LLEVA_X_PAGA_Y') return { text: `${promo.condicion?.cantidadMinima}x${promo.beneficio?.cantidadAPagar}`, color: 'bg-blue-500', icon: '⚡' };
        if (promo.tipo === 'DESCUENTO_POR_CANTIDAD') return { text: `-${promo.beneficio?.porcentajeDescuento}% x ${promo.condicion?.cantidadMinima}u`, color: 'bg-green-500', icon: '%' };
        if (promo.tipo === 'REGALO_POR_COMPRA') return { text: `Regalo x ${promo.condicion?.cantidadMinima}`, color: 'bg-purple-500', icon: '🎁' };
        return null;
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            return [...prev, { id: product.id, nombre: product.nombre, precio: product.precio, costo: product.costo || 0, quantity: 1, img: product.img, imgThumb: product.imgThumb, categoriaId: product.categoriaId }];
        });
    };

    // Fija la cantidad exacta de un producto en el carrito (estilo catálogo
    // web: se ingresa la cantidad en un modal en vez de tocar +1 repetidas
    // veces). qty <= 0 saca el producto del carrito.
    const setItemQuantity = (product, qty) => {
        const q = Math.max(0, Math.floor(qty) || 0);
        setCart(prev => {
            if (q <= 0) return prev.filter(item => item.id !== product.id);
            const existing = prev.find(item => item.id === product.id);
            if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: q } : item);
            return [...prev, { id: product.id, nombre: product.nombre, precio: product.precio, costo: product.costo || 0, quantity: q, img: product.img, imgThumb: product.imgThumb, categoriaId: product.categoriaId }];
        });
    };

    const updateQuantity = (id, delta) => setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0));

    const filteredProducts = useMemo(() => products.filter(p =>
        (p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (p.codigoDeBarras || '').includes(searchTerm)) &&
        (selectedCategoryId === 'all' || p.categoriaId === selectedCategoryId)
    ), [products, searchTerm, selectedCategoryId]);

    const selectedClient = clients.find(c => c.id === selectedClientId) || null;

    // Totales con promociones aplicadas: precio_especial ya está reflejado
    // en currentPrice; LLEVA_X_PAGA_Y y DESCUENTO_POR_CANTIDAD restan de
    // itemDiscounts. Mismo algoritmo que CatalogoPublico.jsx:cartTotals.
    const cartTotals = useMemo(() => {
        let subTotalBruto = 0;
        const itemDiscounts = {};

        const cartItemsResolved = cart.map(item => {
            const p = products.find(prod => prod.id === item.id);
            const currentPrice = p ? getProductBasePrice(p).finalPrice : item.precio;
            return { ...item, currentPrice };
        });

        cartItemsResolved.forEach(item => { subTotalBruto += item.currentPrice * item.quantity; });

        promotions.forEach(promo => {
            const matchingItems = cartItemsResolved.filter(item => promo.productoIds?.includes(item.id));
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
        return { subTotalBruto, totalFinal: subTotalBruto - totalDescuentos, totalDescuentos, itemDiscounts, cartItemsResolved };
    }, [cart, products, promotions]);

    // Regalos por compra (REGALO_POR_COMPRA): unidades gratis de OTRO
    // producto, calculadas por lote según la cantidad del/los producto(s)
    // activador(es) en el carrito. Se suman como líneas a $0 al confirmar.
    const calculatedGifts = useMemo(() => {
        const gifts = [];
        promotions.forEach(promo => {
            if (promo.tipo !== 'REGALO_POR_COMPRA') return;
            const triggerIds = promo.productoIds || [];
            const totalTriggerQty = triggerIds.reduce((sum, id) => {
                const item = cart.find(i => i.id === id);
                return sum + (item ? item.quantity : 0);
            }, 0);
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
        });
        return gifts;
    }, [cart, promotions, products]);

    const total = cartTotals.totalFinal;

    const handleConfirmPayment = async (paymentData) => {
        if (!activeShift) { toast.error("Turno cerrado."); return false; }
        const { isAfipEnabled, esCuentaCorriente } = paymentData;
        const isOnline = navigator.onLine;

        if (!isOnline && isAfipEnabled) {
            toast.error("Sin conexión: no se puede emitir factura AFIP offline.");
            return false;
        }

        setIsSaving(isAfipEnabled ? "Iniciando Trámite Fiscal..." : true);

        const client = clients.find(c => c.id === selectedClientId) || { nombre: 'Consumidor Final', id: '' };

        const estadoVenta = esCuentaCorriente
            ? (selectedClientId && isForDelivery ? 'Pendiente de Entrega' : 'Adeuda')
            : (selectedClientId && isForDelivery ? 'Pendiente de Entrega' : 'Pagada');

        const cuitCliente = (client.numeroDocumento || client.cuit || client.dni || '').replace(/\D/g, '');

        const itemsFromCart = cartTotals.cartItemsResolved.map(i => ({ productId: i.id, nombre: i.nombre, precio: i.currentPrice, costo: i.costo, quantity: i.quantity }));
        const itemsFromGifts = calculatedGifts.map(g => ({ productId: g.id, nombre: `🎁 ${g.nombre}`, precio: 0, costo: g.costo || 0, quantity: g.quantity, esRegalo: true }));
        const allItems = [...itemsFromCart, ...itemsFromGifts];

        // Un mismo producto puede aparecer dos veces en allItems (comprado +
        // recibido de regalo por otra promo). Se consolida la cantidad total
        // por producto para el descuento de stock: Firestore no acumula dos
        // t.update()/updateDoc() sobre la misma referencia dentro de una
        // misma operación, el segundo pisaría al primero.
        const stockDeltaByProductId = allItems.reduce((acc, item) => {
            acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
            return acc;
        }, {});
        const stockUpdates = Object.entries(stockDeltaByProductId).map(([productId, quantity]) => ({ productId, quantity }));

        const saleData = {
            companyId: tenantId,
            tipo: 'venta_pos',
            origen: 'pos_movil',
            vendedorId: auth.currentUser?.uid || 'pos',
            vendedorNombre: auth.currentUser?.email || 'Cajero',
            shiftId: activeShift.id,
            fecha: Timestamp.now(),
            items: allItems,
            totalVenta: total,
            descuentoPromociones: cartTotals.totalDescuentos,
            pagoEfectivo: paymentData.pagoEfectivo,
            pagoTransferencia: paymentData.pagoTransferencia,
            pagoTarjeta: paymentData.pagoTarjeta,
            nroCupon: paymentData.nroCupon,
            vuelto: paymentData.vuelto,
            clienteId: client.id || '',
            clienteNombre: client.nombre || 'Consumidor Final',
            clienteCuit: cuitCliente,
            clienteCondicionIVA: client.condicionIva || 'CF',
            clienteTipoDoc: (cuitCliente.length === 11) ? 'CUIT' : 'DNI',
            estado: estadoVenta,
            paymentMethod: esCuentaCorriente ? 'cuenta_corriente' : 'contado',
            saldoPendiente: esCuentaCorriente ? total : 0,
            facturaAfip: isAfipEnabled && !esCuentaCorriente,
            syncPendiente: !isOnline,
            afipLetra: (companyConfig?.taxCondition === 'MT')
                ? 'C'
                : (client.condicionIva === 'RI' ? 'A' : 'B'),
        };

        try {
            let finalSaleId = '';

            if (isOnline) {
                await runTransaction(db, async (t) => {
                    const snaps = [];
                    for (const { productId, quantity } of stockUpdates) {
                        const ref = getTenantDoc('productos', productId);
                        const snap = await t.get(ref);
                        snaps.push({ snap, quantity, ref });
                    }
                    for (const { snap, quantity, ref } of snaps) {
                        if (!snap.exists() || (snap.data().stock || 0) < quantity) {
                            throw new Error(`Stock insuficiente para: ${snap.data()?.nombre || ref.id}`);
                        }
                        t.update(ref, { stock: increment(-quantity) });
                    }
                    const vRef = doc(getTenantCollection('ventas'));
                    t.set(vRef, saleData);
                    finalSaleId = vRef.id;
                });
            } else {
                const vRef = await addDoc(getTenantCollection('ventas'), saleData);
                finalSaleId = vRef.id;
                for (const { productId, quantity } of stockUpdates) {
                    await updateDoc(getTenantDoc('productos', productId), { stock: increment(-quantity) });
                }
                toast.warn("Venta guardada OFFLINE. Se sincronizará al reconectar.", { autoClose: 6000 });
            }

            toast.success(esCuentaCorriente ? `Guardado en cuenta corriente — ${client.nombre}.` : "Venta procesada!");

            if (esCuentaCorriente) {
                setCart([]);
                setSelectedClientId('');
                setIsForDelivery(false);
                setIsSaving(false);
                return true;
            }

            let saleForPDF = { ...saleData, id: finalSaleId };

            if (isAfipEnabled) {
                setIsSaving("Procesando AFIP/ARCA...");
                toast.info("Conectando con ARCA (AFIP)...");
                try {
                    const result = await emitirFacturaCloud({ ventas: [{ ...saleData, id: finalSaleId, companyInfo: companyConfig }] });
                    const resultadoAfip = result.data[0];
                    if (resultadoAfip.status === 'OK') {
                        toast.success("¡Factura autorizada!");
                        saleForPDF = {
                            ...saleForPDF,
                            afipCAE: resultadoAfip.detalle.cae,
                            afipFechaVtoCAE: resultadoAfip.detalle.vtoCAE,
                            afipNumeroComprobante: resultadoAfip.detalle.numero,
                            afipLetra: resultadoAfip.detalle.tipoLetra
                        };
                        try {
                            const afipUpdate = Object.fromEntries(
                                Object.entries({
                                    afipCAE: resultadoAfip.detalle.cae,
                                    afipFechaVtoCAE: resultadoAfip.detalle.vtoCAE,
                                    afipNumeroComprobante: resultadoAfip.detalle.numero,
                                    afipLetra: resultadoAfip.detalle.tipoLetra,
                                    facturaAfip: true
                                }).filter(([, v]) => v !== undefined)
                            );
                            await updateDoc(getTenantDoc('ventas', finalSaleId), afipUpdate);
                            await addTenantDoc('logs_fiscales', {
                                ventaId: finalSaleId,
                                fecha: Timestamp.now(),
                                cae: resultadoAfip.detalle.cae,
                                numero: resultadoAfip.detalle.numero,
                                total: total
                            });
                        } catch (persistError) {
                            console.error("Error al persistir datos AFIP:", persistError);
                            toast.error("Venta OK pero error al guardar datos fiscales. ¡No pierda el ticket!");
                        }
                    } else {
                        toast.error(`Error AFIP: ${resultadoAfip.detalle}`);
                    }
                } catch (afipError) {
                    console.error("Error de comunicación fiscal:", afipError);
                    toast.error("Error de comunicación fiscal.");
                }
            }

            if (autoPrint) {
                const pdfData = {
                    ...saleForPDF,
                    companyInfo: {
                        logo: globalLogo || companyConfig?.logo,
                        name: companyConfig?.name,
                        nombreFantasia: companyConfig?.nombreFantasia || companyConfig?.name,
                        razonSocial: companyConfig?.razonSocial,
                        domicilioFiscal: companyConfig?.domicilioFiscal,
                        taxCondition: companyConfig?.taxCondition,
                        cuit: companyConfig?.cuit,
                        iibb: companyConfig?.iibb,
                        inicioActividades: companyConfig?.inicioActividades,
                        ptoVta: companyConfig?.ptoVta,
                    }
                };
                printTicket58mm(pdfData, client, zonas.find(z => z.id === client.zonaId)?.nombre || 'Local');
            }

            setCart([]);
            setSelectedClientId('');
            setIsForDelivery(false);
            return true;
        } catch (err) {
            toast.error(err.message);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    return {
        activeShift,
        products, categories, clients, zonas, promotions,
        searchTerm, setSearchTerm,
        selectedCategoryId, setSelectedCategoryId,
        filteredProducts,
        cart, addToCart, setItemQuantity, updateQuantity,
        cartTotals, calculatedGifts,
        getProductBasePrice, getProductPromoBadge,
        total, subtotal: cartTotals.subTotalBruto,
        selectedClientId, setSelectedClientId, selectedClient,
        isForDelivery, setIsForDelivery,
        isSaving,
        autoPrint, setAutoPrint,
        handleConfirmPayment,
        companyConfig,
    };
}
