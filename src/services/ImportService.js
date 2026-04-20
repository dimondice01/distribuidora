import { db } from '../firebase';
import { collection, doc, getDocs, query, where, writeBatch, Timestamp } from 'firebase/firestore';

/**
 * Convierte un número serial de fecha de Excel a un objeto Date de JS.
 */
const excelDateToJSDate = (serial) => {
    if (!serial || isNaN(serial)) return new Date();
    // Excel cuenta días desde 30/12/1899. 
    // Restamos 25569 (días entre 1899 y 1970) y convertimos a ms.
    return new Date(Math.round((serial - 25569) * 86400 * 1000));
};

/**
 * Normaliza un string para comparaciones de unicidad.
 */
const normalize = (str) => {
    if (!str) return "";
    return str.toString().trim().toUpperCase().replace(/\s+/g, ' ');
};

/**
 * Parsea la columna OBSERVACIONES para detectar matafuegos.
 * Patrón: [Cantidad] * [Capacidad] [Tipo]
 * Ejemplos: "2*10 ABC", "1 x 5kg BC", "3*5 ABC / 2*10 HCFC"
 */
export const parseMatafuegos = (observations) => {
    if (!observations) return [];
    
    // 1. Dividimos por '/' para evitar que el regex sea demasiado ambicioso
    const sections = observations.toString().split('/');
    const assets = [];

    // Regex mejorado: Grupo 1 (Cantidad), Grupo 2 (Capacidad), Grupo 3 (Tipo)
    // Solo captura letras, números y espacios en el tipo, deteniéndose ante símbolos
    const regex = /(\d+)\s*[\*x]\s*(\d+(?:[.,]\d+)?)\s*k?g?\s*([A-Z0-9 ]+)/i;

    sections.forEach(section => {
        const cleanSection = section.trim();
        if (!cleanSection) return;

        const match = cleanSection.match(regex);
        if (match) {
            const cantidad = parseInt(match[1]);
            const capacidad = match[2].replace(',', '.') + "kg";
            const tipo = match[3].trim().toUpperCase();

            for (let i = 0; i < cantidad; i++) {
                assets.push({
                    tipo,
                    capacidad,
                    id: Math.random().toString(36).substr(2, 9),
                    estado: 'ACTIVO'
                });
            }
        }
    });

    return assets;
};

/**
 * Procesa una lista de filas desde Excel/CSV y las sube a Firestore.
 */
/**
 * Borra TODOS los datos (Activos y Clientes) de una empresa.
 * EXCLUSIVO PARA FASE DE PRUEBAS/MIGRACIÓN.
 */
