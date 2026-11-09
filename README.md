# Distribuidora La Dorada S.A.S. — Pedidos e Inventario

Sistema web para gestionar pedidos e inventario de una distribuidora de alimentos y bebidas: catálogo en línea, creación y confirmación automática de pedidos con control de stock, despacho desde bodega y reportes por estado. Interfaz abierta (sin login).

## Estructura

| Carpeta | Contenido |
|---|---|
| `frontend/` | Aplicación Angular 21 (standalone, signals, reactive forms) + Supabase JS |
| `supabase/migrations/` | Esquema SQL, RLS, RPCs de negocio, auditoría, seed y apertura web (0001 → 0006) |
| `docs/` | Documento técnico, **PROYECTO FINAL INTEGRADOR** (md/html/docx) y diagramas PlantUML |
| `PLAN.md` | Plan de trabajo del equipo |

## Requisitos

- Node.js 20+ y npm
- Un proyecto en [Supabase](https://supabase.com) (la app apunta a `xpmccpujsxrpvkcbafzw`; cámbialo en `frontend/src/environments/environment.ts`)

## Base de datos

Aplica las migraciones **en orden** desde el SQL Editor de Supabase:

1. `0001_esquema_base.sql` — tablas, secuencia de números de pedido, grants
2. `0002_rls_politicas.sql` — políticas RLS
3. `0003_rpc_reglas_negocio.sql` — `crear_pedido`, `confirmar_pedido`, `despachar_pedido`, `cancelar_pedido`, `resumen_por_estado`
4. `0004_auditoria_triggers.sql` — auditoría
5. `0005_seed.sql` — datos de prueba (productos de ejemplo)
6. `0006_web_abierta_sin_login.sql` — abre la app sin autenticación

## Frontend

```bash
cd frontend
npm ci
ng serve          # → http://localhost:4200
```

La URL de Supabase y la clave *publishable* están en `frontend/src/environments/environment.ts`. La clave publishable es pública por diseño: la protección real es RLS en la base de datos.

## Flujo principal (To-Be)

1. Vendedor registra el pedido **una sola vez** (captura única por WhatsApp).
2. El servidor valida existencias y **confirma el pedido automáticamente** si el inventario alcanza (descuento único); si no, queda `pendiente` con el motivo y se corrige con el cliente.
3. Bodega ve los pedidos confirmados en la misma app y los **despacha sin esperas**.
4. Administración consulta el resumen por estado y consolida los pagos sobre los mismos pedidos.

## Documentación

- `docs/PROYECTO FINAL INTEGRADOR.md` (+ `.html`, `.docx`) — entregable oficial
- `docs/Documento_Tecnico.md` (+ `.html`, `.docx`) — cuerpo técnico (5.1–5.10, casos de uso, matriz RF/CU/T)
- `docs/diagramas/*.puml` — fuentes PlantUML; los `.png` están generados y referenciados en el documento
