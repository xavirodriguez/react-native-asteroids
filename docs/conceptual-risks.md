# Catálogo de Riesgos Conceptuales

Esta sección documenta las fragilidades arquitectónicas y de diseño detectadas durante la auditoría del código.

## [DETERMINISM] - Riesgos de Sincronización

| Severidad | Descripción | Ubicación Detectada |
|-----------|-------------|---------------------|
| **CRITICAL** | Lógica de física duplicada entre sistemas ECS y funciones de predicción de red. Riesgo de desincronización por "drift" de implementación. | `AsteroidsGame.ts` vs `MovementSystem.ts` |
| **HIGH** | Uso de `Math.random()` dentro del pipeline de renderizado para efectos de Screen Shake. Puede causar desvíos en el estado visual entre clientes. | `CanvasRenderer.ts`, `SkiaRenderer.ts` |
| **HIGH** | Uso de `Date.now()` para lógica de parpadeo (blink) visual. No es determinista y depende del reloj local del sistema. | `AsteroidsSkiaVisuals.ts` |

## [MEMORY] - Riesgos de Fugas y Presión de GC

| Severidad | Descripción | Ubicación Detectada |
|-----------|-------------|---------------------|
| **MEDIUM** | Fuga de caché mutable en Queries. Los sistemas reciben una referencia al array interno de la query y pueden corromperlo. | `Query.ts` |
| **MEDIUM** | Creación masiva de objetos efímeros en el pipeline de renderizado (`renderCommands.map(...)`). | `CanvasRenderer.ts` |
| **LOW** | El versionado del World (`world.version`) es un entero simple. Potencial overflow en sesiones de juego extremadamente largas. | `World.ts` |

## [LIFECYCLE] - Riesgos de Recursos

| Severidad | Descripción | Ubicación Detectada |
|-----------|-------------|---------------------|
| **MEDIUM** | Uso de `setTimeout` en controladores de entrada sin garantía de cancelación en el `destroy()`. | `TouchController.ts` |
| **LOW** | Registro de listeners globales en `window` durante la construcción del sistema, dificultando el testeo unitario y SSR. | `UnifiedInputSystem.ts` |

## [COUPLING] - Riesgos de Acoplamiento

| Severidad | Descripción | Ubicación Detectada |
|-----------|-------------|---------------------|
| **MEDIUM** | El hook `useGame` utiliza `@ts-ignore` para instanciar juegos con configuraciones específicas, rompiendo la seguridad de tipos. | `useGame.ts` |
| **LOW** | Componentes de renderizado específicos de Asteroids inyectados directamente en el gestor de renderizado core. | `AsteroidsRendererManager.ts` |

## [AUDIT_BATCH_2] - Nuevos Riesgos Identificados

| Categoría | Severidad | Descripción | Ubicación |
|-----------|-----------|-------------|-----------|
| **DETERMINISM** | **CRITICAL** | `currentTick` (number) puede desbordarse tras ~285,000 años, pero los límites de lockstep/buffer podrían verse afectados por la precisión mucho antes. | `BaseGame.ts` |
| **DETERMINISM** | **HIGH** | `getInputState()` ignora los `overrides`. Esto significa que el input enviado por red no incluirá acciones de la UI táctil. | `UnifiedInputSystem.ts` |
| **MEMORY** | **CRITICAL** | `EntityPool.release()` no previene el "double-release", lo que puede corromper la identidad de entidades en el `World`. | `EntityPool.ts` |
| **PERFORMANCE**| **MEDIUM** | El loop de `GameLoop` puede disparar el "Spiral of Death" si la simulación es más lenta que el tiempo real, a pesar del límite `maxDeltaMs`. | `GameLoop.ts` |
| **LIFECYCLE**   | **HIGH** | `runLifecycle` siempre introduce un microtask delay (async), lo que puede causar desincronización en métodos que esperan ejecución inmediata. | `LifecycleUtils.ts` |
| **DETERMINISM** | **MEDIUM** | `RandomService.getInstance("render")` puede ser usado erróneamente en lógica de gameplay, rompiendo el determinismo silenciosamente. | `RandomService.ts` |
| **HIERARCHY**   | **MEDIUM** | `HierarchySystem` utiliza recursión para resolver transformaciones, riesgo de Stack Overflow en jerarquías profundas. | `HierarchySystem.ts` |
| **DETERMINISM** | **MEDIUM** | `JuiceSystem` muta componentes `Transform` core. Si se usa para lógica de colisiones, causará desincronización en red. | `JuiceSystem.ts` |