export const clearTenantFullData = async (tenantId) => {
    if (!tenantId) return 0;
    
    const collectionsToClear = ['assets', 'clientes'];
    let totalDeleted = 0;

    for (const colName of collectionsToClear) {
        const q = query(collection(db, 'companies', tenantId, colName));
        const snap = await getDocs(q);
        
        let batch = writeBatch(db);
        let count = 0;

        for (const d of snap.docs) {
            batch.delete(d.ref);
            count++;
            if (count >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }
        if (count > 0) await batch.commit();
        totalDeleted += snap.size;
    }
    
    return totalDeleted;
};

/**
 * IMPORTADOR INTELIGENTE DE PRODUCTOS (Mapeo Dinámico Visual)
 * Soporta archivos con y sin cabeceras al usar mapeo por índice.
 * Ahora incluye vinculación automática de Proveedores e IVA.
 */
export const importProductsWithMapping = async (rows, mapping, tenantId, globalProveedorId = '', fallbackMargin = 0) => {
    if (!tenantId) throw new Error("companyId Requerido");

    const stats = {
        productosCreados: 0,
        proveedoresCreados: 0,
        errores: []
    };

    // 1. Cargamos proveedores existentes para mapeo rápido por nombre (Jerárquico)
    const provSnap = await getDocs(collection(db, 'companies', tenantId, 'proveedores'));
    const provMap = new Map();
    provSnap.forEach(doc => {
        const d = doc.data();
        provMap.set(normalize(d.nombre), doc.id);
    });

    let batch = writeBatch(db);
    let count = 0;

    for (const row of rows) {
        try {
            const getVal = (field) => {
                const idxOrKey = mapping[field];
                if (idxOrKey === undefined || idxOrKey === '') return null;
                return row[idxOrKey];
            };

            const nombre = getVal('nombre');
            if (!nombre) continue; // Omitir filas vacías

            // A. Lógica de Proveedor (Buscar o Crear)
            let proveedorId = '';
            const provNombreRaw = getVal('proveedor');
            if (provNombreRaw) {
                const normalizedProv = normalize(provNombreRaw);
                if (provMap.has(normalizedProv)) {
                    proveedorId = provMap.get(normalizedProv);
                } else {
                    // AUTO-CREACIÓN DE PROVEEDOR (Jerárquico)
                    const newProvRef = doc(collection(db, 'companies', tenantId, 'proveedores'));
                    proveedorId = newProvRef.id;
                    const provData = {
                        companyId: tenantId,
                        nombre: provNombreRaw.toString().trim(),
                        condicionIva: 'Responsable Inscripto', // Default industrial
                        createdAt: Timestamp.now()
                    };
                    batch.set(newProvRef, provData);
                    provMap.set(normalizedProv, proveedorId);
                    stats.proveedoresCreados++;
                    count++;
                }
            } else if (globalProveedorId) {
                // USAR PROVEEDOR GLOBAL SI NO HAY COLUMNA O ESTÁ VACÍA
                proveedorId = globalProveedorId;
            }

            const precio = parseFloat(getVal('precio')) || 0;
            let costo = parseFloat(getVal('costo')) || 0;

            // 🔥 LÓGICA DE MARGEN AUTOMÁTICO: Si no hay costo, calculamos en base al precio y el margen sugerido
            if (costo === 0 && fallbackMargin > 0 && precio > 0) {
                costo = precio * (1 - (fallbackMargin / 100));
                // Redondear a 2 decimales para evitar números infinitos de JS
                costo = Math.round(costo * 100) / 100;
            }

            // B. Datos del Producto
            const productData = {
                companyId: tenantId,
                nombre: nombre.toString().trim(),
                precio: precio,
                costo: costo,
                categoriaId: (getVal('categoria') || "General").toString().trim(), // Nota: Aquí simplificamos a nombre si no hay ID
                marca: (getVal('marca') || "").toString().trim(),
                stock: parseInt(getVal('stock')) || 0,
                codigoDeBarras: (getVal('codigo') || "").toString().trim(),
                
                // Nuevos campos fiscales
                proveedorId: proveedorId,
                ivaAlicuota: parseFloat(getVal('iva')) || 21,
                costoIncluyeIva: getVal('costoConIva') === 'NO' ? false : true,
                
                lastUpdate: Timestamp.now(),
                fechaCreacion: Timestamp.now()
            };

            const docRef = doc(collection(db, 'companies', tenantId, 'productos'));
            batch.set(docRef, productData);
            
            stats.productosCreados++;
            count++;

            if (count >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }

        } catch (err) {
            console.error("Error en fila de producto:", err);
            stats.errores.push(`Error: ${err.message}`);
        }
    }

    if (count > 0) await batch.commit();

    return stats;
};

export const processImportData = async (rows, tenantId) => {
    if (!tenantId) throw new Error("companyId Requerido");

    const stats = {
        clientesCreados: 0,
        activosCreados: 0,
        filasOmitidas: 0,
        errores: []
    };

    // 1. Obtener clientes existentes para evitar duplicados en esta carga (Jerárquico)
    const q = collection(db, 'companies', tenantId, 'clientes');
    const snap = await getDocs(q);
    const existingClientsMap = new Map(); // Key: "NOMBRE|DIRECCION"
    
    snap.forEach(doc => {
        const d = doc.data();
        const key = `${normalize(d.nombre)}|${normalize(d.direccion)}`;
        existingClientsMap.set(key, doc.id);
    });

    let batch = writeBatch(db);
    let count = 0;

    for (const row of rows) {
        try {
            const keys = Object.keys(row);
            const getVal = (aliases) => {
                const key = keys.find(k => aliases.includes(k.trim().toUpperCase()));
                return key ? row[key] : null;
            };

            const nombre = getVal(['EMPRESA', 'CLIENTE', 'NOMBRE', 'RAZON SOCIAL']);
            const direccion = getVal(['DIRECCION', 'DOMICILIO', 'UBICACION', 'DIRECCIÓN']);
            const fechaPlanilla = getVal(['FECHA', 'ULTIMO SERVICE', 'PROCESADO']);
            const observaciones = getVal(['OBSERVACIONES', 'OBSERVACONES', 'DETALLE', 'REQUISITO', 'NOTAS']);

            if (!nombre) {
                stats.filasOmitidas++;
                continue;
            }

            const clientKey = `${normalize(nombre)}|${normalize(direccion)}`;
            let clientId = existingClientsMap.get(clientKey);

            // A. Si no existe el cliente, lo preparamos para crear (Jerárquico)
            if (!clientId) {
                const newClientRef = doc(collection(db, 'companies', tenantId, 'clientes'));
                clientId = newClientRef.id;
                
                batch.set(newClientRef, {
                    companyId: tenantId,
                    nombre: nombre.trim(),
                    direccion: (direccion || "").trim(),
                    telefono: row.TELEFONO || row.Celular || "",
                    fechaRegistro: Timestamp.now(),
                    tipo: 'SERVICE'
                });
                
                existingClientsMap.set(clientKey, clientId);
                stats.clientesCreados++;
                count++;
            }

            // B. Parsear activos de la columna OBSERVACIONES
            const matafuegos = parseMatafuegos(observaciones);
            
            // C. Fecha de Vencimiento (+365 días)
            const dateRef = excelDateToJSDate(fechaPlanilla);
            const fechaVencimiento = new Date(dateRef);
            fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);

            for (const m of matafuegos) {
                const assetRef = doc(collection(db, 'companies', tenantId, 'assets'));
                batch.set(assetRef, {
                    ...m,
                    clientId,
                    companyId: tenantId,
                    fechaUltimoService: Timestamp.fromDate(dateRef),
                    proximaVisita: Timestamp.fromDate(fechaVencimiento),
                    lastUpdate: Timestamp.now()
                });
                
                stats.activosCreados++;
                count++;

                // Commit preventivo cada 500 operaciones
                if (count >= 450) {
                    await batch.commit();
                    batch = writeBatch(db);
                    count = 0;
                }
            }

            if (count >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }

        } catch (err) {
            console.error("Error procesando fila:", row, err);
            stats.errores.push(`Fila ${nombre}: ${err.message}`);
        }
    }

    if (count > 0) await batch.commit();

    return stats;
};
