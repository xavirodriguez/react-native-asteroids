# Guía de Migración - TinyAsterEngine

Esta guía detalla los cambios necesarios para actualizar proyectos existentes a las versiones más recientes del motor. El objetivo de estos cambios es endurecer los contratos, mejorar la claridad de la API y asegurar el determinismo en la simulación.

## 1. World ECS

### Versionado del Mundo
El motor ahora separa los cambios estructurales de los cambios en los datos de los componentes para optimizar sistemas reactivos y renderizado.

- **DEPRECATED**: `world.version`
- **NUEVO**: Use `world.structureVersion` para cambios topológicos (crear/borrar entidades o añadir/quitar componentes) o `world.stateVersion` para cambios en los datos.

### Consultas (Queries)
- **DEPRECATED**: `world.getEntitiesWith(...types)`
- **NUEVO**: Use `world.query(...types)` directamente.
- **DEPRECATED**: `world.getAllEntities()`
- **NUEVO**: Use el getter `world.entities` (que devuelve un array de solo lectura cacheado).

### Mutaciones
- **RECOMENDADO**: Evite modificar componentes recuperados vía `getComponent` directamente si necesita que los sistemas de renderizado reaccionen al cambio.
- **NUEVO**: Use `world.mutateComponent(entity, type, (comp) => { ... })` para asegurar que `stateVersion` se incremente y el mundo se marque como sucio para renderizado.

## 2. Queries y Seguridad de Runtime

Las consultas ahora son más seguras frente a mutaciones accidentales.

- **CAMBIO**: `query.getEntities()` ahora devuelve una **copia defensiva real** (`[...]`).
- **IMPACTO**: Los consumidores ya no pueden modificar el caché interno de la query mediante casting a `Entity[]`. Tenga en cuenta que cada llamada genera una nueva asignación de array.

## 3. Escenas y Ciclo de Vida

Se ha clarificado la orquestación de escenas para desacoplarlas del `GameLoop` directo.

- **DEPRECATED**: `Scene.update(dt)`
- **NUEVO**: Sobrescriba `Scene.onUpdate(dt, world)`.
- **DEPRECATED**: `Scene.render(alpha)`
- **NUEVO**: Use `Scene.onRender(alpha)` o delegue el renderizado a través del `SceneManager`.

## 4. RandomService

Los métodos estáticos globales han sido depreciados en favor de streams independientes para gameplay y renderizado.

- **DEPRECATED**: `RandomService.next()`, `RandomService.setSeed()`, etc.
- **NUEVO**:
  - Para lógica de juego (determinista): `RandomService.getGameplayRandom().next()`
  - Para efectos visuales (no determinista): `RandomService.getRenderRandom().next()`

## 5. Rendering y Naming

- **RENOMBRADO**: `CommandBuffer` ahora es `RenderCommandBuffer` para evitar confusión con `WorldCommandBuffer`.
- **API**: `Renderer.renderEntity` está depreciado. El pipeline moderno se basa en snapshots generados por el `RenderUpdateSystem`.

## 6. Aislamiento de Implementación (Barrels)

Para endurecer la API pública, las implementaciones específicas de plataforma y utilidades internas han sido movidas a barrels de dominio.

- **CAMBIO**: Los siguientes símbolos ya no se exportan desde el root (`src/engine/index.ts`):
  - `NarrowPhase`, `BroadPhase`, `ContinuousCollision`, `SpatialHash` -> Disponibles en `src/engine/physics`.
  - `CanvasRenderer`, `SkiaRenderer` -> Disponibles en `src/engine/rendering`.

## 7. Espacio de Nombres Legacy

Para facilitar la transición y mantener el root barrel limpio, los shims de compatibilidad se han movido a un espacio de nombres explícito.

- **NUEVO**: Use `import { Legacy } from 'tiny-aster-engine'` para acceder a:
  - `Legacy.CommandBuffer` (ahora alias de `RenderCommandBuffer`).
  - `Legacy.LegacyRandom` (para métodos estáticos de RandomService).

---
*Nota: Los símbolos marcados como @deprecated se mantendrán por compatibilidad transitoria pero serán eliminados en futuras versiones mayores.*
