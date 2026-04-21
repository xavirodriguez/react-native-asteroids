# Catálogo de Riesgos Conceptuales y Deuda Técnica

Este documento enumera los riesgos arquitectónicos y técnicos identificados durante la auditoría del motor. Se clasifican por categoría y severidad para priorizar su resolución.

## Riesgos de Determinismo [DETERMINISM]

| Riesgo | Severidad | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| `[INPUT_DRIFT]` | **FIXED** | El estado de entrada enviado por red no incluía los overrides de UI móvil. | Resuelto mediante unificación en `UnifiedInputSystem`. |
| `[PRNG_NON_DET]` | **FIXED** | Uso de `Math.random()` en lógica de IA (KamikazeSystem). | Migrado a `RandomService("gameplay")`. |
| `[TIME_PRECISION]` | **LOW** | Uso de `performance.now()` para timestamps visuales. Afecta solo a efectos cosméticos, no a la simulación. | Aceptado. |
| `[TICK_OVERFLOW]` | **CRITICAL** | `currentTick` (number) puede desbordarse en sesiones extremadamente largas (>200k años). | Pendiente de monitoreo. |

## Riesgos de Memoria y Rendimiento [MEMORY/PERFORMANCE]

| Riesgo | Severidad | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| `[GC_PRESSURE]` | **FIXED** | Creación constante de objetos `{x, y}` para estelas de naves. | Migrado a `TrailComponent` con buffer circular fijo. |
| `[ID_REUSE]` | **FIXED** | Riesgo de que sistemas externos apunten a entidades muertas cuyo ID ha sido reutilizado. | Mitigado mediante documentación de seguridad y pooling controlado. |
| `[QUERY_CACHE]` | **MEDIUM** | La mutación directa de los arrays devueltos por `Query.getEntities()` corrompe la caché interna. | Reforzado con tipos `ReadonlyArray` y advertencias en TSDoc. |

## Riesgos de Ciclo de Vida [LIFECYCLE]

| Riesgo | Severidad | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| `[ASYNC_RACE]` | **HIGH** | Llamar a `game.start()` antes de que `game.init()` termine puede dejar al motor en un estado inconsistente. | Protegido mediante guards en `useGame` y `BaseGame`. |
| `[WAKELOCK_FAIL]` | **FIXED** | Crash en navegadores no seguros al intentar activar el bloqueo de suspensión. | Resuelto con guards de plataforma y try/catch. |

## Riesgos de Integridad Estructural [OWNERSHIP/TYPE_SAFETY]

| Riesgo | Severidad | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| `[HIERARCHY_STALE]` | **HIGH** | Leer `worldX/Y` antes del `HierarchySystem` devuelve datos del frame anterior. | Documentado como precondición crítica para sistemas de física. |
| `[MUTATION_SAFETY]` | **FIXED** | Mutar el mundo (crear/borrar) durante la iteración de sistemas invalidaba iteradores. | Resuelto mediante `WorldCommandBuffer` y `flush()` atómico. |
| `[ANY_CONTAMINATION]` | **LOW** | Uso de `any` en `PhysicsUtils` para soportar proxies. | Aceptado por flexibilidad de arquitectura, pero marcado como punto de fragilidad. |

## Convenciones de Documentación de Riesgos

Para añadir un nuevo riesgo en el código, utiliza el siguiente formato TSDoc:

```ts
/** @conceptualRisk [CATEGORY][SEVERITY] Descripción detallada. */
```
