# Plan maestro de implementación

**Proyecto:** Sistema de gestión de pedidos e inventario — Distribuidora La Dorada S.A.S.
**Versión:** 1.0 · Noviembre 2026
**Objetivo:** transformar el diseño del documento técnico (`Documento_Tecnico.md`, apartados 5.1–5.10) en un **sistema real**, desplegable y verificable con las pruebas T-01, T-02 y T-03.

> **Qué cubre:** tecnologías, estructura de proyecto, modelo de datos completo (entidades, variables, relaciones), uso de Supabase, autenticación y manejo de peticiones por rol, logs, pruebas, cronograma por jornadas y checklist de cierre.
> **Fuente de verdad funcional:** RF-01…RF-10, NFR-01…NFR-06, RB-01…RB-05 y la matriz de permisos de 5.7.1 del documento técnico.

---

## 0. Meta, alcance y criterios de aceptación

### 0.1 El sistema debe poder (por CU)

| CU | Capacidades mínimas verificables |
|---|---|
| CU-01 | Catálogo con referencia, nombre, precio y existencias; búsqueda por nombre/referencia |
| CU-02 | Crear/editar producto; referencia única; precio y existencias ≥ 0; desactivar sin borrar |
| CU-03 | Crear pedido con cliente y varias líneas; nace `pendiente`; total calculado; cantidades > 0 |
| CU-04 | Confirmar pedido validando existencias **en servidor**, descuento **una sola vez**, bloqueo con motivo |
| CU-05 | Listar/filtrar pedidos, ver detalle y estado; mismo dato en escritorio y móvil |
| CU-06 | Despachar (`confirmado → despachado`) con fecha; transiciones validadas |
| CU-07 | Resumen: conteo y valor total por estado |
| CU-08 | Cancelar → `rechazado`; si estaba `confirmado`, reversión del descuento en la misma transacción |
| CU-09 | Login por correo/contraseña con 3 roles y menú/acciones filtradas por rol |

### 0.2 Definition of Done (global)

- [ ] La app corre en local y en un URL público, responsiva (≥ 360 px sin scroll horizontal).
- [ ] Ningún botón visible permite una acción prohibida por la matriz de permisos **y** RLS bloquea esa acción aunque se llame directo a la API.
- [ ] T-01, T-02 y T-03 pasan con captura/evidencia (5.8).
- [ ] Auditoría: toda escritura relevante queda en `auditoria` con usuario, rol, fecha y valores.
- [ ] Documento actualizado en 5.5, 5.6.4, 5.7 y 5.10 con lo realmente implementado.

---

## 1. Decisiones tecnológicas

| Capa | Elección | Justificación | Descartado |
|---|---|---|---|
| Frontend | **Angular** (componentes standalone + signals + Reactive Forms + SCSS) | Preferencia del equipo; TypeScript estricto, estructura por feature, guardia de tipos y ecosistema maduro | React/Vite (stack anterior del documento, ya sustituido) |
| Cliente de datos | `@supabase/supabase-js` v2 | Una sola librería para REST (PostgREST), RPC y Auth | Clientes HTTP manuales |
| Backend | **Supabase**: PostgreSQL + PostgREST + funciones RPC + Auth + RLS + Logs | Sin servidor propio; reglas críticas en la base (RB-02, RB-03, R-1) | Node/Express propio, Laravel |
| Migraciones | **Supabase CLI** (`supabase migration new`, `db push`, `db reset`) | Versionado del esquema en el repo | Tablas creadas a mano desde el dashboard |
| Desarrollo local | `supabase start` (stack local: PostgREST, Auth, Studio) | Probar sin tocar el proyecto de producción | Trabajar solo contra producción |
| Pruebas unitarias | Vitest (integrado en Angular moderno) para servicios y utilidades de dominio | Rápido, sin navegador | — |
| Pruebas E2E | Playwright (desktop + viewport móvil) | Cubre T-01/T-02/T-03 de extremo a extremo | — |
| Deploy frontend | Vercel o Netlify (build `ng build`) | URL pública y preview por rama | — |
| CI | GitHub Actions: lint + unit + build; migraciones al hacer merge a `main` | Verificación automática | — |

**Variables de entorno (frontend):**

