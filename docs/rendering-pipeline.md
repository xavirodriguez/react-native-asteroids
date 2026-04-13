# Rendering Pipeline

## Arquitectura de Renderizado
TinyAsterEngine utiliza un patrón **Decoupled Renderer**. El motor ECS simula el estado y los renderizadores lo consumen de forma pasiva.

## Backends Soportados

| Backend | Implementación | Plataforma | Uso Principal |
|---------|----------------|------------|---------------|
| **Canvas 2D** | `CanvasRenderer.ts` | Web / Expo Web | Desarrollo rápido y compatibilidad web nativa. |
| **Skia** | `SkiaRenderer.ts` | iOS / Android | Alto rendimiento nativo con aceleración por GPU. |
| **SVG** | `SvgRenderer.tsx` | Fallback / UI | Gráficos vectoriales escalables (usado en Pong). |

## Pipeline de Renderizado (Basado en Snapshots)

El motor utiliza una arquitectura de renderizado en dos pasos para maximizar el rendimiento y
garantizar la consistencia visual independientemente de la carga de simulación:

### 1. Generación de Snapshot (`createSnapshot`)
Se ejecuta en cada frame de renderizado (variable FPS).
- **Interpolación**: Calcula la posición visual exacta mezclando `Transform` y `PreviousTransform`
  usando el valor `alpha`.
- **Screen Shake**: Aplica desplazamientos globales basados en la semilla de renderizado.
- **Z-Sorting**: Ordena las entidades por `zIndex` utilizando un algoritmo de inserción in-place
  (O(N) en el mejor caso) para evitar asignaciones de memoria.

### 2. Dibujo Puro (`renderSnapshot`)
Toma el snapshot pre-calculado y lo vuelca al backend (Canvas/Skia).
- **Fase de Fondo**: `backgroundEffects` y `preRenderHooks`.
- **Fase de Entidades**: Itera el snapshot y despacha a los `ShapeDrawers`.
- **Fase de Primer Plano**: `foregroundEffects`, `postRenderHooks` y `renderUI`.

## Extensibilidad: Shape Drawers
Para añadir una nueva forma visual (e.g., un nuevo tipo de nave):
1. Crear una función `ShapeDrawer` que reciba el contexto de dibujo.
2. Registrarla en el renderer mediante `renderer.registerShape("mi_forma", miDrawer)`.
3. Asignar `shape: "mi_forma"` al `RenderComponent` de la entidad.

## Rendimiento y GC
- **Zero Allocation**: El `CanvasRenderer` utiliza un pool persistente de `RenderEntitySnapshot` (máximo 2000 por defecto). No se crean objetos nuevos durante el ciclo `createSnapshot` -> `renderSnapshot`.
- **[GC_PRESSURE][LOW]**: Aunque el hot loop es limpio, la inicialización del pool es costosa.
- **[CANVAS_CONTEXT_LOST][MEDIUM]**: En entornos móviles, el contexto puede perderse, invalidando los buffers de dibujo.
