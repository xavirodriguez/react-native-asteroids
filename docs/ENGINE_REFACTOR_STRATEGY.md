# Estrategia de Saneamiento Arquitectónico: Engine 2D Retro

## Bloque 1: Resumen ejecutivo

El motor actual presenta una **fragmentación de autoridad** y una **superficie pública contaminada** que compromete su estabilidad y facilidad de uso. El problema estructural dominante es la coexistencia de modelos redundantes para tareas críticas (Física, Transformaciones e Input), lo que genera confusión en el desarrollador de gameplay y dificulta el mantenimiento del núcleo.

La deuda técnica actual (duplicidad de sistemas y componentes `@deprecated` en el entrypoint) frena la evolución al aumentar la carga cognitiva y el riesgo de bugs por estados inconsistentes entre sistemas paralelos. La estrategia global recomendada consiste en una **consolidación canónica incremental**: elegir un solo estándar oficial para cada dominio, aislar lo obsoleto en un módulo `legacy` y modularizar la API pública para exponer solo contratos estables.

---

## Bloque 2: Decisiones arquitectónicas canónicas

Se establecen los siguientes estándares oficiales y obligatorios para el motor:

1.  **Modelo de Física**: El estándar oficial es el motor interno basado en `PhysicsSystem2D`, `PhysicsBody2DComponent` y `Collider2DComponent`. El soporte para Matter.js (`RigidBodyComponent`) y el `CollisionSystem` original se consideran legacy/específicos.
2.  **Autoridad de Transform**: La jerarquía se gestiona exclusivamente mediante `TransformComponent` y `HierarchySystem`. Se descarta `SceneGraph` como autoridad para evitar la duplicidad de fuentes de verdad.
3.  **Ruta de Input**: El único punto de entrada oficial para la lógica de juego es `UnifiedInputSystem` mediante el `InputStateComponent`.
4.  **Componente de Render**: Se mantiene `RenderComponent` como eje central, pero se purga de propiedades redundantes (unificación en `zIndex`) y se tipa estrictamente el campo `data`.
5.  **Política de API**: El entrypoint principal (`src/engine/index.ts`) solo exportará símbolos `@public`. Todo lo marcado como `@deprecated` o interno se moverá a `@engine/legacy` o se ocultará.

---

## Bloque 3: Matriz exhaustiva de problemas

| Área | Problema | Evidencia | Impacto | Severidad | Facilidad | Solución Concreta |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Transform | Dualidad de autoridad | `SceneGraph` vs `HierarchySystem` | Desincronización de matrices | Alta | Media | Eliminar `SceneGraph` en favor de `HierarchySystem` |
| Física | Duplicidad de Colliders | `ColliderComponent` vs `Collider2DComponent` | API confusa, fallos de colisión | Alta | Alta | Estandarizar `Collider2DComponent` |
| Render | Nomenclatura mixta | `zIndex` vs `zOrder` | Errores de profundidad visual | Media | Alta | Unificar en `zIndex` |
| Input | Sistemas paralelos | `InputSystem` vs `UnifiedInputSystem` | Input perdido o doble | Alta | Media | Forzar `UnifiedInputSystem` |
| Tooling | Tipado débil | `any` en `RenderComponent.data` | Errores en runtime (null pointers) | Media | Alta | Tipar como `Record<string, unknown>` |

---

## Bloque 4: Plan de refactor por fases

### Fase 0: Fixes inmediatos (Quick Wins)
*   **Objetivos**: Limpiar superficie pública y eliminar `any` críticos.
*   **Cambios**: Crear `src/engine/legacy/index.ts`, mover exports obsoletos, corregir tipos en `CoreComponents.ts`.
*   **Criterio de finalización**: Cero `any` públicos en componentes core.

### Fase 1: Consolidación de API
*   **Objetivos**: Unificar autoridad de transformación y física.
*   **Cambios**: Deprecar `SceneGraph`, unificar `zIndex`, marcar `CollisionSystem` como legacy.
*   **Criterio de finalización**: Un solo componente de cuerpo y un solo sistema de jerarquía activos.

### Fase 2: Reorganización modular
*   **Objetivos**: Separar el motor en paquetes lógicos.
*   **Cambios**: Dividir exports en `@engine/core`, `@engine/physics`, `@engine/render`, etc.
*   **Criterio de finalización**: Entrypoint principal limpio y modularizado.

---

## Bloque 5: Rediseño de API pública

### Estructura de Exports Sugerida

*   **`@engine/core`**: `World`, `Entity`, `Component`, `System`, `GameLoop`.
*   **`@engine/physics`**: `PhysicsSystem2D`, `Collider2DComponent`, `PhysicsBody2DComponent`, `CollisionLayers`.
*   **`@engine/render`**: `RenderSystem`, `RenderComponent`, `Camera2D`.
*   **`@engine/input`**: `UnifiedInputSystem`, `InputStateComponent`.
*   **`@engine/legacy`**: Todo lo marcado como `@deprecated` (ej. `SceneGraph`, `PositionComponent`).

### Cambios de Naming
*   `zOrder` -> `zIndex` (Eliminado en `RenderComponent`).
*   `mode` -> `behavior` (En `BoundaryComponent`).
*   `ColliderComponent` -> `LegacyCollider` (En `legacy`).

---

## Bloque 6: Estrategia de migración

1.  **Compatibilidad Temporal**: Mantener alias en el namespace `legacy` que apunten a los nuevos componentes.
2.  **Wrappers**: Crear un adaptador para `SceneGraph` que mapee internamente a `TransformComponent` durante la transición.
3.  **Warnings**: Introducir `console.warn` en los constructores de componentes legacy.
4.  **Orden**:
    1.  Migrar primero el sistema de Transform (bajo riesgo visual).
    2.  Migrar Input (alto impacto, fácil testeo).
    3.  Migrar Física (alto riesgo, requiere validación de colisiones).

---

## Bloque 7: Recomendaciones de implementación

*   **Tipado estricto**:
    ```typescript
    export interface RenderComponent extends Component {
      // ...
      data: Record<string, unknown>; // Sustituye a any
    }
    ```
*   **Helpers de Factory**:
    ```typescript
    export const createStaticCollider = (world: World, entity: Entity, shape: Shape) => {
      world.addComponent(entity, { type: 'Collider2D', shape, isTrigger: false, ... });
    };
    ```

---

## Bloque 8: Documentación crítica a escribir

1.  **Guía de Arquitectura ECS**: Explicar el flujo `Input -> Simulation -> Presentation`.
2.  **Contrato de Snapshot**: Definir qué campos son seguros para serializar (no funciones, no refs circulares).
3.  **Manual de Colisiones**: Tabla de `Layer/Mask` y ciclo de vida de `CollisionEventsComponent`.

---

## Bloque 9: Riesgos y anti-patrones

*   **Riesgo**: Intentar mantener `SceneGraph` y `HierarchySystem` sincronizados bidireccionalmente. **Decisión**: Solo `HierarchySystem` escribe en los transforms de mundo.
*   **Anti-patrón**: Usar `Math.random()` en sistemas. **Corrección**: Forzar uso de `RandomService` con semilla del `World`.

---

## Bloque 10: Entregables finales

*   [ ] `src/engine/legacy/index.ts` con componentes obsoletos.
*   [ ] `CoreComponents.ts` sin tipos `any`.
*   [ ] Documentación de contratos en `docs/contracts/`.
*   [ ] Entrypoint `src/engine/index.ts` saneado.
