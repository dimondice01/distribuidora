# CLAUDE.md (ERP SaaS Multi-tenant)

**Stack**: React 19, Vite 7, Firebase (Auth/FS/Storage), Tailwind, PWA (Workbox).

## Commands
`npm run dev` (HMR), `build` (prod), `lint` (strict), `preview`. No tests.

## Multi-tenancy & Isolation
- **Structure**: All data via `/companies/{companyId}/`.
- **Flow**: Login -> `TenantContext` reads `/users/{uid}` -> `companyId`/`role`.
- **Rule**: Use `useFirestore` hook (`getTenantCollection/Doc`) for all FS access.
- **Roles**: superadmin | admin | vendedor | reparto.

## Firestore Schema
- `/users/{uid}`: {companyId, role}
- `/companies/{cid}/`:
  - **Public (Catalog)**: `productos`, `categorias`, `promociones`, `vendedores`.
  - **Private**: `clientes`, `ventas`, `shifts`, `rutas`, `gastos`, `proveedores`, `config`.

## Architecture & Logic
- **State**: `TenantContext` (global), `ShiftContext` (turns), real-time FS listeners. No Global State Mgr.
- **PWA**: Firestore persistence, `online/offline` toasts, Workbox auto-update.
- **Special Modules**: `src/modules/admin` (Cross-tenant/Bulk), `src/modules/tecnico` (Field Service PWA).
- **Services**: `ShiftService`, `ImportService`, `SeedService`.
- **Integrations**: AFIP (Fiscal Argentina), MercadoPago (Payments), Leaflet (Maps).
- **Build**: Vite manual chunks (Firebase/React/Icons). Limit: 1000KB.
