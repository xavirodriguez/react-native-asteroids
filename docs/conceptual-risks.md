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