| Variable | Valor | Seguridad |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto | pública |
| `SUPABASE_ANON_KEY` | clave publicable (anon/publishable) | **pública por diseño**: la seguridad real está en RLS, no en ocultarla |
| `SUPABASE_SERVICE_ROLE_KEY` | clave service_role | **NUNCA en el frontend ni en el repo**; solo en scripts/CI si hacen falta, con `.env` en `.gitignore` |

En Angular se guardan en `src/environments/environment.ts` (compiladas en el bundle) — por eso solo pueden ir claves publicables. Las migraciones y seed leen `supabase/.env`.

---

## 2. Estructura del repositorio

```
Proyecto_Final_Distribuidora_La_Dorada/
├── docs/                       # documento técnico, diagramas, este plan, capturas/
├── frontend/                   # app Angular (ng new frontend)
│   └── src/app/
│       ├── core/               # sin lógica de pantalla
│       │   ├── models/         # producto.ts, pedido.ts, perfil.ts, enums.ts
│       │   ├── services/       # supabase.service, auth.service, producto.service,
│       │   │                   # pedido.service, resumen.service, auditoria.service
│       │   ├── interceptors/   # auth.interceptor (401/403/errores RPC)
│       │   ├── guards/         # auth.guard, rol.guard
│       │   └── utils/          # formato-monedas, estados (máquina de transiciones)
│       ├── features/
│       │   ├── login/          # CU-09
│       │   ├── catalogo/       # CU-01, CU-02
│       │   ├── pedidos/        # CU-03, CU-04, CU-05, CU-08
│       │   ├── bodega/         # CU-06
│       │   └── resumen/        # CU-07
│       └── shared/             # tablas responsivas, botones, modales, toast
├── supabase/
│   ├── migrations/             # 0001_esquema.sql, 0002_rls.sql, 0003_rpc.sql, 0004_auditoria.sql
│   ├── seed.sql                # productos + usuarios de prueba
│   └── functions/              # edge functions (solo si hacen falta)
├── e2e/                        # Playwright (T-01, T-02, T-03, rol)
├── scripts/                    # reset-local.ps1, exportar-capturas.ps1
├── PLAN_MAESTRO.md             # este archivo
└── PLAN.md                     # plan del documento (fases de redacción)
```

**Rutas y guards (mapa CU → pantalla):**

| Ruta | Componente | CU | Guard |
|---|---|---|---|
| `/login` | `LoginComponent` | CU-09 | público |
| `/catalogo` | `CatalogoComponent` | CU-01 | `authGuard` |
| `/catalogo/nuevo`, `/catalogo/:id` | `ProductoFormComponent` | CU-02 | `rolGuard(['admin','vendedor','bodega'])`* |
| `/pedidos` | `PedidosListaComponent` | CU-05 | `authGuard` |
| `/pedidos/nuevo` | `PedidoFormComponent` | CU-03 | `rolGuard(['admin','vendedor'])` |
| `/pedidos/:id` | `PedidoDetalleComponent` (confirmar/cancelar) | CU-04, CU-08 | `rolGuard(['admin','vendedor'])` |
| `/bodega` | `BodegaComponent` (despachar) | CU-06 | `rolGuard(['admin','bodega'])` |
| `/resumen` | `ResumenComponent` | CU-07 | `authGuard` |

\* el guard habilita la acción según el formulario; la regla dura está en RLS (§6).

---

## 3. Modelo de datos: entidades, variables y relaciones

Alineado con 5.6 del documento y la Figura 5. Nombres en español minúscula, marcas de tiempo en `timestamptz`, ids `uuid`.

### 3.1 Esquema completo (resumen por entidad)

**`perfiles`** — identidad y rol (extiende `auth.users`)

| Variable | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | uuid | PK, **FK → auth.users.id** (on delete cascade) | Uno por usuario autenticado |
| `nombre` | text | not null | Nombre visible |
| `rol` | text | CHECK IN (`admin`,`vendedor`,`bodega`) not null | Rol funcional (matriz 5.7.1) |
| `activo` | boolean | default true | Permite deshabilitar sin borrar |
| `creado_en` | timestamptz | default now() | Alta |

