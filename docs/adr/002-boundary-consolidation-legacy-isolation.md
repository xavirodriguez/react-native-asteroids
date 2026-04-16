# ADR 002: Consolidación de Boundary y Aislamiento de Legacy Physics

## Contexto
El motor presentaba redundancia en la gestión de límites (Boundary) entre el núcleo y los juegos (ej. Space Invaders). Además, la superficie pública del motor estaba contaminada con componentes y sistemas basados en Matter.js (Legacy) mezclados con el nuevo motor de física 2D (`PhysicsSystem2D`).

## Decisión
1.  **Centralización de Boundary**: Se migró la lógica de `bounce` y `wrap` a `PhysicsUtils` y se actualizó `BoundarySystem` (Core) para ser el único sistema oficial.
2.  **Saneamiento de Componentes**: Se eliminaron las propiedades obsoletas `mode` (en `BoundaryComponent`) y `tag` (en `TagComponent`) para forzar el uso de `behavior` y `tags`.
3.  **Aislamiento de Legacy Physics**: Se movió `PhysicsSystem` (Matter adapter) y `RigidBodyComponent` al namespace `Legacy` (`src/engine/legacy`).

## Consecuencias
- **Positivas**: API más limpia, eliminación de código duplicado en juegos, única fuente de verdad para el comportamiento de límites.
- **Negativas**: Cambio disruptivo (Breaking Change) para cualquier código que dependiera de las propiedades `mode` o `tag`.

## Plan de Migración
- Reemplazar `component.mode` por `component.behavior`.
- Reemplazar `component.tag` por `component.tags` (que ahora es un array).
- Importar `PhysicsSystem` o `RigidBodyComponent` desde el namespace `Legacy` si aún son necesarios.
