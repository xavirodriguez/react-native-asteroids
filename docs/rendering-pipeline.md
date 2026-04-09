# Rendering Pipeline

## Arquitectura de Renderizado
TinyAsterEngine utiliza un patrón **Decoupled Renderer**. El motor ECS simula el estado y los renderizadores lo consumen de forma pasiva.

## Backends Soportados

| Backend | Implementación | Plataforma | Uso Principal |
|---------|----------------|------------|---------------|
| **Canvas 2D** | `CanvasRenderer.ts` | Web / Expo Web | Desarrollo rápido y compatibilidad web nativa. |
| **Skia** | `SkiaRenderer.ts` | iOS / Android | Alto rendimiento nativo con aceleración por GPU. |
| **SVG** | `SvgRenderer.tsx` | Fallback / UI | Gráficos vectoriales escalables (usado en Pong). |

## Pipeline de Renderizado (Canvas 2D)

El ciclo de un frame de renderizado sigue estos pasos:

1. **Clear**: Se limpia el buffer de dibujo (fondo negro sólido).
2. **Screen Shake**: Se consulta el singleton `GameState` o `ScreenShake`. Si hay un impacto activo, se aplica un `translate` aleatorio al contexto basado en la intensidad restante.
3. **Background Effects**: Se ejecutan los efectos registrados (e.g., Starfield).
4. **Query & Filter**: Se buscan todas las entidades con `Transform` + `Render`.
5. **Pre-Render Hooks**: Ganchos para que los juegos inyecten lógica visual previa (e.g., flashes de pantalla).
6. **Z-Indexing**: Las entidades se ordenan por su campo `zIndex` (0 por defecto).
7. **Draw Entity**:
   - Se guarda el estado del contexto (`ctx.save()`).
   - Se aplican transformaciones: `translate(x, y)` y `rotate(angle)`.
   - Se invoca al **Shape Drawer** correspondiente según `render.shape`.
   - Se restaura el contexto (`ctx.restore()`).
8. **Post-Entity Drawers**: Dibujo de efectos vinculados a la entidad pero fuera de su transformación (e.g., estelas de partículas/trails).
9. **Foreground Effects**: Efectos globales por encima de todo (e.g., filtro CRT).
10. **UI Rendering**: El sistema de UI de motor dibuja elementos de interfaz alineados a la pantalla.

## Extensibilidad: Shape Drawers
Para añadir una nueva forma visual (e.g., un nuevo tipo de nave):
1. Crear una función `ShapeDrawer` que reciba el contexto de dibujo.
2. Registrarla en el renderer mediante `renderer.registerShape("mi_forma", miDrawer)`.
3. Asignar `shape: "mi_forma"` al `RenderComponent` de la entidad.

## Rendimiento y GC
- **[GC_PRESSURE]**: En el `CanvasRenderer`, el array de comandos de renderizado se genera y ordena dinámicamente cada frame. Para escenas con miles de entidades, se recomienda migrar a un enfoque de buffer persistente o utilizar el backend de Skia con `SharedValues`.