> Trigger `on auth.users → handle_new_user()`: al registrarse crea el `perfiles` con rol por defecto `vendedor`; el `admin` lo cambia. Se guarda **además** `rol` en `app_metadata` del JWT (§6.3) para que RLS no dependa de una tabla.

**`productos`** — catálogo e inventario (CU-01, CU-02)

| Variable | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | uuid | PK | Identificador |
| `referencia` | text | **UNIQUE** not null | Código de búsqueda (RF-01) |
| `nombre` | text | not null, length ≤ 120 | Nombre comercial |
| `precio` | numeric(12,2) | CHECK ≥ 0 | Precio de venta |
| `existencias` | integer | CHECK ≥ 0 | **Inventario** (RB, R-1) |
| `activo` | boolean | default true | Ocultar sin romper histórico |
| `creado_en`, `actualizado_en` | timestamptz | default now() | Trazabilidad |
| Índice | `ix_productos_nombre` on (lower(nombre)) | — | Búsqueda RF-10 |
| Índice | `ix_productos_activo` on (activo) where activo | — | Catálogo |

**`pedidos`** — cabecera de pedido (CU-03…CU-08)

| Variable | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | uuid | PK | Identificador |
| `numero` | text | **UNIQUE** not null | Número visible, formato `PED-2026-0001` (secuencia) |
| `cliente` | text | not null | Cliente por WhatsApp |
| `estado` | text | CHECK IN (`pendiente`,`confirmado`,`despachado`,`rechazado`) default `pendiente` | Máquina de estados RB-04 |
| `total` | numeric(14,2) | CHECK ≥ 0 default 0 | Suma de líneas (RF-07) |
| `vendedor_id` | uuid | FK → perfiles.id | Quien lo creó |
| `observacion` | text | — | Notas libres |
| `motivo_rechazo` | text | — | Motivo al cancelar (CU-08) |
| `confirmado_en`, `despachado_en`, `rechazado_en` | timestamptz | — | Fechas por transición |
| `creado_en`, `actualizado_en` | timestamptz | default now() | Trazabilidad |
| Índice | `ix_pedidos_estado` on (estado, creado_en desc) | — | Listas y resumen |
| Índice | `ix_pedidos_vendedor` on (vendedor_id) | — | Filtrado por usuario |

**`pedido_items`** — líneas (relación N:M resuelta)

| Variable | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | uuid | PK | Línea |
| `pedido_id` | uuid | FK → pedidos **ON DELETE CASCADE** | 1:N con pedido |
| `producto_id` | uuid | FK → productos **ON DELETE RESTRICT** | 1:N con producto |
| `cantidad` | integer | **CHECK > 0** | RB-01 a nivel de BD |
| `precio_unitario` | numeric(12,2) | CHECK ≥ 0 | Precio congelado al registrar |
| Índice/única | UNIQUE (pedido_id, producto_id) | — | Un producto por línea (fusiona cantidades) |

**`auditoria`** — log propio de datos (§7)

| Variable | Tipo | Descripción |
|---|---|---|
| `id` | bigserial PK | Correlación |
| `tabla` | text | `productos`, `pedidos`, `pedido_items` |
| `registro_id` | uuid | Registro afectado |
| `accion` | text CHECK IN (INSERT/UPDATE/DELETE) | Qué pasó |
| `datos_antes`, `datos_despues` | jsonb | Cambios (solo columnas modificadas) |
| `usuario_id` | uuid | `auth.uid()` |
| `usuario_rol` | text | Rol al momento de la acción |
| `creado_en` | timestamptz default now() | Cuándo |
| Índice | on (tabla, creado_en desc) | Consultas del admin |

**Vista `vw_resumen_por_estado`** — alimenta CU-07 y el dashboard del admin:

```sql
create or replace view vw_resumen_por_estado as
select estado, count(*)::int as pedidos, coalesce(sum(total),0) as valor
from pedidos group by estado;
```

**Semántica de estados** (RB-04, se valida en BD y en el frontend):

