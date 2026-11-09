# Prompt para Google AI Studio — Frontend Angular «La Dorada»

> **Uso:** copia todo el bloque que está debajo de «INICIO DEL PROMPT» y pégalo en
> [Google AI Studio](https://aistudio.google.com) (sesión nueva). Pídele primero el
> **plan de archivos** y luego la **generación por partes** (ver «Cómo trabajarlo»
> al final). Cuando esté completo, expórtalo a GitHub o descárgalo y lo traemos a
> local para seguir editándolo con el repo actual.
>
> El prompt es autocontenido: no necesita el PLAN_MAESTRO ni el documento técnico.

---

## INICIO DEL PROMPT

Eres un ingeniero senior experto en Angular y Supabase. Vas a construir la **primera versión completa y funcional** del frontend de un sistema real de gestión de pedidos e inventario.

# Proyecto: «Gestión de Pedidos e Inventario — Distribuidora La Dorada S.A.S.»

Sistema interno con 3 roles (admin, vendedor, bodega) para gestionar un catálogo de productos y pedidos por WhatsApp, con reglas de negocio fuertes en el servidor (Supabase) y una interfaz en español, responsiva y sobria.

## 1. Stack obligatorio

- **Angular actual (estable)** con: componentes **standalone**, **signals** (`input()`, `output()`, `computed()`, `signal()`), control flow nativo (`@if`, `@for`, `@switch`), **Reactive Forms**, **SCSS**, routing con `loadComponent`/rutas standalone.
- **TypeScript estricto** (`strict: true`), sin Angular Material ni component libraries: UI hecha a mano con SCSS (es un requisito: tabla responsiva propia, botones, modales y toasts propios).
- **`@supabase/supabase-js` v2** como única librería de datos (REST + RPC + Auth).
- **Sin SSR, sin Angular Universal, sin Nx.** SPA clásica.
- Idioma de toda la UI, comentarios y mensajes: **español**.

## 2. Conexión con Supabase (ya existe, no crear nada en la BD)

```ts
// src/environments/environment.ts
export const environment = {
  production: false,
  supabaseUrl: 'https://xpmccpujsxrpvkcbafzw.supabase.co',
  supabaseAnonKey: 'sb_publishable_cjMivVF_2-DBcQ-lEpgHNQ_6rQnbrxL',
};
```

> La clave es publicable **por diseño**: la seguridad real está en RLS. **Nunca** uses ni menciones una `service_role key` en el frontend.

- Crea el cliente con `createClient(environment.supabaseUrl, environment.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } })` en un `SupabaseService` inyectable.
- **No** generes migraciones, SQL, seeds ni tablas: el backend está listo. Solo lee/escribe desde el cliente.

## 3. Esquema de datos real (no lo modifiques; modélalo tal cual)

**`perfiles`**: `id uuid` (PK = auth.users), `nombre text`, `rol text` (`'admin' | 'vendedor' | 'bodega'`), `activo boolean`, `creado_en`, `actualizado_en`.

**`productos`**: `id uuid`, `referencia text` (única), `nombre text`, `precio numeric`, `existencias integer`, `activo boolean`, `creado_en`, `actualizado_en`.

**`pedidos`**: `id uuid`, `numero integer` (secuencial, visible como `#1000`), `cliente text`, `observacion text?`, `estado 'pendiente' | 'confirmado' | 'despachado' | 'rechazado'`, `total numeric`, `vendedor_id uuid`, `motivo_rechazo text?`, `creado_en`, `confirmado_en?`, `despachado_en?`, `rechazado_en?`, `actualizado_en`.

**`pedido_items`**: `id uuid`, `pedido_id uuid`, `producto_id uuid`, `cantidad integer`, `precio_unitario numeric`, `creado_en`. Relación N:M producto↔pedido.

**`auditoria`**: `id bigint`, `tabla text`, `registro_id uuid?`, `accion 'INSERT'|'UPDATE'|'DELETE'`, `datos_antes jsonb?`, `datos_despues jsonb?`, `usuario_id uuid?`, `usuario_rol text?`, `creado_en`. **Solo lectura, solo rol admin.**

**Vista `vw_resumen_por_estado`**: `estado text`, `pedidos int`, `valor numeric`.

## 4. RPCs del servidor (nombres y parámetros EXACTOS — crítico)

PostgREST exige los **nombres SQL de los parámetros** (`p_...`). Llama siempre con `supabase.rpc('nombre', { p_param: valor })`:

| RPC | Parámetros | Reglas que aplica en servidor |
|---|---|---|
| `crear_pedido` | `p_cliente: string`, `p_items: {producto_id, cantidad}[]`, `p_observacion?: string` | valida cantidades > 0, producto activo, calcula total, nace `pendiente` |
| `confirmar_pedido` | `p_pedido_id: string` | **descuento único de existencias** en servidor; error `INVENTARIO_INSUFICIENTE: <detalle>` si no alcanza; `TRANSICION_INVALIDA` si ya no está pendiente |
| `despachar_pedido` | `p_pedido_id: string` | solo `confirmado → despachado`; rol admin/bodega |
| `cancelar_pedido` | `p_pedido_id: string`, `p_motivo: string` | a `rechazado`; si estaba confirmado **reversa** el descuento; motivo obligatorio |
| `resumen_por_estado` | ninguno | filas `{estado, pedidos, valor}` |

**Escrituras prohibidas desde el cliente:** nunca hagas `update`/`insert`/`delete` sobre `pedidos` ni `pedido_items` (solo SELECT). Las escrituras de pedidos van **solo por RPC**. En `productos` sí hay CRUD directo (ver permisos §6).

Los errores de las RPC llegan como excepción con `message` que empieza por un código, p. ej. `INVENTARIO_INSUFICIENTE: Jabon en barra (disponibles 5, solicitados 12)`. Ver §7.

## 5. Estructura de carpetas (respétala al pie de la letra)

```
frontend/
├── src/
│   ├── environments/environment.ts
│   └── app/
│       ├── core/
│       │   ├── models/            # producto.ts, pedido.ts, perfil.ts, auditoria.ts, enums.ts
│       │   ├── services/          # supabase.service.ts, auth.service.ts, producto.service.ts,
│       │   │                      # pedido.service.ts, resumen.service.ts, auditoria.service.ts
│       │   ├── guards/            # auth.guard.ts, rol.guard.ts
│       │   └── utils/             # errores.ts (mapError), formato.ts (moneda/fecha), estados.ts
│       ├── features/
│       │   ├── login/             # CU-09
│       │   ├── catalogo/          # CU-01 lista + CU-02 formulario producto
│       │   ├── pedidos/           # CU-03 nuevo, CU-05 lista, CU-04/CU-08 detalle (confirmar/cancelar)
│       │   ├── bodega/            # CU-06 despachar
│       │   ├── resumen/           # CU-07 resumen por estado
│       │   └── actividad/         # auditoría (solo admin)
│       ├── shared/                # tabla responsiva, modal, toast, badge-estado, boton-cargando
│       ├── app.routes.ts
│       ├── app.config.ts
│       └── app.component.ts       # shell: barra superior + menú filtrado por rol + <router-outlet>
└── angular.json, package.json, tsconfig*, README.md
```

## 6. Autenticación, roles y permisos

**Login (CU-09):** `supabase.auth.signInWithPassword(email, password)`. Usuarios de prueba (ya existen en la BD):

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@ladorada.test` | `Admin1234*` | admin |
| `vendedor@ladorada.test` | `Vende1234*` | vendedor |
| `bodega@ladorada.test` | `Bode1234*` | bodega |
| `prueba@ladorada.test` | `Prueba1234*` | vendedor |

**`AuthService` con signals:**
- `session` / `perfil` como `signal<Perfil | null>`; `rol` y `autenticado` como `computed()`.
- Al iniciar sesión (y al refrescar el token) lee `perfiles` por `auth.uid()` para obtener `nombre` y `rol`; el JWT también trae `app_metadata.rol` (usa el perfil como fuente principal y el JWT como respaldo).
- `logout()` → `signOut()` + limpiar signals.
- Redirigir a `/login` si no hay sesión; si ya hay sesión en `/login`, mandar a `/catalogo`.

**Guards:**
- `authGuard: CanActivateFn` → sin sesión va a `/login`.
- `rolGuard(roles: ('admin'|'vendedor'|'bodega')[]): CanActivateFn` → sin permiso muestra pantalla 403 amigable.

**Rutas y guards:**

| Ruta | Componente | Guard |
|---|---|---|
| `/login` | LoginComponent | público (si autenticado → `/catalogo`) |
| `/catalogo` | CatalogoComponent | authGuard |
| `/catalogo/nuevo`, `/catalogo/:id` | ProductoFormComponent | rolGuard(['admin','vendedor','bodega']) |
| `/pedidos` | PedidosListaComponent | authGuard |
| `/pedidos/nuevo` | PedidoFormComponent | rolGuard(['admin','vendedor']) |
| `/pedidos/:id` | PedidoDetalleComponent | authGuard (acciones condicionadas por rol) |
| `/bodega` | BodegaComponent | rolGuard(['admin','bodega']) |
| `/resumen` | ResumenComponent | authGuard |
| `/actividad` | ActividadComponent | rolGuard(['admin']) |
| `**` | redirect a `/catalogo` | — |

**Matriz de permisos en UI (la matriz real de la app):**

| Acción | admin | vendedor | bodega |
|---|---|---|---|
| Ver catálogo | ✔ | ✔ | ✔ |
| Crear/editar producto (no existencias) | ✔ | ✖ | ✖ |
| Ajustar **existencias** | ✔ | ✖ | ✔ |
| Desactivar producto | ✔ | ✖ | ✖ |
| Ver pedidos / detalle | ✔ | ✔ | ✔ |
| Crear pedido | ✔ | ✔ | ✖ |
| Confirmar / cancelar pedido | ✔ | ✔ | ✖ |
| Despachar pedido | ✔ | ✖ | ✔ |
| Ver resumen | ✔ | ✔ | ✔ |
| Ver actividad (auditoría) | ✔ | ✖ | ✖ |

**Menú superior filtrado por rol** con esta misma matriz: bodega no ve «Nuevo pedido» ni «Confirmar/Cancelar»; vendedor no ve «Despachar» ni «Actividad»; «Actividad» solo admin. Ninguna acción prohibida debe aparecer siquiera deshabilitada si el rol no la tiene en absoluto; las acciones del rol sí se muestran con estado de carga para evitar doble clic.

## 7. Manejo de errores centralizado

> Nota técnica: `supabase-js` **no** usa `HttpClient`, así que un interceptor HTTP no verá sus errores. El manejo centralizado va en `core/utils/errores.ts` con una función `mapError(err): AppError` que todos los servicios invocan.

`AppError = { titulo: string, mensaje: string, codigo?: string }`. Mapea:

| Origen | Código | Mensaje en UI |
|---|---|---|
| RPC | `INVENTARIO_INSUFICIENTE: …` | Modal/tostada con el **detalle literal** (ej. «disponibles 5, solicitados 12»); el pedido sigue pendiente |
| RPC | `TRANSICION_INVALIDA: …` | «Esta acción no está permitida en el estado actual» + transiciones válidas |
| RPC | `PERMISO_DENEGADO: …` | «No tienes permiso para esta acción» |
| RPC | `PEDIDO_VACIO` / `CANTIDAD_INVALIDA` / `CLIENTE_INVALIDO` / `MOTIVO_REQUERIDO` / `PRODUCTO_INVALIDO` | mensaje literal, junto al campo |
| REST | `42501` / error RLS | «No tienes permiso para esta acción» (sin detalles internos) |
| Auth | `invalid_credentials` | «Correo o contraseña incorrectos» |
| Auth | `401` / token expirado | refrescar sesión o volver a `/login` |
| Red / 5xx | — | «Error de conexión, intenta de nuevo» con botón de reintento |

**Anti doble clic (obligatorio):** todo botón de acción (guardar, confirmar, despachar, cancelar) se deshabilita y muestra spinner mientras `enviando` sea `true`.

## 8. Funcionalidades por pantalla (9 casos de uso)

- **CU-01 Catálogo:** tabla responsiva con referencia, nombre, precio, existencias y estado (activo/inactivo); **búsqueda** por nombre o referencia; orden por nombre; en móvil las filas se apilan en tarjetas. Chips/badges de existencias: verde (≥ 10), ámbar (1–9), rojo (0).
- **CU-02 Formulario producto:** crear y editar (`/catalogo/nuevo`, `/catalogo/:id`); campos referencia (única — maneja el error de duplicado mostrando «ya existe»), nombre (≤ 120), precio ≥ 0, existencias ≥ 0 (solo editable si el rol puede), checkbox activo; validación con Reactive Forms y mensajes en español.
- **CU-03 Nuevo pedido:** formulario con cliente, observación opcional y **líneas dinámicas** (agregar/quitar producto + cantidad ≥ 1); autocompletado de producto desde el catálogo; muestra existencias disponibles (solo lectura); total en vivo con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' })`; al guardar llama `crear_pedido` y navega al detalle con el mensaje «Pedido #… creado».
- **CU-05 Lista de pedidos:** filtros por estado (chips), búsqueda por número o cliente, muestra número (`#1000`), cliente, estado (badge), total y fecha; clic → detalle.
- **CU-04 / CU-08 Detalle de pedido:** cabecera (número, cliente, estado con badge, fechas según estado, motivo si fue rechazado) + tabla de líneas (producto, cantidad, precio unitario, subtotal) + total. Acciones según estado y rol:
  - `pendiente` + rol vendedor/admin → **Confirmar** (llama `confirmar_pedido`; éxito: badge «confirmado» + nota «inventario descontado») y **Cancelar** (modal que pide motivo obligatorio → `cancelar_pedido`).
  - `confirmado` + vendedor/admin → **Cancelar** (con motivo; aclarar en el modal que se reversará el inventario) y (solo bodega/admin) **Despachar** en la pantalla de bodega.
  - `despachado` / `rechazado` → sin acciones.
- **CU-06 Bodega:** lista filtrada por defecto en `confirmado` con detalle expandible; botón **Despachar** por fila con confirmación; al hacerlo, el pedido sale de la lista y aparece la fecha de despacho. Si `pendiente`, bodega puede ver «sin confirmar» (solo lectura, sin botones).
- **CU-07 Resumen:** tarjetas por estado (`pendiente`, `confirmado`, `despachado`, `rechazado`) con conteo y valor total en COP; usa la vista `vw_resumen_por_estado` (o `resumen_por_estado`); total general; se refresca al entrar.
- **CU-09 Login:** pantalla centrada con logo/nombre «La Dorada», correo + contraseña, botón «Ingresar», mensajes de error claros, muestra en un pie discreto los 3 usuarios de prueba (ayuda para la docencia).
- **Actividad (admin):** últimas 50 filas de `auditoria` ordenadas por `creado_en desc`: fecha, usuario (id corto o nombre), rol, tabla, acción (badge INSERT/UPDATE/DELETE) y, si existe, un desplegable con `datos_antes`/`datos_despues` en JSON legible.

## 9. Estados de la máquina de estados (badge y acciones)

| Estado | Color badge | Transiciones permitidas |
|---|---|---|
| `pendiente` | ámbar | → confirmado (vendedor/admin), → rechazado (vendedor/admin) |
| `confirmado` | azul | → despachado (bodega/admin), → rechazado (vendedor/admin) |
| `despachado` | verde | ninguna |
| `rechazado` | rojo | ninguna |

El frontend **sugiere** las acciones; la verdad la dice el servidor (la BD tiene un trigger que rechaza transiciones inválidas).

## 10. UI/UX y calidad

- Diseño sobrio y profesional (no hace falta ser lindo, sí claro): colores primarios en tonos azul oscuro/dorado, tarjetas, tablas con encabezado, espaciado consistente; **SCSS con variables** en `styles.scss` (sin frameworks de CSS).
- **Responsivo real:** funciona bien en 360 px, 768 px y 1440 px; **sin scroll horizontal** en móvil; la tabla del catálogo y de pedidos usa patrón de tarjetas en pantallas pequeñas.
- Estados vacíos en todas las listas («Aún no hay pedidos», «Sin resultados para "…"»), estados de carga con spinner y errores con reintento (nunca una lista vacía que parezca éxito).
- Fechas en formato local (`es-CO`), moneda COP siempre formateada.
- Accesibilidad básica: labels en formularios, `aria-label` en botones de ícono, contraste suficiente.

## 11. Restricciones (no hagas nada de esto)

1. No crees ni modifiques tablas, RPCs, policies, migraciones ni seeds.
2. No uses `service_role`, no expongas secretos, no llames APIs externas.
3. No agregues librerías de UI (Material, PrimeNG, Bootstrap, Tailwind) ni de estados (NgRx); signals + servicios bastan.
4. No uses módulos NgModules: todo standalone.
5. No inventes endpoints ni campos que no estén en §4.
6. No dejes TODOs ni pantallas «stub»: toda pantalla listada en §8 debe funcionar de extremo a extremo contra Supabase.

## 12. Entrega (formato)

1. **Primero** entrega un plan breve: árbol de archivos con una línea de propósito por archivo y el orden en que los escribirás.
2. **Luego** escribe los archivos **completos** (nunca «…» ni «igual que antes»), en este orden: (a) scaffold y `package.json`, (b) `environments` + `core` (models, supabase, auth, guards, utils), (c) `shared`, (d) `app.routes`/`app.config`/shell, (e) features `login` → `catalogo` → `pedidos` → `bodega` → `resumen` → `actividad`, (f) estilos globales y README.
3. Si el contenido no cabe en una respuesta, continúa exactamente donde quedaste sin repetir archivos ya entregados, avisando «continuación: …».
4. Termina con la lista de comandos para correrlo (`npm install && ng serve`) y el checklist de verificación (login con los 3 roles, crear/confirmar/despachar/cancelar un pedido).

## 13. Criterios de aceptación (Definition of Done)

- [ ] `ng build` compila sin errores con `strict: true`.
- [ ] Login/logout funcionan con los 4 usuarios de prueba y el menú cambia según el rol.
- [ ] CRUD de catálogo completo; bodega ajusta existencias y vendedor no puede.
- [ ] Flujo completo de pedido: crear → confirmar (con bloqueo real de inventario) → despachar, y cancelación con motivo; doble clic no genera doble efecto.
- [ ] Ninguna acción visible viola la matriz de §6; en la BD igualmente están bloqueadas (no lo pruebes desde acá, solo no dependas de ocultar botones).
- [ ] Responsivo 360/768/1440 sin scroll horizontal; mensajes en español; estados vacíos y de error implementados.

---

## FIN DEL PROMPT

---

## Cómo trabajarlo (recomendado)

1. **Sesión nueva** en AI Studio, pega el prompt completo.
2. Responde al plan de archivos con «adelante»; si el plan difiere de §5, corrígelo antes de continuar.
3. Pide la generación **por partes** si la IA trunca: «continúa con los archivos que faltan en el orden §12».
4. **Exporta:** si AI Studio ofrece *Export to GitHub*, créale un repo nuevo (`la-dorada-frontend`); si no, copia los archivos a mano o pide el zip.
5. **A local:** dentro de este repo:

   ```powershell
   # desde Proyecto_Final_Distribuidora_La_Dorada/
   git clone <repo-de-ai-studio> frontend
   cd frontend
   npm install
   npm start        # http://localhost:4200
   ```

6. Luego seguimos editando aquí (lint, estructura, pruebas T-01…T-03 con Playwright, ajustes al documento).

## Si algo sale mal

- **Errores de tipos en `environment`:** revisa que no haya comillas tipadas.
- **`PGRST202` al llamar una RPC:** el nombre de un parámetro no coincide con `p_...` (§4 es exacto).
- **42501 en pantalla:** es RLS bloqueando; significa que el frontend intentó una escritura directa prohibida — debe ir por RPC (§4).
- **El menú no coincide con los roles:** revisa `AuthService.perfil` (§6) antes de tocar plantillas.
