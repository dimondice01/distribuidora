# ESPECIFICACIÓN TÉCNICA: MULTI-TENENCIA JERÁRQUICA (SAAS INDUSTRIAL)

Esta guía documenta la nueva arquitectura de datos segmentada para asegurar el aislamiento total entre compañías. **Cualquier desarrollo de App Móvil DEBE seguir estas rutas.**

## 1. Resolución de Identidad (Auth & Login)
El sistema utiliza la colección raíz como puntero de identidad global.

- **Colección Raíz**: `/users/{uid}`
- **Campos Críticos**:
  - `companyId`: El ID único de la empresa (vincula al usuario con su organización).
  - `role`: (vendedor, reparto, admin).

**Flujo de Login:**
1. Autenticar con Firebase Auth.
2. Leer el documento `/users/{user.uid}`.
3. Extraer el valor de `companyId`.
4. Utilizar ese `companyId` para construir todas las rutas de datos operativos.

---

## 2. Mapa de Rutas de Datos (Operacional)
Todos los datos operativos de una compañía viven exclusivamente bajo su propio sub-árbol en `/companies`. **NO usar colecciones raíz** para productos, ventas, proveedores, etc.

### Estructura Jerárquica:
| Entidad | Ruta de Firestore |
| :--- | :--- |
| **Productos** | `/companies/{companyId}/productos/{id}` |
| **Clientes** | `/companies/{companyId}/clientes/{id}` |
| **Ventas / Cobranza** | `/companies/{companyId}/ventas/{id}` |
| **Vendedores / Repartidores** | `/companies/{companyId}/vendedores/{id}` |
| **Hojas de Ruta** | `/companies/{companyId}/rutas/{id}` |
| **Configuraciones Fiscales** | `/companies/{companyId}/config/{id}` |

---

## 3. Reglas de Aislamiento (Seguridad)
Las reglas de Firestore están configuradas para bloquear cualquier intento de acceso a la raíz. Solo se permite el acceso a subcolecciones si el `companyId` en la ruta coincide con el `companyId` del usuario autenticado.

---

## 4. Estándar de Implementación
Se requiere que el cliente móvil abstraiga estas rutas para evitar redundancia y errores de seguridad.

```javascript
// Ejemplo de acceso correcto (Subcolección)
const prodRef = doc(db, 'companies', userCompanyId, 'productos', productId);
```

> [!IMPORTANT]
> Los documentos bajo `/companies/{id}/vendedores` y `/users` (raíz) deben mantenerse sincronizados (mismo UID) para asegurar que el sistema de fidelización sea coherente.
