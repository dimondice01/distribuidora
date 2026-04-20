import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SeedService = {
    seedCompanyData: async (db, companyId, modules) => {
        console.log(`🌱 Iniciando seeding para compañía: ${companyId}`);
        
        try {
            // 1. Crear Entidades Base (Zona y Rubro por defecto)
            const zonaRef = await addDoc(collection(db, 'companies', companyId, 'zonas'), {
                nombre: 'Zona Centro (Default)',
                companyId: companyId,
                createdAt: serverTimestamp()
            });

            const rubroRef = await addDoc(collection(db, 'companies', companyId, 'rubros'), {
                nombre: 'General',
                companyId: companyId,
                createdAt: serverTimestamp()
            });

            // 1b. Crear Vendedor y Repartidor por defecto
            await addDoc(collection(db, 'companies', companyId, 'vendedores'), {
                nombreCompleto: 'Vendedor Demo',
                username: 'vendedor',
                email: `vendedor_${companyId.substring(0,5)}@demo.com`,
                rango: 'Vendedor',
                companyId: companyId,
                createdAt: serverTimestamp()
            });

            const repartidorRef = await addDoc(collection(db, 'companies', companyId, 'vendedores'), {
                nombreCompleto: 'Repartidor Express',
                username: 'reparto',
                email: `reparto_${companyId.substring(0,5)}@demo.com`,
                rango: 'Reparto',
                companyId: companyId,
                createdAt: serverTimestamp()
            });

            // 2. MÓDULO: MATAFUEGOS
            if (modules.includes('matafuegos')) {
                console.log("🔥 Seed: Matafuegos");
                
                // 5 Clientes de ejemplo
                const clientesMatafuegos = [
                    { nombre: "Consorcio Edificio Alvear", direccion: "Av. Alvear 1800", barrio: "Recoleta", localidad: "CABA", telefono: "4801-0000" },
                    { nombre: "Estación de Servicio Shell", direccion: "Libertador 2500", barrio: "Olivos", localidad: "Vicente López", telefono: "4799-1111" },
                    { nombre: "Supermercado Coto", direccion: "Santa Fe 3000", barrio: "Palermo", localidad: "CABA", telefono: "4821-2222" },
                    { nombre: "Planta Industrial Techint", direccion: "Ruta 9 km 70", barrio: "-", localidad: "Campana", telefono: "03489-430000" },
                    { nombre: "Gimnasio SportClub", direccion: "Cabildo 2100", barrio: "Belgrano", localidad: "CABA", telefono: "4788-3333" }
                ];

                for (const client of clientesMatafuegos) {
                    await addDoc(collection(db, 'companies', companyId, 'clientes'), {
                        ...client,
                        companyId: companyId,
                        zonaId: zonaRef.id,
                        rubroId: rubroRef.id,
                        requiereFacturaAfip: true,
                        numeroDocumento: "30-12345678-9",
                        tipoDocumento: "CUIT",
                        fechaCreacion: new Date()
                    });
                }

                // 10 Servicios de Matafuegos (con fechas escalonadas)
                const today = new Date();
                const series = ["ABC-101", "ABC-102", "ABC-103", "XYZ-201", "XYZ-202", "KLM-301", "KLM-302", "MNO-900", "PQR-777", "SSS-000"];
                
                for (let i = 0; i < 10; i++) {
                    const daysOffset = i < 3 ? (i + 5) : (i * 30); // Primeros 3 vencen pronto (5, 6, 7 días), el resto en meses
                    const vencimiento = new Date();
                    vencimiento.setDate(today.getDate() + daysOffset);

                    await addDoc(collection(db, 'companies', companyId, 'productos'), {
                        nombre: `Matafuego ABC ${i+1}kg - Polvo ABC`,
                        tipo: 'servicio',
                        numeroSerie: series[i],
                        fechaServicio: vencimiento.toISOString().split('T')[0],
                        stock: 1,
                        precio: 15000 + (i * 500),
                        costo: 8000,
                        companyId: companyId,
                        categoriaId: 'Matafuegos',
                        marca: 'Georgia',
                        historialLotes: [{ fechaIngreso: today.toISOString(), cantidad: 1, fechaVencimiento: "" }]
                    });
                }
            }

            // 3. MÓDULO: DISTRIBUCIÓN
            if (modules.includes('distribucion')) {
                console.log("📦 Seed: Distribución");

                // Listas de Precios
                await addDoc(collection(db, 'companies', companyId, 'listas_precios'), { nombre: 'Minorista', companyId: companyId });
                await addDoc(collection(db, 'companies', companyId, 'listas_precios'), { nombre: 'Mayorista', companyId: companyId });

                // Categoría de ejemplo
                const catRef = await addDoc(collection(db, 'companies', companyId, 'categorias'), {
                    nombre: 'Almacén',
                    companyId: companyId
                });

                // 20 Productos
                const items = [
                    { n: "Aceite Girasol 1.5L", c: 1200, p: 1800 },
                    { n: "Harina 000 1kg", c: 450, p: 650 },
                    { n: "Azúcar Blanca 1kg", c: 600, p: 850 },
                    { n: "Fideos Spaghetti 500g", c: 700, p: 1100 },
                    { n: "Arroz Largo Fino 1kg", c: 1100, p: 1600 },
                    { n: "Leche Entera Larga Vida 1L", c: 900, p: 1300 },
                    { n: "Gaseosa Cola 2.25L", c: 1500, p: 2200 },
                    { n: "Agua Mineral 2L", c: 600, p: 950 },
                    { n: "Galletitas Dulces Surtidas", c: 800, p: 1250 },
                    { n: "Yerba Mate 500g", c: 1400, p: 2100 },
                    { n: "Café Molido 250g", c: 2500, p: 3800 },
                    { n: "Detergente Lavavajilla 500ml", c: 950, p: 1400 },
                    { n: "Jabón en Líquido 3L", c: 4500, p: 6800 },
                    { n: "Papel Higiénico 4 rollos", c: 1200, p: 1900 },
                    { n: "Puré de Tomate 520g", c: 500, p: 800 },
                    { n: "Mayonesa 500g", c: 1100, p: 1700 },
                    { n: "Atún desmenuzado en aceite", c: 1300, p: 2000 },
                    { n: "Vinagre de Manzana 1L", c: 750, p: 1150 },
                    { n: "Sal Fina 500g", c: 350, p: 550 },
                    { n: "Pan de Molde Blanco", c: 1300, p: 1950 }
                ];

                for (const item of items) {
                    await addDoc(collection(db, 'companies', companyId, 'productos'), {
                        nombre: item.n,
                        tipo: 'producto',
                        precio: item.p,
                        costo: item.c,
                        stock: 50 + Math.floor(Math.random() * 100),
                        companyId: companyId,
                        categoriaId: catRef.id,
                        preciosExtra: {
                            'Mayorista': Math.round(item.p * 0.85),
                            'Minorista': item.p
                        },
                        historialLotes: [{ fechaIngreso: new Date().toISOString(), cantidad: 100, fechaVencimiento: "" }]
                    });
                }
            }

            console.log("✅ Seeding finalizado con éxito.");
            return true;

        } catch (error) {
            console.error("❌ Error en SeedService:", error);
            throw error;
        }
    }
};

export default SeedService;
