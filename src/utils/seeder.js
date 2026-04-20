import { 
    writeBatch, 
    doc, 
    collection, 
    Timestamp, 
    serverTimestamp,
    getDocs,
    query,
    where,
    limit
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * SEEDER DE DATOS OPERATIVOS (MODO QA)
 * Genera un entorno de prueba completo para un tenant específico.
 */
export const seedCompanyData = async (tenantId) => {
    if (!tenantId) throw new Error("tenantId es requerido para el seeder");

    const batch = writeBatch(db);
    const log = [];

    const getRef = (col) => doc(collection(db, `companies/${tenantId}/${col}`));

    // 1. SEED RUBROS
    const rubrosData = [
        { nombre: 'Kiosco / Almacén', metaSemanal: 50000 },
        { nombre: 'Supermercado', metaSemanal: 200000 },
        { nombre: 'Gastronómico', metaSemanal: 120000 },
    ];
    const rubroRefs = rubrosData.map(r => {
        const ref = getRef('rubros');
        batch.set(ref, { ...r, companyId: tenantId });
        return { id: ref.id, ...r };
    });
    log.push(`Creados ${rubrosData.length} rubros`);

    // 2. SEED ZONAS
    const zonasData = ['Zona Norte (Centro)', 'Zona Sur (Periferia)', 'Distribución Especial'];
    const zonaRefs = zonasData.map(z => {
        const ref = getRef('zonas');
        batch.set(ref, { nombre: z, companyId: tenantId });
        return { id: ref.id, nombre: z };
    });
    log.push(`Creadas ${zonasData.length} zonas`);

    // 3. SEED PRODUCTOS
    const productosData = [
        { nombre: 'Coca Cola 1.5L', precio: 2200, costo: 1800, stock: 100 },
        { nombre: 'Agua Mineral 500ml', precio: 850, costo: 500, stock: 500 },
        { nombre: 'Cerveza Quilmes 1L', precio: 2800, costo: 2100, stock: 48 },
        { nombre: 'Frizzante Blanco 750ml', precio: 3500, costo: 2500, stock: 24 },
        { nombre: 'Energizante Speed', precio: 1200, costo: 900, stock: 120 },
    ];
    const productoRefs = productosData.map(p => {
        const ref = getRef('productos');
        batch.set(ref, { ...p, companyId: tenantId, categoriaId: 'bebidas' });
        return { id: ref.id, ...p };
    });
    log.push(`Creados ${productosData.length} productos`);

    // 4. SEED CLIENTES (20 para probar paginación)
    const clientesNames = [
        "Almacén Don Pepe", "Kiosco El Paso", "Resto Bar Central", "Supermercado Chino Luna",
        "La Esquina de 24", "Drugstore 24hs", "Parrilla Lo de Mary", "Buffet Club Social",
        "Minimercado Express", "Kiosco Jardín", "Bar Los Amigos", "Rotisería Sabor",
        "Mercadito Real", "Almacén de Barrio", "Kiosco La Estación", "Food Truck Park",
        "Cervecería Artesanal", "Pizzería Nápoles", "Vinoteca El Noble", "Kiosco de la Plaza"
    ];

    const clienteRefs = clientesNames.map((name, i) => {
        const ref = getRef('clientes');
        const rubro = rubroRefs[i % rubroRefs.length];
        const zona = zonaRefs[i % zonaRefs.length];
        const data = {
            nombre: name,
            direccion: `Calle Falsa ${100 + i}`,
            localidad: i % 2 === 0 ? 'La Rioja' : 'Chamical',
            barrio: 'Centro',
            telefono: `3804${Math.floor(Math.random() * 899999 + 100000)}`,
            rubroId: rubro.id,
            zonaId: zona.id,
            companyId: tenantId,
            createdAt: serverTimestamp()
        };
        batch.set(ref, data);
        return { id: ref.id, ...data };
    });
    log.push(`Creados ${clientesNames.length} clientes`);

    // 5. SEED VENDEDORES (Para reportes)
    const vRef = getRef('vendedores');
    batch.set(vRef, { nombre: 'Vendedor Seeder', nombreCompleto: 'Vendedor Seeder (QA)', email: 'qa@seeder.com', companyId: tenantId });
    const sampleVendedorId = vRef.id;
    log.push("Creado Vendedor Seeder para pruebas");

    // 6. SEED VENTAS (Historial y Cta Cte)
    for (let i = 0; i < 15; i++) {
        const cliente = clienteRefs[i % 5];
        const ref = getRef('ventas');
        const items = [
            { productId: productoRefs[0].id, nombre: productoRefs[0].nombre, quantity: 6, precio: productoRefs[0].precio },
            { productId: productoRefs[1].id, nombre: productoRefs[1].nombre, quantity: 12, precio: productoRefs[1].precio },
        ];
        const total = items.reduce((acc, it) => acc + (it.precio * it.quantity), 0);
        
        const esAdeuda = i % 2 === 0;
        const saldo = esAdeuda ? total : 0;
        const estado = esAdeuda ? 'Adeuda' : 'Pagada';

        const fecha = new Date();
        fecha.setDate(fecha.getDate() - (i * 2));

        batch.set(ref, {
            clienteId: cliente.id,
            clienteNombre: cliente.nombre,
            companyId: tenantId,
            items,
            totalVenta: total,
            saldoPendiente: saldo,
            estado: estado,
            fecha: Timestamp.fromDate(fecha),
            tipo: 'vta_distribuidora',
            vendedorId: sampleVendedorId
        });
    }
    log.push(`Generadas 15 ventas de prueba vinculadas al Vendedor Seeder`);

    await batch.commit();
    console.table(log);
    return log;
};

/**
 * SIMULADOR DE JORNADA REAL (MODO CAJA/AUDITORÍA)
 * Inyecta movimientos para PROBAR LA CAJA (Ventas de hoy, Cobros de hoy, Gastos de hoy).
 */
export const seedWorkdaySimulation = async (tenantId, shiftId = null) => {
    if (!tenantId) throw new Error("tenantId es requerido");

    const log = [];
    const getColRef = (col) => collection(db, `companies/${tenantId}/${col}`);
    const getDocRef = (col) => doc(getColRef(col));

    // 1. LIMPIEZA PREVIA (Opcional por Shift)
    if (shiftId) {
        log.push(`🧹 Limpiando movimientos previos del turno: ${shiftId}`);
        const tables = ['ventas', 'cobranzas', 'gastos'];
        for (const table of tables) {
            const q = query(getColRef(table), where('shiftId', '==', shiftId));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const delBatch = writeBatch(db);
                snap.docs.forEach(d => delBatch.delete(d.ref));
                await delBatch.commit();
                log.push(`   - Borrados ${snap.size} registros de ${table}`);
            }
        }
    }

    // 2. OBTENER REFERENCIAS REALES
    const [cSnap, pSnap, vSnap] = await Promise.all([
        getDocs(query(getColRef('clientes'), limit(1))),
        getDocs(query(getColRef('productos'), limit(2))),
        getDocs(query(getColRef('vendedores'), limit(1)))
    ]);

    if (cSnap.empty || pSnap.empty) {
        throw new Error("No hay clientes o productos. Ejecuta 'Poblar Catálogo' primero.");
    }

    const cliente = { id: cSnap.docs[0].id, ...cSnap.docs[0].data() };
    const productos = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const vendedor = !vSnap.empty ? { id: vSnap.docs[0].id, ...vSnap.docs[0].data() } : { id: 'admin', nombre: 'Administrador' };

    const batch = writeBatch(db);

    // 3. UNA VENTA EN EFECTIVO (Hoy)
    const itemsVta1 = [{ productId: productos[0].id, nombre: productos[0].nombre, quantity: 2, precio: productos[0].precio }];
    const totalVta1 = itemsVta1[0].precio * itemsVta1[0].quantity;

    const vEfeRef = getDocRef('ventas');
    batch.set(vEfeRef, {
        clienteId: cliente.id,
        clienteNombre: cliente.nombre,
        companyId: tenantId,
        shiftId: shiftId,
        vendedorId: vendedor.id,
        fecha: Timestamp.now(),
        totalVenta: totalVta1,
        pagoEfectivo: totalVta1,
        pagoTransferencia: 0,
        pagoTarjeta: 0,
        saldoPendiente: 0,
        estado: 'Pagada',
        items: itemsVta1,
        tipo: 'vta_pos'
    });
    log.push(`✅ Venta $${totalVta1} (Efectivo) reg. con Vendedor: ${vendedor.nombre}`);

    // 4. UNA COBRANZA (Deuda anterior)
    const cobRef = getDocRef('cobranzas');
    batch.set(cobRef, {
        companyId: tenantId,
        shiftId: shiftId,
        vendedorId: vendedor.id,
        clienteId: cliente.id,
        clienteNombre: cliente.nombre,
        monto: 3500,
        metodoPago: 'Efectivo',
        fecha: Timestamp.now(),
        detalle: "Pago de factura antigua (Simulación)",
        rendido: false
    });
    log.push("✅ Cobranza $3.500 (Efectivo) registrada (Sin rendir)");

    // 5. UN GASTO
    const gastoRef = getDocRef('gastos');
    batch.set(gastoRef, {
        companyId: tenantId,
        shiftId: shiftId,
        detalle: "Combustible (Seeder Simulation)",
        monto: 1200,
        metodoPago: 'Efectivo',
        fechaGasto: Timestamp.now()
    });
    log.push("✅ Gasto $1.200 (Efectivo) registrado");

    await batch.commit();
    log.push("🔥 Simulación completada. Datos 100% trazables.");
    return log;
};