| Origen → Destino | ¿Quién? | Efecto en existencias |
|---|---|---|
| (nuevo) → `pendiente` | vendedor/admin | ninguno |
| `pendiente` → `confirmado` | vendedor/admin | **descuento único** (RPC) |
| `pendiente` → `rechazado` | vendedor/admin | ninguno |
| `confirmado` → `despachado` | bodega/admin | ninguno (ya descontado) |
| `confirmado` → `rechazado` | vendedor/admin | **reversión única** (RPC) |
| `despachado` → (cualquiera) | — | **no permitido** en v1 |
| `rechazado` → (cualquiera) | — | no permitido |

### 3.2 Relaciones (cardinalidades)

- `auth.users` **1 — 1** `perfiles`.
- `perfiles` **1 — N** `pedidos` (autor).
- `pedidos` **1 — N** `pedido_items` (cascada).
- `productos` **1 — N** `pedido_items` (RESTRICT: no se borra un producto con histórico → CU-02/A3).
- `productos` **N — M** `pedidos` (resuelta por `pedido_items`).

### 3.3 Funciones RPC del servidor (capa de lógica)

Todas en `security definer`, `set search_path = public`, con `auth.uid()`; la UI solo las invoca (nunca escribe `existencias` a mano).

| RPC | Parámetros | Reglas que implementa | Error típico |
|---|---|---|---|
| `crear_pedido(p_cliente text, p_items jsonb)` | `[{producto_id, cantidad}]` | RB-01, total, `pendiente`, números secuenciales | `PEDIDO_VACIO`, `CANTIDAD_INVALIDA` |
| `confirmar_pedido(p_pedido_id uuid)` | — | RB-02, RB-03, R-1: relee existencias, valida `FOR UPDATE`, descuenta y cambia estado **en una transacción** | `INVENTARIO_INSUFICIENTE: disponibles X, solicitados Y` |
| `despachar_pedido(p_pedido_id uuid)` | — | Transición `confirmado → despachado` + fecha | `TRANSICION_INVALIDA` |
| `cancelar_pedido(p_pedido_id uuid, p_motivo text)` | — | Transición y reversión si estaba confirmado; `motivo_rechazo` | `TRANSICION_INVALIDA`, `REVERSION_FALLIDA` |
| `resumen_por_estado()` | — | RF-07 (o usar la vista) | — |
| `rol_actual()` | — | helper de RLS (devuelve `app_metadata.rol`) | — |

Ejemplo del núcleo (confirmar), patrón que se replica en cancelar:

```sql
create or replace function confirmar_pedido(p_id uuid)
returns pedidos language plpgsql security definer as $$
declare p pedidos; faltante text;
begin
  select * into p from pedidos where id = p_id for update;   -- bloquea la fila
  if p.estado <> 'pendiente' then
    raise exception 'TRANSICION_INVALIDA: el pedido no esta pendiente'; end if;
  select string_agg(format('%s (disponibles %s, solicitados %s)', pr.nombre, pr.existencias, s.cant), '; ')
    into faltante
    from (select producto_id, sum(cantidad) cant from pedido_items
          where pedido_id = p_id group by producto_id) s
    join productos pr on pr.id = s.producto_id
    where pr.existencias < s.cant;
  if faltante is not null then
    raise exception 'INVENTARIO_INSUFICIENTE: %', faltante;    -- RB-02
  end if;
  update productos pr set existencias = pr.existencias - s.cant
    from (select producto_id, sum(cantidad) cant from pedido_items
          where pedido_id = p_id group by producto_id) s
    where pr.id = s.producto_id;                                -- descuento ÚNICO (RB-03)
  update pedidos set estado = 'confirmado', confirmado_en = now(), actualizado_en = now()
    where id = p_id;
  return p;
end $$;
```

Las transiciones se protegen además con un `BEFORE UPDATE` sobre `pedidos` que solo admite los pares de la tabla de semántica (§3.1) — doble cera (BD) aunque alguien salte la RPC.

---

## 4. Supabase: qué servicios se usan y para qué

