# Plan de Implementación: Diseño y Reglas Fiscales para la Factura Perfecta (AFIP/ARCA)

Este documento define las especificaciones técnicas y de diseño para reestructurar la impresión de comprobantes en el archivo `src/components/Facturacion.jsx` del sistema distribuidora. El objetivo es lograr una impresión limpia, legalmente correcta y optimizada para múltiples páginas/artículos.

---

## Reglas de Negocio e Impuestos

### 1. Discriminación de IVA en Factura "A"
* **Condición**: Si `venta.afipLetra === 'A'` (o `letra === 'A'`).
* **Visualización de Ítems**: 
  * Los precios unitarios y subtotales en la tabla de productos **deben mostrarse NETOS de IVA** (dividiendo el valor bruto por `1.21`).
  * *Fórmula de cálculo para la fila*: 
    * `Precio Unitario Neto = item.precio / 1.21`
    * `Subtotal Neto = (item.precio * item.quantity) / 1.21`
* **Visualización de Totales**:
  * Detallar por separado:
    * `Neto Gravado (21%): $XX.XX`
    * `IVA (21%): $XX.XX`
    * `Total: $XX.XX`

### 2. Precios en Facturas "B", "C" y Presupuestos "X"
* **Condición**: Si la letra es distinta de "A" (B, C o Presupuesto X).
* **Visualización de Ítems**:
  * Los precios unitarios y subtotales en la tabla de productos **deben mostrarse BRUTOS** (con IVA incluido, tal como vienen por defecto en `item.precio`).
* **Visualización de Totales**:
  * Mostrar únicamente la fila de `Total` (o Subtotal y Total equivalentes), sin discriminar ni detallar conceptos de IVA.

---

## Reglas de Diseño e Impresión Multipágina (Distribuidoras)

Para soportar facturas con gran volumen de ítems sin romper el maquetado:

### 1. Estructura y Flujo CSS
* **Adiós al borde rígido exterior**: Retirar el contenedor principal con altura mínima rígida y borde completo que encierra toda la factura. En su lugar, dividir el diseño en bloques independientes con bordes finos.
* **Repetición de cabeceras en páginas nuevas**:
  * La tabla de ítems debe usar una estructura semántica HTML limpia: `<table>`, `<thead>`, `<tbody>`.
  * Aplicar el siguiente CSS en la sección de estilos de impresión:
    ```css
    thead { display: table-header-group; }
    ```
    Esto garantiza que si la factura tiene 40 ítems y ocupa 3 páginas, las cabeceras de las columnas (DESCRIPCIÓN, CANTIDAD, P. UNIT, IMPORTE) se repitan automáticamente arriba en cada página.
* **Evitar cortes de filas**:
  ```css
  tr { page-break-inside: avoid; }
  ```
  Esto evita que el nombre o datos de un producto se dividan horizontalmente entre el final de una hoja y el inicio de la siguiente.
* **Posición del Pie de Página**:
  * El bloque con el CAE, QR de ARCA y totales debe fluir de forma natural al final de la última hoja, evitando solapamientos con el listado de productos.

---

## Reglas de Datos y Campos Requeridos

* **Condición de Venta / Pago**: Agregar un campo visible en la cabecera que indique la forma de pago (ej. *"Contado"*, *"Cuenta Corriente"* o *"Tarjeta"*), basándose en `venta.paymentMethod` y `venta.saldoPendiente`.
* **Formateo de CUITs**: Asegurarse de que tanto el CUIT del emisor (`config.cuit`) como el del receptor (`venta.clienteCuit`) se muestren formateados con guiones (`XX-XXXXXXXX-X`) para una estética premium.
* **Unidad de Medida (U.M.)**: Añadir una columna delgada `"U.M."` en la tabla de ítems que por defecto muestre `"u."` (unidades), proporcionando una apariencia más profesional.
* **Respeto a las variables del sistema**: Se debe conservar obligatoriamente la lógica actual de lectura de la información de la empresa (`config.logo`, `config.razonSocial`, `config.domicilioFiscal`, `config.cuit`, `config.iibb`, `config.inicioActividades`), adaptándose dinámicamente si la empresa tiene o no logo.

---

## Plan de Verificación

* **Caso 1: Factura A con pocos artículos (1 pág.)** -> Verificar que los precios de los ítems sean netos, que figure el Neto e IVA discriminados al pie, y que los CUITs tengan formato de guiones.
* **Caso 2: Factura A con muchos artículos (30+ ítems, 2+ págs.)** -> Entrar a la vista previa de impresión y validar que las cabeceras de columnas se repitan al inicio de la segunda hoja y que el pie de página no se solape con los artículos.
* **Caso 3: Factura B/C o Presupuesto** -> Validar que los precios unitarios sean brutos y que no se discrimine IVA en la base del comprobante.
