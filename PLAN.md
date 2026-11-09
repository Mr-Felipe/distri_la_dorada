# PLAN DE PROYECTO — Sistema de gestión de pedidos e inventario
## Distribuidora La Dorada S.A.S.

**Asignatura:** Desarrollo de Sistemas de Información Empresariales (Semestre 6)
**Fuente:** `Proyecto_Final_Distribuidora_La_Dorada_Guia_Estudiantes.docx`
**Equipo:** 3 estudiantes · 4 jornadas de 4 horas + trabajo autónomo
**Peso en la nota:** 45 % de la asignatura

---

## 1. Resumen del encargo (qué pide la guía)

Construir un **sistema de información empresarial** que conecte **productos → inventario → pedidos**, con:

1. Catálogo de productos (consulta/registro/edición) con precio y existencias.
2. Registro de pedidos con uno o varios productos y cantidades.
3. **Validación de disponibilidad antes de confirmar** (bloqueo con motivo).
4. Seguimiento de estados del pedido con transiciones coherentes.
5. **Persistencia real**: cerrar y reabrir la aplicación debe conservar los datos.
6. Aplicación **web responsiva** (computador y teléfono); móvil nativo es opcional y no suma puntos.

> **Criterio central de la guía:** *"una solución coherente y verificable vale más que muchas pantallas o funcionalidades incompletas"*. Un prototipo navegable **sin reglas ejecutables y sin persistencia no cumple el mínimo**.

---

## 2. Reglas de negocio obligatorias (no negociables)

| # | Regla | Implicación técnica |
|---|-------|---------------------|
| RB-01 | Rechazar cantidades ≤ 0 | Validación en formulario **y** en servidor (BD) |
| RB-02 | Impedir confirmación con inventario insuficiente y **mostrar el motivo** | Transacción `FOR UPDATE` / RPC atómica; mensaje explícito al usuario |
| RB-03 | Descontar existencias **una sola vez** al confirmar (sin doble descuento) | Descuento dentro de la misma transacción que cambia el estado; idempotencia |
| RB-04 | Estados definidos (pendiente, confirmado, despachado, rechazado) + transiciones permitidas + cancelaciones | Máquina de estados validada en servidor |
| RB-05 | Vista escritorio y móvil consultan **los mismo registros** | Una sola base de datos / un solo API; el móvil es otra capa de presentación |

---

## 3. Alcance y exclusiones

### 3.1 Dentro del alcance (Must)
- Catálogo de productos con CRUD básico.
- Creación de pedidos con múltiples líneas (producto + cantidad).
- Validación de existencias y bloqueo de confirmaciones inválidas.
- Consulta de detalle y estado de pedidos; cambios de estado válidos.
- Persistencia y recuperación de datos.
- Interfaz responsiva (desktop + móvil/emulador en el navegador).

### 3.2 Exclusiones explícitas (documentar en el apartado 5.3)
- Integración con WhatsApp, pagos reales, facturación fiscal, contabilidad, logística avanzada.
- App móvil **nativa** (opcional, sin puntos adicionales).
- Autenticación/roles diferenciados → **RF-08 = Could**, es opcional. La **matriz de roles 5.7 es solo documental**.

### 3.3 Requerimientos funcionales de referencia (guía §6)

| Código | Funcionalidad | Prioridad MoSCoW |
|--------|---------------|------------------|
| RF-01 | Consultar productos, precios y existencias | Must |
| RF-02 | Registrar o editar productos | Must |
| RF-03 | Registrar pedidos con productos y cantidades | Must |
| RF-04 | Validar existencias y bloquear confirmación inválida | Must |
| RF-05 | Consultar pedidos y actualizar estados | Must |
| RF-06 | Guardar y recuperar registros | Must |
| RF-07 | Resumen de pedidos por estado | Should |
| RF-08 | Autenticación y permisos diferenciados | Could |

### 3.4 Requerimientos no funcionales propuestos (mínimo 4, verificables — redactarlos en 5.3)
| Código | NFR | Criterio de verificación |
|--------|-----|--------------------------|
| NFR-01 | Responsividad | La UI es usable a 360 px de ancho sin scroll horizontal en 3 pantallas clave |
| NFR-02 | Tiempo de respuesta | Listado de productos y de pedidos carga en < 2 s con 500 registros |
| NFR-03 | Persistencia | Tras recargar/cerrar y reabrir, los datos siguen intactos |
| NFR-04 | Integridad | No es posible descontar existencias dos veces para el mismo pedido (verificable por prueba) |
| NFR-05 | Disponibilidad de datos | Todo pedido consultado desde móvil muestra el mismo estado que en desktop (misma fuente) |

---