| Servicio Supabase | Uso concreto en este proyecto | Prioridad |
|---|---|---|
| **Postgres** | Persistencia única (RB-05) con constraints, índices y transacciones | Must |
| **PostgREST (API REST automática)** | Lecturas de catálogo y listas (`select`, filtros, paginación) | Must |
| **Funciones RPC** | Toda escritura con regla de negocio (crear/confirmar/despachar/cancelar) | Must |
| **RLS** | Manejo de permisos **por rol a nivel de base de datos** (§6) | Must |
| **Supabase Auth** | Login correo/contraseña, sesión, JWT con `app_metadata.rol`; manejo de usuarios (§6.2) | Must (RF-08) |
| **Logs / Log Explorer** | Auth logs, Postgres logs y unified logs (§7) | Must |
| **Supabase CLI + migraciones** | Esquema versionado y reseteable en un comando | Must |
| **Seed / SQL** | Datos ficticios de prueba (productos, usuarios por rol) | Must |
| **Realtime** | Opcional: refrescar la lista de pendientes de bodega sin F5 | Could |
| **Edge Functions** | Opcional: exportar CSV del resumen del día; en el futuro, aviso WhatsApp al confirmar | Could |
| **Storage** | Opcional: fotos de productos en el catálogo | Won't (v1) |
| **pg_cron** | Opcional: cronograma de respaldos/limpieza de `auditoria` | Won't (v1) |
| **service_role key** | Solo en scripts locales/CI para seed masivo; jamás en el frontend | — |

---

## 5. Variables y configuración del entorno

| Dónde | Contenido |
|---|---|
| `frontend/src/environments/environment.ts` | `supabaseUrl`, `supabaseAnonKey` (publicables), `production` |
| `frontend/.env` (opcional, gitignored) | overrides por entorno si CI usa otra clave |
| `supabase/.env` | `SUPABASE_ACCESS_TOKEN` (CLI), `PROJECT_REF` |
| `supabase/config.toml` | generado por `supabase init` |
| `.gitignore` | `.env*`, `service_role`, `node_modules`, `dist`, `supabase/.temp` |
| Secrets en GitHub Actions | `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN` (nunca la service key en el frontend) |

**Reglas de variables:**
1. Ningún secreto en `src/` (todo lo compilado es público).
2. La RLS es la barrera real; la anon key solo identifica el proyecto.
3. Un solo lugar por variable: si aparece escrita dos veces, está mal.

---

## 6. Autenticación, roles y manejo de peticiones por rol

### 6.1 Flujo de sesión

1. `LoginComponent` → `supabase.auth.signInWithPassword(email, password)`.
2. El JWT trae `app_metadata: { rol }`; `AuthService` lo expone como `signal<Perfil>` (`nombre`, `rol`).
3. Cada refresh de token relee `perfiles` para mantener el nombre/estado y **refresca el JWT** si cambió el rol.
4. `logout` → `signOut()` + limpieza de signals.

### 6.2 Usuarios de prueba (seed)

| Correo | Password | Rol | Para probar |
|---|---|---|---|
| `admin@ladorada.test` | `Admin1234*` | admin | todo |
| `vendedor@ladorada.test` | `Vende1234*` | vendedor | CU-02 (catálogo), CU-03, CU-04, CU-08 |
| `bodega@ladorada.test` | `Bode1234*` | bodega | CU-06, existencias |
| `prueba@ladorada.test` | `Prueba1234*` | vendedor | T-01/T-02 automatizados |

### 6.3 Permisos en la base: RLS por rol (el “manejo de peticiones según rol” real)

Policies (versión resumida; tabla completa en `0002_rls.sql`):

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `productos` | todos los roles | solo admin | admin; bodega solo `existencias` (columna protegida por trigger `fn_productos_reglas`) | admin (y solo si `activo=false` y sin pedidos) |
| `pedidos` | todos los roles | admin, vendedor | vía RPC: vendedor (confirmar/cancelar), bodega (despachar), admin (todo) | no (histórico) |
| `pedido_items` | todos los roles | solo vendedor/admin al crear | no | en cascada con `pedidos` (solo si el pedido está `pendiente`) |
| `perfiles` | quien autentica (propio) y admin | trigger | admin; uno mismo solo `nombre` | no |
| `auditoria` | admin | solo triggers (`security definer`) | no | no |

Patrón base:

```sql
alter table productos enable row level security;

create policy "productos_select" on productos for select
  to authenticated using (true);                     -- RF-01: todos leen

create policy "productos_insert" on productos for insert
  to authenticated with check (rol_actual() in ('admin','vendedor','bodega'));

create policy "productos_update_bodega" on productos for update
  to authenticated
  using (rol_actual() = 'bodega')
  with check (rol_actual() = 'bodega'
    and (select to_jsonb(new.*) is not null));        -- bodega solo toca existencias:
                                                     -- se refina con una columna-with-check
-- pedidos: los estados solo cambian por RPC (security definer, que salta RLS)
create policy "pedidos_select" on pedidos for select to authenticated using (true);
```

