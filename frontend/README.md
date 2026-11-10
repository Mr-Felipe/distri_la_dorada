# Distribuidora La Dorada S.A.S. — Frontend

Frontend en **Angular 21 (Standalone, Signals, Reactive Forms)** conectado a **Supabase (PostgREST + RPCs)** para la gestión de catálogo, pedidos e inventario.

> **Web abierta, sin inicio de sesión:** esta versión no tiene autenticación ni roles (RF-08 quedó como propuesta documental en el documento técnico, 5.7). Tampoco lleva bitácora de auditoría (retirada con la migración `0008`; mejora futura).

---

## 1. Stack

- **Framework**: Angular 21 Standalone (`@if`, `@for`, `@switch`, signals, reactive forms).
- **Backend**: `@supabase/supabase-js` v2 — PostgREST para lecturas y **RPCs** para toda escritura de pedidos.
- **Estilos**: CSS propio con variables de diseño (paleta Azul Marino `#0f2744` y Dorado `#d4af37`), sin librerías de componentes.
- **Moneda**: COP con formato colombiano (`$ 8.900`).

---

## 2. RPCs del servidor

Toda escritura de pedidos se realiza **exclusivamente mediante RPC** (nunca inserts/updates directos en `pedidos` ni `pedido_items`):

- `crear_pedido(p_cliente, p_items, p_observacion)`: nace en `pendiente` e intenta la **confirmación automática**; si el inventario no alcanza, queda `pendiente` con el motivo (`INVENTARIO_INSUFICIENTE: <detalle>`).
- `confirmar_pedido(p_pedido_id)`: descuenta existencias de forma transaccional y única (sin doble descuento); si no alcanza, lanza `INVENTARIO_INSUFICIENTE: <detalle>` con los números concretos.
- `despachar_pedido(p_pedido_id)`: marca el pedido como despachado con su timestamp.
- `cancelar_pedido(p_pedido_id, p_motivo)`: pasa a `rechazado`, exige motivo y revierte el descuento si estaba confirmado.
- `resumen_por_estado()`: métricas consolidadas por estado (`vw_resumen_por_estado`).

---

## 3. Instrucciones de ejecución

```bash
# 1. Instalar dependencias
npm ci

# 2. Iniciar servidor de desarrollo (→ http://localhost:4200)
ng serve
# o: npm start

# 3. Compilar para producción
npm run build

# 4. Lint
npm run lint
```

La URL de Supabase y la clave *publishable* están en `frontend/src/environments/environment.ts`.

---

## 4. Reglas de negocio visibles en la interfaz

- **Cantidades y precios > 0** (el precio acepta como mínimo `0.01`; mensaje en pantalla si no).
- **Existencias ≥ 0** (0 = producto agotado, permitido).
- Si al registrar un pedido **no alcanza el inventario**, el pedido queda `pendiente` y se muestra el motivo; el detalle permite reintentar «Confirmar Pedido» o cancelar con motivo.
- Un pedido `pendiente` **no se edita**: se confirma cuando repone el inventario o se cancela y se crea otro nuevo.
- Todo cambio de estado pasa por las RPC (la máquina de estados se valida en el servidor).

---

## 5. Checklist de verificación

1. [x] `npm run build` compila sin errores; `npm run lint` limpio.
2. [x] Catálogo: búsqueda por nombre o referencia, crear y editar producto (precio > 0), ajustar existencias desde bodega, activar/desactivar.
3. [x] Pedidos: crear con múltiples líneas y total en COP; confirmación automática si alcanza inventario; si no, queda `pendiente` con motivo visible.
4. [x] Detalle: transiciones válidas por estado (confirmar/despachar/cancelar con motivo); anti doble clic con spinner en los botones.
5. [x] Manejo de errores: `INVENTARIO_INSUFICIENTE` y demás códigos se muestran como toast con el detalle literal (`disponibles X, solicitados Y`).
6. [x] Responsividad: usable a 360 px sin scroll horizontal (verificado, evidencia en `docs/evidencias/`).