## 4. Decisiones técnicas (stack elegido)

**Stack: Angular + Supabase (Postgres)**

| Capa | Elección | Justificación |
|------|----------|---------------|
| Interfaz | Angular (componentes standalone + signals + TypeScript) | Tipado estricto, estructura por feature, *guards* por rol y *reactive forms* para la validación de pedidos |
| Estilos | CSS moderno (flexbox/grid) + media queries | Sin dependencias pesadas; control total de la vista móvil |
| Lógica / API | Supabase (Postgres + JS client) | Persistencia real en la nube, sin backend propio que mantener |
| Reglas de negocio críticas | **Edge Functions / RPC (SQL atómico)** | Garantiza RB-02 y RB-03 a nivel de base de datos, no solo en el navegador |
| Datos | Datos ficticios precargados (semillas) | La guía exige datos ficticios |
| Diagramas | PlantUML (reutilizar `../diagramas-plantuml/`) | Ya existen diagramas As-Is/To-Be y de arquitectura MVC de actividades previas |

**Correspondencia con la guía (5.5):** en ese apartado se explica *cómo interactúan productos, pedidos e inventario* — será el núcleo de la justificación arquitectónica.

---

## 5. Arquitectura propuesta (3 niveles)

```
[ Presentación ]  Angular (web responsiva) ── misma app, misma API
        │  HttpClient + supabase-js
[ Lógica ]        Supabase: vistas/RPC + Edge Functions (reglas de negocio)
        │
[ Datos ]         PostgreSQL (productos, pedidos, pedido_items) — fuente única
```

**Principios arquitectónicos a declarar (pide 3):**
1. *Una sola fuente de verdad* (Postgres centraliza productos, inventario y pedidos).
2. *Reglas de negocio en la capa de datos* (validación atómica, no solo en el cliente).
3. *Separación de capas MVC* — coherente con lo trabajado en la asignatura (Actividad 5).

---

## 6. Modelo de datos inicial (borrador para el apartado 5.6)

```
productos(id PK, referencia UNIQUE, nombre, precio, existencias, activo, created_at)

pedidos(id PK, numero UNIQUE, cliente, estado ENUM, total, observacion,
        creado_en, actualizado_en)

pedido_items(id PK, pedido_id FK→pedidos ON DELETE CASCADE,
             producto_id FK→productos, cantidad INT CHECK (cantidad > 0),
             precio_unitario)
```

**Cardinalidades:**
- `productos 1 ── N pedido_items N ── 1 pedidos` (relación N:M entre productos y pedidos).
- Descuento de `productos.existencias` **solo** al pasar el pedido a `confirmado`.

**Máquina de estados (RB-04):**

```
pendiente ──confirmar──▶ confirmado ──despachar──▶ despachado
    │                        │
    └──rechazar/cancelar──▶ rechazado ◀──rechazar──┘
```
Transiciones no permitidas (ej. `despachado → pendiente`) deben rechazarse con mensaje.

---

## 7. Plan de trabajo — 4 jornadas

### Jornada 1 · Análisis
- [x] Diagnóstico: hechos vs. hipótesis (§5.1).
- [x] Actores y flujo de información.
- [x] Diagrama As-Is (creado: `docs/diagramas/as-is-la-dorada.puml/.png`).
- [x] Diagrama To-Be + tabla de ≥4 mejoras esperadas (6 mejoras M1–M6).
- [x] Requerimientos RF/NFR, MoSCoW, criterios de aceptación, exclusiones.
- **Evidencia:** apartados **5.1–5.3** en borrador → `docs/Documento_Tecnico.md` ✅

### Jornada 2 · Diseño + primer módulo
- [x] 3 historias de usuario (HU-01…HU-03).
- [x] Diagrama general de casos de uso + casos detallados con flujo principal y alterno (**9 casos, CU-01…CU-09**, por indicación del docente: todos los casos del diagrama).
- [x] Arquitectura, justificación, 3 principios, interacción productos-pedidos-inventario.
- [x] Diagrama entidad-relación único.
- [ ] Iniciar app: catálogo de productos (RF-01/RF-02) + persistencia (RF-06).
- **Evidencia:** apartados **5.4–5.6** ✅ + **primer módulo ejecutable** ⬜

### Jornada 3 · Construcción
- [ ] Registrar pedidos con múltiples líneas (RF-03).
- [ ] Validación de existencias y bloqueo con motivo (RF-04) — RB-01/02/03.
- [ ] Estados y transiciones (RF-05) — RB-04.
- [ ] Persistencia verificada (RF-06).
- [ ] Vista móvil/responsiva sobre los mismos registros (RB-05).
- [ ] Resumen de pedidos por estado (RF-07 = Should).
- [ ] Matriz de roles (propuesta documental) — ✅ redactada en 5.7; controles implementados vs. propuestos — ✅
- **Evidencia:** sistema que **acepta y rechaza pedidos según inventario**.