> **Clave:** las escrituras con reglas (confirmar/cancelar/despachar) van **solo por RPC con `security definer`**, que es quien salta la RLS de forma controlada. Un UPDATE directo a `pedidos` desde el cliente queda sin policy → 42501 → el interceptor lo convierte en «No tienes permiso para esta acción».

### 6.4 Frontend: capa de peticiones

```
Componente (solo pinta y llama al servicio)
   → Servicio (dominio: ProductoService, PedidoService…)
      → Cliente supabase (RPC / select)  ← attach del token por sesión
         → Interceptor global (errores 401/403/409/500 → AppError tipado → toast)
```

- **`authGuard`:** sin sesión → `/login`.
- **`rolGuard(['vendedor',…])`:** sin rol → pantalla 403 amigable (y además la RLS lo bloquearía).
- **Menú filtrado por rol:** `bodega` no ve «Nuevo pedido»; `vendedor` no ve «Despachar» (matriz 5.7.1).
- **Manejo de errores centralizado:**
  - `401` / sesión expirada → refrescar token o redirigir a login (CU-09/A2).
  - `403` (`42501`) → «No tienes permiso…» (no revelar detalle).
  - Error RPC `INVENTARIO_INSUFICIENTE` → modal con el **motivo literal** (RB-02) y el pedido sigue `pendiente`.
  - `TRANSICION_INVALIDA` → mensaje con las transiciones válidas (RB-04).
  - Red/5xx → reintentar una vez y avisar; nunca dejar el botón en «cargando» eterno (R-1).
- **Anti doble clic (R-1):** botón deshabilitado mientras `enviando=true` + el servidor garantiza descuento único aunque llegue dos veces.
- **Sin confianza en el cliente:** el formulario solo pide cliente, líneas y cantidades; total y existencias se revalidan en el servidor.

---

## 7. Logs y trazabilidad (aprovechar lo que ya da Supabase)

| Fuente | Qué da | Cómo se usa | Quién lo mira |
|---|---|---|---|
| **Auth logs** (Dashboard → Authentication → Logs) | logins, logouts, intentos fallidos, resets | Ver quién entró, cuándo y desde dónde; detectar intentos fallidos del seed/pruebas | Equipo, revisión antes de la entrega |
| **Postgres logs** | queries lentas, errores `42501` (RLS denegada), violaciones de constraints | Detectar quién intentó acciones fuera de rol y optimizar lentos | Equipo |
| **Unified logs** (Log Explorer, tabla `logs` con ClickHouse) | consultas por servicio, filtros por `error_code` | Guardar evidencia para 5.8/5.10 (capturas del log) | Docente |
| **Tabla `auditoria`** (triggers propios) | **quién cambió qué dato, antes/después, rol** | Pantalla «Actividad» del admin: últimas ediciones de precios/existencias y cambios de estado | Admin (CU-02, CU-06) |
| **Fechas en `pedidos`** (`confirmado_en`, `despachado_en`, `rechazado_en`) | trazabilidad de la máquina de estados | Resumen y control de tiempos | Gerencia |
| **Eventos de la app** (opcional, tabla `eventos_app`) | acciones clave del frontend (ej.: «confirmó pedido») | Métricas M-1…M-3 de 5.9 (más que con logs de BD) | Equipo |

**Qué implementar (obligatorio):**
1. Trigger `audit` en `productos` y `pedidos` (INSERT/UPDATE/DELETE) → `auditoria`.
2. Rutina de revisión documental: capturar en `docs/capturas/` un Auth log y un Postgres log como evidencia.
3. Vista admin «Actividad reciente» (`select * from auditoria order by creado_en desc limit 50`), solo rol `admin`.

**Qué NO hacer:** enviar datos personales o la service key a servicios externos; la auditoría vive dentro de la propia base.

---

## 8. Pruebas (alimenta 5.8)

