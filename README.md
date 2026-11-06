# Distribuidora La Dorada S.A.S. — Sistema de Gestión de Pedidos e Inventario

Frontend en **Angular 21+ (Standalone, Signals, Reactive Forms)** conectado a **Supabase (PostgREST + RPCs + Auth)** para la gestión comercial y logística de pedidos por WhatsApp y catálogo de productos.

---

## 1. Stack Tecnológico

- **Framework**: Angular 21 Standalone (Zoneless, Signals: `signal()`, `computed()`, `input()`, `output()`).
- **Base de Datos & Auth**: `@supabase/supabase-js` v2.
- **Formularios**: Reactive Forms con validaciones estrictas.
- **Estilos**: SCSS / CSS Moderno con variables de diseño (Paleta Azul Marino `#0f2744` & Dorado `#d4af37`), componentes UI propios (sin Material ni component libraries).
- **Control de Acceso (RBAC)**: Matriz de permisos estricta por rol (`admin`, `vendedor`, `bodega`).
- **Control Flow**: Sintaxis nativa de Angular (`@if`, `@for`, `@switch`, `@let`).

---

## 2. Usuarios de Prueba (Supabase Auth)

| Correo | Contraseña | Rol Asignado | Alcance Principal |
|---|---|---|---|
| `admin@ladorada.test` | `Admin1234*` | **admin** | Control total, catálogo, pedidos, bodega y auditoría |
| `vendedor@ladorada.test` | `Vende1234*` | **vendedor** | Catálogo, crear y confirmar/cancelar pedidos |
| `bodega@ladorada.test` | `Bode1234*` | **bodega** | Ajuste de stock físico y despacho de pedidos confirmados |
| `prueba@ladorada.test` | `Prueba1234*` | **vendedor** | Segundo vendedor para pruebas concurrentes |

> *Nota*: En la pantalla de login `/login`, hay botones rápidos para autocompletar estas credenciales.

---

## 3. Matriz de Permisos Implementada (§6)

| Acción en el Sistema | Admin | Vendedor | Bodega |
|---|:---:|:---:|:---:|
| Ver catálogo de productos | ✔ | ✔ | ✔ |
| Crear y editar producto (nombre, precio, ref) | ✔ | ✔ | ✖ |
| Ajustar existencias físicas en bodega | ✔ | ✖ | ✔ |
| Activar / Desactivar producto | ✔ | ✖ | ✖ |
| Ver listado de pedidos y detalle | ✔ | ✔ | ✔ |
| Crear nuevo pedido WhatsApp | ✔ | ✔ | ✖ |
| Confirmar pedido (reserva stock en servidor) | ✔ | ✔ | ✖ |
| Cancelar pedido (reversa stock si confirmado) | ✔ | ✔ | ✖ |
| Despachar pedido | ✔ | ✖ | ✔ |
| Ver resumen financiero y métricas | ✔ | ✔ | ✔ |
| Ver actividad y auditoría (trazabilidad) | ✔ | ✖ | ✖ |

---

## 4. RPCs del Servidor Mapeadas Exactamente (§4)

Todas las escrituras de pedidos se realizan **exclusivamente mediante RPC** (nunca direct inserts/updates en `pedidos` ni `pedido_items`):

- `crear_pedido(p_cliente, p_items, p_observacion)`: Nace en estado `pendiente`.
- `confirmar_pedido(p_pedido_id)`: Descuenta existencias en el servidor de forma transaccional. Si el inventario no alcanza, genera excepción `INVENTARIO_INSUFICIENTE: <detalle>` que se presenta de forma literal al usuario.
- `despachar_pedido(p_pedido_id)`: Marca el pedido como despachado con su timestamp.
- `cancelar_pedido(p_pedido_id, p_motivo)`: Cambia a `rechazado`, exige motivo y reversa el descuento de inventario si estaba confirmado.
- `resumen_por_estado()`: Retorna métricas consolidadas por estado (`vw_resumen_por_estado`).

---

## 5. Instrucciones de Ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
# o con angular cli estándar:
# ng serve --port 3000

# 3. Compilar para producción (Type-check estricto AOT)
npm run build
```

---

## 6. Checklist de Verificación (Definition of Done)

1. [x] **Compilación**: `npm run build` compila sin errores en modo estricto.
2. [x] **Autenticación**: Iniciar sesión con los 4 usuarios de prueba; el menú superior adapta dinámicamente sus módulos según el rol.
3. [x] **Catálogo**:
   - Vendedor y Admin pueden crear/editar productos.
   - Bodega puede ajustar existencias físicas con el modal rápido y no puede editar precios ni nombres.
   - Vendedor tiene bloqueado el ajuste manual de stock.
   - Admin puede activar/desactivar referencias.
4. [x] **Flujo Completo de Pedidos**:
   - Crear pedido con múltiples productos y cálculo en vivo en moneda colombiana (COP).
   - Confirmar pedido: descuenta stock automáticamente.
   - Bodega visualiza el pedido confirmado y realiza el despacho.
   - Cancelar pedido: solicita motivo obligatorio y revierte inventario si estaba confirmado.
5. [x] **Manejo de Errores**:
   - Detección de `INVENTARIO_INSUFICIENTE` mostrando detalle literal (ej. `disponibles X, solicitados Y`).
   - Anti doble clic con spinners integrados en todos los botones de acción.
6. [x] **Diseño y Responsividad**:
   - Interfaz corporativa sobria en tonos Azul Marino y Dorado.
   - Tarjetas apiladas automáticas en pantallas móviles (< 768px).
   - Cero scroll horizontal en resoluciones móviles (360px).