### Jornada 4 · Validación y entrega
- [x] Matriz de pruebas T-01/T-02/T-03 redactada en 5.8 (resultados y evidencia se llenan al ejecutar).
- [x] 3 métricas de éxito propuestas en 5.9 (metas hipotéticas, sin resultados inventados).
- [ ] Ejecutar T-01, T-02 y T-03 y completar resultados/evidencia.
- [ ] Cerrar 5.10 con lo realmente implementado.
- [ ] README con instalación/ejecución + datos de prueba.
- [ ] Presentación de sustentación (15 min: 3 + 3 + 6 + 3).
- **Evidencia:** entrega integrada + demo en vivo.

---

## 8. Escenarios de prueba obligatorios (guía §8 → matriz 5.8)

| # | Escenario | Entrada | Resultado esperado |
|---|-----------|---------|--------------------|
| T-01 | Pedido válido | 20 detergentes disponibles, se piden 5 | Se confirma; existencias quedan en **15**, descontadas **una sola vez** |
| T-02 | Pedido inválido | 8 jabones disponibles, se piden 12 | Confirmación **bloqueada** con motivo; existencias siguen en **8** |
| T-03 | Móvil + persistencia | Consultar pedido desde teléfono/emulador; cerrar y reabrir la app | El pedido se muestra y **persiste** tras reabrir |

*Registrar cada una **una sola vez** en la matriz 5.8 (la guía prohíbe otro informe de pruebas) y ejecutarlas en la sustentación.*

---

## 9. Matriz de responsabilidades sugerida (equipo de 3)

| Rol | Responsable de | Corre responsable de |
|-----|----------------|----------------------|
| A · Análisis y documento | 5.1, 5.2, 5.3, 5.9, 5.10 | Revisión de reglas de negocio |
| B · Diseño y datos | 5.4, 5.5, 5.6 | Esquema BD + RPC/Edge Functions |
| C · Desarrollo UI | Pantallas, responsividad, RF-01/02/03/05 | Pruebas 5.8 + README |

> Todos deben poder explicar **decisiones, reglas, almacenamiento y limitaciones** en la sustentación (se evalúa comprensión individual).

---

## 10. Riesgos y cómo evitarlos

| Riesgo | Impacto | Mitención |
|--------|---------|-----------|
| Hacer muchas pantallas sin reglas reales | Pierde el 30 % + 10 % de la rúbrica | Priorizar **Must** y los 3 escenarios de prueba primero |
| Doble descuento de existencias (doble clic / reenvío) | Violación de RB-03 | Transacción/RPC atómica + bloqueo de botón durante envío |
| Documento duplicado en varios apartados | Penalización (la guía lo prohíbe explícitamente) | Un diagrama/tabla/prueba = **un solo apartado** |
| Confundir matriz de roles propuesta con auth implementada | Malinterpretación del alcance | Marcar RF-08 como Could y declarar "propuesto, no implementado" |
| Trabajo no integrado entre los 3 | Sustentación desbalanceada | Integrar avances frecuentes; cada quien domina su parte |

---

## 11. Criterios de "hecho" (Definition of Done)

- [ ] La regla de negocio funciona en la app **y** es verificable con una prueba.
- [ ] Los datos sobreviven a cerrar/reabrir la aplicación.
- [ ] La misma vista se ve bien en desktop y a 360 px.
- [ ] Cada apartado del documento técnico se completó **una sola vez**, sin duplicados.
- [ ] El equipo puede explicar el "porqué" de cada decisión.

---

## 12. Estructura de carpetas del proyecto

```
Proyecto_Final_Distribuidora_La_Dorada/
├── PLAN.md                  ← este documento
├── README.md                ← (fase 4) instalación, ejecución, datos de prueba
├── docs/                    ← documento técnico, diagramas .puml, imágenes
├── frontend/              ← código fuente (Angular + Supabase)
└── pruebas/                 ← matriz 5.8 y evidencias
```

---

## 13. Próximos pasos inmediatos

1. Definir el reparto exacto de los 3 integrantes (§9).
2. Escribir el borrador de **5.1–5.3** (Jornada 1).
3. Inicializar el proyecto `frontend/` con Angular CLI y conectar Supabase (proyecto/keys); ver `docs/PLAN_MAESTRO.md`.
4. Crear las tablas `productos`, `pedidos`, `pedido_items` + datos ficticios de semilla.
5. Construir catálogo (RF-01/RF-02) → primer módulo ejecutable en Jornada 2.