| Prueba | Nivel | Qué verifica | Evidencia |
|---|---|---|---|
| **T-01** pedido válido | E2E Playwright + SQL de verificación | Crear → confirmar: estado `confirmado`, existencias descontadas **exactamente** `cantidad`, `total` correcto | video/captura + SELECT前后 |
| **T-02** inventario insuficiente | E2E | Confirmar con cantidad > existencias → mensaje con motivo, estado sigue `pendiente`, existencias **sin** cambios | captura del modal + SELECT |
| **T-03** escritorio = móvil | E2E con dos viewports (1440 y 390 px) | Mismo pedido se ve idéntico (número, estado, total) en ambos tamaños | 2 capturas |
| Unitarias | Vitest | `calcularTotal`, máquina de estados, parseo de errores RPC | reporte |
| RLS | SQL (`set request.jwt.claims`) | bodega no inserta `pedidos`; UPDATE directo a `pedidos` falla | salida SQL |
| Doble clic | E2E | Dos envíos rápidos → un solo descuento (RB-03) | video |

Comandos: `npm run test` (unit), `npm run e2e` (Playwright), `npm run test:rls` (script SQL).

---

## 9. Cronograma por jornadas (guía: 4 jornadas)

### Jornada 1 — Base y esquema

- [ ] Repo con `.gitignore`, README, esta estructura; `ng new frontend` (standalone, SCSS, routing).
- [x] `supabase init`; crear proyecto; `migration new 0001_esquema` con las 5 tablas + constraints + índices + semántica de estados. — *Hecho vía MCP contra el proyecto remoto (`xpmccpujsxrpvkcbafzw`); SQL consolidado en `supabase/migrations/0001..0005`.*
- [x] `0002_rls.sql` + `handle_new_user`; `0003_rpc.sql` (5 funciones); `0004_auditoria.sql`.
- [x] `seed.sql`: 15 productos ficticios + 4 usuarios (§6.2).
- [x] Verificación con SQL (SELECTs y RPC) + pruebas E2E vía REST con JWT por rol: T-01 (descuento único 120→115), T-02 (`INVENTARIO_INSUFICIENTE` con motivo, inventario intacto), T-03 (cancelar confirmado revierte existencias), RLS (UPDATE/DELETE directo = 0 filas, INSERT = 42501, anon = 42501), permisos por rol (bodega no crea pedidos, vendedor no despacha ni toca existencias, cambio de rol solo admin), auditoría (admin ve filas, vendedor 0).
- **Pendiente local:** `ng new frontend`; `supabase db reset` local (el SQL de `supabase/migrations/` está listo).
- **Incidencia resuelta:** inserts manuales en `auth.users` con `NULL` en columnas token → GoTrue fallaba el login (`converting NULL to string`). El seed ya usa `''` (ver `0005_seed.sql`).
- **Advisors:** sin errores; quedan 5 WARN aceptados (4 RPC de negocio + `rol_actual` deben ser ejecutables por `authenticated`) e INFO de índices sin uso (proyecto nuevo). `anon` sin grants en nuestras tablas.
- **Evidencia:** captura de Studio con tablas + salida de pruebas.

### Jornada 2 — Sesión, roles y catálogo

- [ ] `SupabaseService`, `AuthService` (signal), `authGuard`, `rolGuard`, interceptor de errores.
- [ ] Login + menú por rol + redirección post-login.
- [ ] Catálogo (CU-01) con búsqueda y tabla responsiva; formulario de producto (CU-02) con validaciones cliente y referencia única manejada.
- [ ] Prueba de RLS con los 3 usuarios (script `test-rls.sql`).
- **Evidencia:** capturas de catálogo en desktop y móvil; salida de `test-rls`.

### Jornada 3 — Pedidos y reglas de negocio

- [ ] Crear pedido (CU-03) con líneas dinámicas y validación RB-01 en cliente.
- [ ] Detalle de pedido: confirmar (CU-04 vía `confirmar_pedido`), cancelar (CU-08 con motivo), estados con badge de color.
- [ ] Lista de pedidos con filtros por estado y búsqueda (CU-05).
- [ ] Bodega: despachar (CU-06); resumen (CU-07) con la vista.
- [ ] Pantalla «Actividad» (auditoria) para admin; auditoría verificada con un par de ediciones.
- **Evidencia:** flujo completo de un pedido real en local (5 capturas).

### Jornada 4 — Pruebas, pulido y entrega

- [ ] T-01, T-02, T-03 automatizadas + prueba de doble clic + `test-rls`.
- [ ] Responsive fino (360/768/1440), estados vacíos y de error, mensajes en español.
- [ ] Deploy: frontend a Vercel + proyecto Supabase de producción con seed realista.
- [ ] Evidencias de logs (Auth + Postgres) en `docs/capturas/`.
- [x] **Actualizar el documento:** 5.6.4 (desplegado), 5.7.1/5.7.3 (de *propuesto* a *implementado*), 5.8 con resultados reales, 5.10 balance. — *Hecho: documento v3.2 sincronizado.*
- **Evidencia:** URL pública + pruebas en verde + Word actualizado.

---

## 10. Riesgos técnicos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Doble descuento (R-1) | RPC transaccional con `FOR UPDATE` + CHECK + botón bloqueado; prueba de doble clic |
| Acciones fuera de rol (R-2) | RLS + RPC `security definer` + guard/menú en frontend (defensa en profundidad) |
| Pérdida de integridad al editar en paralelo | Revalidación al confirmar; `updated_at` trigger |
| Errores poco claros para el usuario | Mapeo fijo de `error_code`/mensaje SQL → texto amigable en `mapError()` |
| Que el documento quede desincronizado del código | Checklist §11 en la Jornada 4; los códigos RF/RB/CU del plan son los mismos del Word |
| Claves expuestas | Revisión de `.gitignore` + grep de `service_role` antes de cada commit |
| Tiempo (4 jornadas) | Orden de prioridad: datos → catálogo → pedidos → roles/RLS → pruebas; Realtime/Edge/Storage solo si sobra |

---

## 11. Pendientes explícitos (sync con el documento técnico)

- [x] **5.5.1/5.5.3:** reemplazar «React (Vite)» por «Angular» y actualizar la justificación (§1 de este plan). — *Hecho: 5.5, Figura 4 y PLAN.md actualizados a Angular.*
- [x] **5.6.4:** marcar tablas y `confirmar_pedido()` como *implementadas* con los nombres reales (`perfiles`, `auditoria`, fechas de transición). — *Hecho: tabla real desplegada, incluye `perfiles`, `auditoria` y fechas `confirmado_en`/`despachado_en`/`rechazado_en`.*
- [x] **5.7.1/5.7.3:** la matriz pasa de *propuesta documental* a *implementada* (RLS + guards); documentar cómo se prueba. — *Hecho: 5.7.1 describe las tres capas (menú/rutas/RLS) y 5.7.3 separa controles implementados de propuestos.*
- [x] **5.8:** incluir resultados reales de T-01/T-02/T-03 (capturas, fechas, insumos). — *Hecho: T-01 (60→55, `TRANSICION_INVALIDA`) y T-02 (`INVENTARIO_INSUFICIENTE` literal) ejecutadas el 09/11/2026; T-03 parcial (persistencia por API) y capturas pendientes para la sustentación.*
- [x] **5.10:** balance final con lo construido y lo pendiente (Realtime, fotos, WhatsApp). — *Hecho: 5.10.1–5.10.4 actualizados; pendientes = evidencia móvil, alertas/respaldos/WhatsApp y publicación.*
- [x] **Figura 4 (arquitectura):** regenerar el `.puml` si cambia el nombre de la capa de interfaz a Angular. — *Hecho: `arquitectura.puml` con Angular y regenerado.*

---

## 12. Comandos clave (referencia rápida)

```powershell
# arranque
npm install -g @angular/cli @supabase/cli
ng serve                              # frontend en http://localhost:4200
supabase start                        # stack local (Studio en http://localhost:54323)

# base de datos
supabase migration new 0005_xxx       # nueva migración
supabase db reset                     # recrea local con migraciones + seed
supabase db push                      # aplica migraciones al proyecto remoto

# calidad
ng lint ; ng build ; npm run test     # lint, build, unitarias
npx playwright test                   # T-01/T-02/T-03

# entrega
ng build --configuration production    # artefacto para Vercel/Netlify
```
