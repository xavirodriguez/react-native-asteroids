# Engine Evolution Ledger

Este documento registra de forma cronológica y estratégica la evolución del TinyAsterEngine, capturando decisiones de arquitectura, cambios en la API pública, deuda técnica eliminada y compromisos futuros.

---

## [2024-05-23] Consolidación de API y Saneamiento de Componentes Core

### Estado detectado
- **Fragmentación de Autoridad**: Coexistencia de `PositionComponent` (Legacy) y `TransformComponent` (Moderno).
- **Surface Pública Contaminada**: Componentes core (`InputStateComponent`, `TilemapComponent`) contenían métodos de lógica, violando el principio de "Componentes como datos puros".
- **Exports Rotos**: `CoreComponents.ts` intentaba exportar tipos inexistentes de `LegacyComponents.ts`.

### Decisiones tomadas
1. **Endurecimiento de Legacy**: Se definieron formalmente `PositionComponent` y `ColliderComponent` en el namespace `Legacy` para evitar errores de compilación y señalizar su obsolescencia.
2. **Pureza de Datos**: Eliminación de las propiedades `isPressed`, `getAxis` (Input) e `isSolid` (Tilemap) de los componentes. La lógica ahora reside exclusivamente en `InputUtils` y `TilemapUtils`.
3. **Contrato de Transform**: Se ratifica a `TransformComponent` como la única fuente de verdad para posición y jerarquía.

### Archivos afectados
- `src/engine/legacy/LegacyComponents.ts`
- `src/engine/core/CoreComponents.ts`

### Deuda abierta / Siguientes pasos
- Migrar cualquier uso residual de `PositionComponent` a `TransformComponent` (si se detectan en gameplay).
- Auditar `JuiceSystem` para asegurar que no dependa de interfaces legacy de `ScreenShake`.
- Implementar validaciones en `World.addComponent` para emitir advertencias al usar componentes del namespace `Legacy`.

---

## [2024-05-24] Saneamiento de Ciclo de Vida y Hardening de Tipos

### Estado detectado
- **Contratos de Reinicio Rotos**: El método `restart` no soportaba semillas, lo que impedía reinicios deterministas exigidos por la UI.
- **Riesgos de Plataforma**: `useKeepAwake` lanzaba errores en la web en contextos no seguros debido a la ausencia de `navigator.wakeLock`.
- **Proliferación de `any`**: Se detectaron más de 50 advertencias de lint por uso de `any` en archivos críticos del motor y de Asteroids, degradando la seguridad de tipos.

### Decisiones tomadas
1. **API de Reinicio Determinista**: Se actualizó `IGame` y `BaseGame` para aceptar una semilla opcional en `restart()`.
2. **Hardening de useKeepAwake**: Se añadieron verificaciones de entorno para silenciar errores de `wakeLock` en navegadores no compatibles.
3. **Erradicación Sistémica de `any`**: Se reemplazaron usos de `any` por `unknown`, `Record<string, unknown>` o tipos específicos en AssetLoader, Renderer, Physics, y EntityFactory. Se refinó el acceso a datos en `JuiceSystem` y `RenderUpdateSystem`.
4. **Sincronización de Hooks**: Se actualizaron los hooks de dominio (`useAsteroidsGame`, etc.) para alinearlos con la nueva firma de `restart`.

### Archivos afectados
- `src/engine/core/IGame.ts`
- `src/engine/core/BaseGame.ts`
- `src/hooks/useGame.ts`
- `src/hooks/useKeepAwake.ts`
- +30 archivos de motor y gameplay (ver commit).

### Impacto
- **Robustez**: Se eliminaron errores de runtime en el ciclo de vida y en la web.
- **Mantenibilidad**: El motor ahora es más estricto, facilitando refactors futuros sin romper contratos invisibles.
- **Determinismo**: Los reinicios ahora garantizan el mismo estado inicial si se provee una semilla.

### Deuda abierta / Siguientes pasos
- Implementar un sistema de telemetría básico para detectar fallos de determinismo en producción.

---

## [2024-05-24] Deprecación de InputManager y Consolidación de Boundary

### Estado detectado
- **Fragmentación de Input**: `AsteroidsGameScene` dependía de `InputManager` (Legacy) y configuraba controladores manualmente, duplicando la lógica de `BaseGame`.
- **Inconsistencia en Boundary**: Uso mixto de `mode` y `behavior` en `BoundaryComponent`.
- **Bug en PhysicsUtils**: Error de referencia `p` en `integrateMovement` impedía el correcto funcionamiento de la física.
- **Surface Pública**: `CoreComponents.ts` exponía componentes legacy directamente, oscureciendo la API canónica.

### Decisiones tomadas
1. **Unificación de Input**: Se eliminó `InputManager` de Asteroids. Ahora todas las escenas deben usar `UnifiedInputSystem` a través del singleton `InputStateComponent`.
2. **Estandarización de Propiedades**: Se migró el uso de `mode` a `behavior` en Pong para alinearse con el contrato moderno de `BoundaryComponent`.
3. **Saneamiento de API Core**: Se eliminaron los re-exports de `PositionComponent` y `ColliderComponent` en `CoreComponents.ts`. Estos componentes ahora solo son accesibles a través del namespace `Legacy`.
4. **Fix de Integración Física**: Se corrigieron las variables en `PhysicsUtils.integrateMovement` y `applyFriction` para asegurar compatibilidad con proxies de predicción.

### Archivos afectados
- `src/games/asteroids/scenes/AsteroidsGameScene.ts`
- `src/games/asteroids/systems/AsteroidInputSystem.ts`
- `src/games/pong/EntityFactory.ts`
- `src/engine/core/CoreComponents.ts`
- `src/engine/utils/PhysicsUtils.ts`

### Impacto
- **Claridad**: El flujo de entrada es ahora uniforme en todo el motor.
- **Robustez**: Se corrigió un bug crítico en el núcleo de física que afectaba a todos los sistemas.
- **Seguridad de API**: Se redujo la posibilidad de usar componentes obsoletos por accidente.

### Deuda abierta / Siguientes pasos
- Auditar `SpaceInvadersGame` para asegurar que no queden dependencias de `InputManager`.
- Migrar el ejemplo `PongGame` en `ExampleRegistration.ts` para usar `Collider2DComponent`.

---

## [2026-04-17] Mitigación de Riesgos Críticos de Identidad y Sincronización de Input

### Estado detectado
- **Riesgo de Corrupción de Identidad**: El `EntityPool` carecía de documentación que confirmara la protección contra "double-release", aunque la implementación ya era segura.
- **Drift de Input en Red**: `UnifiedInputSystem.getInputState()` ignoraba los `overrides` lógicos (táctiles/UI), lo que causaba desincronización en clientes móviles durante partidas multijugador.

### Decisiones tomadas
1. **Sincronización Total de Input**: Se modificó `getInputState()` para que incluya todos los `overrides` activos, igualando la lógica del método `update()`. Esto asegura que el estado enviado por red sea idéntico al estado simulado localmente.
2. **Cierre de Auditoría de Riesgos**: Se actualizaron los TSDocs y el catálogo de riesgos conceptuales para marcar formalmente como `FIXED` los riesgos de `ENTITY_REUSE` e `INPUT_DRIFT`.

### Archivos afectados
- `src/engine/input/UnifiedInputSystem.ts`
- `src/engine/core/EntityPool.ts`
- `docs/conceptual-risks.md`

### Impacto
- **Determinismo**: Se elimina una fuente crítica de desincronización en red para usuarios de dispositivos móviles.
- **Confianza Arquitectónica**: La documentación ahora refleja con precisión las garantías de seguridad del motor de identidades.

### Deuda abierta / Siguientes pasos
- Investigar el potencial desbordamiento de `currentTick` en sesiones de larga duración (Riesgo CRITICAL pendiente).

---

## [2024-05-25] Consolidación de Boundary y Aislamiento de Legacy Physics

### Estado detectado
- **Redundancia de Sistemas**: `SpaceInvaders` implementaba su propio `BoundarySystem` en lugar de usar el del motor.
- **Superficie Pública Contaminada**: Presencia de componentes de Matter.js en el core y propiedades deprecadas en componentes base.
- **Drift de Lógica**: Lógica de rebote duplicada y no estandarizada en utilidades físicas.

### Decisiones tomadas
1. **Unificación de Límites**: Se eliminó el `BoundarySystem` de `SpaceInvaders` y se configuró `BoundaryComponent` en sus entidades para usar el sistema del motor.
2. **Hardening de Contratos**: Eliminación física de las propiedades `@deprecated mode` y `@deprecated tag`.
3. **Namespace Legacy**: Se movieron `PhysicsSystem` (Matter) y `RigidBodyComponent` a `src/engine/legacy/` para proteger la API moderna.
4. **Utilidades Canónicas**: Se centralizó `bounceBoundary` y `wrapBoundary` en `PhysicsUtils.ts`.

### Archivos afectados
- `src/engine/core/CoreComponents.ts`
- `src/engine/systems/BoundarySystem.ts`
- `src/engine/utils/PhysicsUtils.ts`
- `src/engine/legacy/` (Nuevos archivos movidos)
- `src/games/space-invaders/` (Migración completa)

### Impacto
- **Coherencia**: Un solo camino para gestionar límites de pantalla.
- **Seguridad**: API más difícil de usar mal al eliminar campos duplicados.
- **Modularidad**: El motor de física moderno está claramente separado del legacy.

### Deuda abierta / Siguientes pasos
- Implementar comportamiento de "clamping" (estático) en `BoundarySystem` para mayor flexibilidad.
- Documentar el sistema de capas de colisión en una guía dedicada.

---

## [2024-05-26] Seguridad de Mutación y Protección de Bucle

### Estado detectado
- **Riesgo de Inconsistencia**: Las mutaciones estructurales inmediatas durante la actualización de sistemas podían invalidar iteradores de queries.
- **Spiral of Death**: El motor carecía de un límite de ticks por frame, lo que permitía bloqueos en caso de degradación de performance.

### Decisiones tomadas
1. **Diferimiento de Mutaciones**: Implementación de `WorldCommandBuffer` para registrar cambios estructurales.
2. **Sincronización Atómica**: Integración de `world.flush()` al final de la fase de simulación en `BaseGame`.
3. **Cap de Simulación**: Implementación de `maxUpdatesPerFrame` en `GameLoop` para estabilizar el acumulador ante lag masivo.
4. **ADR 005**: Documentación formal del nuevo contrato de mutación.

### Archivos afectados
- `src/engine/core/WorldCommandBuffer.ts`
- `src/engine/core/World.ts`
- `src/engine/core/BaseGame.ts`
- `src/engine/core/GameLoop.ts`
- `docs/adr/005-world-mutation-safety.md`

### Impacto
- **Seguridad**: Se eliminan fallos sutiles por mutación durante la iteración.
- **Robustez**: El motor es ahora "crash-proof" ante picos de carga de CPU.

### Deuda abierta / Siguientes pasos
- Migrar sistemas existentes que realizan eliminaciones masivas para usar el buffer de forma explícita (aunque `flush` al final del tick ya proporciona seguridad básica).

---

## [2024-05-25] Saneamiento de API Pública y Renombrado de Tipos Legacy

### Estado detectado
- **Ambigüedad de Nombres**: Coexistencia de `Transform` (Legacy) y `TransformComponent` (Moderno).
- **Redundancia de Tipos**: Definiciones duplicadas de `PositionComponent` y `ColliderComponent` en `LegacyComponents.ts`.
- **Surface Pública Contaminada**: Re-exportación de tipos legacy en `EngineTypes.ts`, permitiendo su uso accidental fuera del namespace `Legacy`.

### Decisiones tomadas
1. **Renombrado de Claridad**: Se renombró `Transform` (Legacy) a `LegacyTransform` y `ScreenShake` (Legacy) a `LegacyScreenShake`.
2. **Saneamiento de Legacy**: Se eliminaron las definiciones duplicadas de componentes en `LegacyComponents.ts`.
3. **Encapsulación de API**: Se eliminaron los re-exports de tipos legacy en `EngineTypes.ts`. Ahora solo son accesibles a través del namespace `Legacy`.

### Archivos afectados
- `src/engine/legacy/LegacyComponents.ts`
- `src/engine/types/EngineTypes.ts`
- `docs/MIGRATION_GUIDE.md`

### Impacto
- **Seguridad**: Se elimina la posibilidad de colisiones de nombres y el uso accidental de tipos obsoletos.
- **Claridad**: El camino canónico (`TransformComponent`, `ScreenShakeComponent`) es ahora el único visible en el top-level.

### Deuda abierta / Siguientes pasos
- Auditar cualquier dependencia externa que pueda haberse roto por la eliminación de exports en `EngineTypes.ts`.

## [2024-05-25] Aislamiento de Sistemas Legacy y Unificación de Colisiones

### Estado detectado
- **Contaminación de API**: Sistemas obsoletos (`CameraSystem`, `InputManager`) y controladores dependientes de plataforma coexistían con las APIs modernas en los directorios core.
- **Desorden en Colisiones**: `SpatialHash` residía en un directorio separado de los sistemas de colisión modernos.

### Decisiones tomadas
1. **Encapsulación Legacy**: Se movieron `CameraSystem`, `InputManager`, `InputController`, `KeyboardController`, `TouchController` y `CollisionRouter` a `src/engine/legacy/`.
2. **Namespace Legacy**: Se actualizaron los exports para que estos símbolos solo sean accesibles a través del objeto `Legacy` en el entrypoint principal.
3. **Consolidación de Física**: Se reubicó `SpatialHash` en `src/engine/physics/collision/` para agruparlo con la lógica de fase ancha (BroadPhase).

### Archivos afectados
- `src/engine/legacy/` (Nuevos archivos movidos)
- `src/engine/index.ts`
- `src/engine/physics/collision/SpatialHash.ts`
- `src/engine/physics/collision/CollisionSystem2D.ts`
- `docs/MIGRATION_GUIDE.md`

### Impacto
- **Claridad de API**: La superficie pública del motor ahora es más limpia y se centra en las APIs canónicas.
- **Modularidad**: Mejor organización del dominio de física y colisiones.
- **Seguridad**: Reduce la probabilidad de que nuevos desarrolladores usen sistemas obsoletos o dependientes de plataforma por error.

### Deuda abierta / Siguientes pasos
- Migrar cualquier uso residual de `CameraSystem` en la UI a `Camera2D`.
- Eliminar físicamente los archivos de `legacy/` en la próxima versión mayor.

## [2024-05-26] Hardening de Input Snapshots y Contratos de Query

### Estado detectado
- **Input Drift**: `UnifiedInputSystem.getInputState()` ignoraba los `overrides` lógicos (UI/Red), lo que rompía el determinismo en snapshots y multijugador para usuarios móviles.
- **Riesgo de Mutación**: `Query.getEntities()` devolvía una referencia al array interno. Aunque tipado como `ReadonlyArray`, carecía de advertencias explícitas sobre el riesgo de corrupción de estado mediante casting.

### Decisiones tomadas
1. **Snapshots de Input Completos**: Se actualizó `getInputState()` para combinar determinísticamente las entradas de hardware con los `overrides`. Los resultados se devuelven ordenados alfabéticamente para garantizar consistencia.
2. **Hardening de Query**: Se reforzó el TSDoc de `Query.getEntities()` definiendo formalmente el contrato de inmutabilidad y las consecuencias de su violación (corrupción de caché interna).
3. **Cierre de Riesgos**: Se marcaron como `FIXED` los riesgos asociados en `conceptual-risks.md`.

### Archivos afectados
- `src/engine/input/UnifiedInputSystem.ts`
- `src/engine/core/Query.ts`
- `docs/conceptual-risks.md`
- `src/engine/input/__tests__/UnifiedInputSystem.overrides.test.ts` (Nuevo test)

### Impacto
- **Determinismo**: Snapshots de entrada ahora reflejan la realidad lógica del jugador (incluyendo UI táctil), permitiendo predicción de red precisa.
- **Seguridad**: Contratos de API más claros para evitar errores de mutación accidental en sistemas complejos.

## [2024-05-26] Unificación de Identidad de Pool y Hardening de Determinismo

### Estado detectado
- **Ambigüedad de Naming**: Existencia de dos clases `EntityPool`, una en el core (manejo de IDs) y otra en utils (manejo de conjuntos de componentes).
- **Riesgo de Corrupción**: El sistema de pooling de utilidades (`ObjectPool`) carecía de protección contra el "double-release", lo que podía causar inconsistencias graves si se liberaba el mismo objeto dos veces.
- **Brecha de Determinismo**: `KamikazeSystem.ts` en Space Invaders utilizaba `Math.random()`, lo que impedía que las partidas fueran reproducibles.

### Decisiones tomadas
1. **Unificación Semántica**: Se renombró `EntityPool` (utils) a `ComponentSetPool`. Ahora `EntityPool` es un nombre reservado exclusivamente para el generador de IDs en `core`.
2. **Hardening de ObjectPool**: Se implementó una protección basada en `Set` dentro de `ObjectPool` para detectar e ignorar intentos de liberación duplicada de objetos.
3. **Determinismo en IA**: Se migró `KamikazeSystem` para usar `RandomService.getInstance("gameplay")`, garantizando que la selección de pilotos sea determinista.

### Archivos afectados
- `src/engine/utils/ComponentSetPool.ts` (Renombrado de `EntityPool.ts`)
- `src/engine/utils/ObjectPool.ts`
- `src/engine/utils/PrefabPool.ts`
- `src/games/space-invaders/systems/KamikazeSystem.ts`
- `src/games/space-invaders/EntityPool.ts`
- `src/games/asteroids/EntityPool.ts` (No requirió cambios de importación al depender solo de PrefabPool)

### Impacto
- **Claridad**: Se elimina la confusión entre pooling de identidades y pooling de datos.
- **Robustez**: Mayor seguridad ante errores de gestión de memoria en el código de gameplay.
- **Determinismo**: Se cierra un riesgo crítico detectado en el catálogo de riesgos conceptuales.

---

## [2024-05-26] Consolidación de Orquestación e Interpolación Jerárquica

### Estado detectado
- **Fragmentación de Lógica**: `BaseGame.ts` gestionaba manualmente el snapshot de transformaciones previas, duplicando la intención de `InterpolationPrepSystem.ts` pero ignorado en la práctica.
- **Bug de Jerarquías**: La interpolación visual fallaba para entidades hijas (children) al no capturar ni utilizar las coordenadas de mundo (`worldX/Y`) del frame anterior, causando jitter visual.
- **Acoplamiento**: El bucle de simulación en `BaseGame` contenía lógica procedimental de bajo nivel en lugar de delegar en sistemas ECS estándar.

### Decisiones tomadas
1. **Consolidación en Sistemas**: Se eliminó el bucle manual de snapshot en `BaseGame` y se registró formalmente `InterpolationPrepSystem` en la fase de `Input` con máxima prioridad.
2. **Interpolación Aware de Jerarquías**: Se expandió `PreviousTransformComponent` para incluir `worldX`, `worldY` y `worldRotation`.
3. **Hardening de Renderers**: `CanvasRenderer` y `SkiaRenderer` se actualizaron para priorizar las coordenadas de mundo del snapshot previo, garantizando una interpolación suave incluso en estructuras complejas.
4. **Validación**: Creación de tests unitarios específicos para asegurar que el sistema captura correctamente el estado antes de la simulación.

### Archivos afectados
- `src/engine/core/BaseGame.ts`
- `src/engine/core/CoreComponents.ts`
- `src/engine/systems/InterpolationPrepSystem.ts`
- `src/engine/rendering/CanvasRenderer.ts`
- `src/engine/rendering/SkiaRenderer.ts`
- `src/engine/systems/__tests__/InterpolationPrepSystem.test.ts`

### Impacto
- **Coherencia**: El pipeline de simulación es ahora 100% basado en sistemas ECS.
- **Calidad Visual**: Se elimina el jitter en entidades con padres (e.g., torretas sobre naves, satélites).
- **Mantenibilidad**: La lógica de preparación para renderizado está centralizada y testeada.

### Deuda abierta / Siguientes pasos
- Investigar la interpolación de escala (`scaleX/Y`) para completar el soporte total de transformaciones.

---

## [2024-05-26] Saneamiento de Core y Abstracción de Autoridad Física

### Estado detectado
- **Acoplamiento de Gameplay**: Sistemas core (`MovementSystem`, `FrictionSystem`, `BoundarySystem`) dependían de un check hardcoded por el componente `"Ship"`.
- **Fragilidad de Integración**: `PhysicsUtils.integrateMovement` empleaba lógica de detección de propiedades por string propensa a colisiones y errores de tipado.

### Decisiones tomadas
1. **ManualMovementComponent**: Se introdujo un componente de señalización genérico en el core para permitir que las entidades opten por no participar en la integración automática del motor.
2. **Desacoplamiento Total**: Eliminación de toda referencia a `"Ship"` dentro de los directorios de `src/engine/`.
3. **Hardening de PhysicsUtils**: Refactor de `integrateMovement` para asegurar consistencia en el uso de coordenadas locales vs mundo y claves de velocidad.
4. **Alineación de Simulación**: Actualización de `DeterministicSimulation.ts` y factorías de Asteroids para adoptar el nuevo estándar.

### Archivos afectados
- `src/engine/core/CoreComponents.ts`
- `src/engine/systems/MovementSystem.ts`
- `src/engine/systems/FrictionSystem.ts`
- `src/engine/systems/BoundarySystem.ts`
- `src/engine/utils/PhysicsUtils.ts`
- `src/games/asteroids/EntityFactory.ts`
- `src/simulation/DeterministicSimulation.ts`
- `docs/adr/004-manual-movement-abstraction.md` (Nuevo ADR)

### Impacto
- **Modularidad**: El motor ahora es independiente de cualquier juego específico.
- **Claridad de API**: Se establece un camino canónico para gestionar la autoridad de movimiento.
- **Robustez**: Integración física más predecible y segura ante cambios en componentes.

### Deuda abierta / Siguientes pasos
- Auditar `CollisionSystem2D` para asegurar que el filtrado de colisiones no dependa de tags de juego para lógica interna (ej. ignore-self).

---

## [2024-05-26] Estandarización de Estelas y Disciplina de Bucles

### Estado detectado
- **Presión de GC**: `RenderUpdateSystem` y Asteroids empleaban arrays dinámicos para estelas, generando re-asignaciones constantes de objetos `{x, y}`.
- **Incumplimiento de Estándar**: Sistemas críticos como `CollisionSystem2D` y `PhysicsSystem2D` utilizaban `.forEach()`, violando la disciplina de rendimiento y seguridad de scope del motor.
- **Fragmentación**: La lógica de estelas estaba dispersa entre componentes core y de gameplay.

### Decisiones tomadas
1. **TrailComponent Canónico**: Se introdujo un componente especializado que emplea un buffer circular con un array de tamaño fijo, eliminando la presión sobre el GC.
2. **Refactor de Sistemas**: Migración masiva de sistemas de simulación y presentación a bucles `for` nativos para garantizar máximo rendimiento y evitar errores de captura de variables.
3. **Migración de Asteroids**: Se actualizó el juego Asteroids para adoptar el nuevo estándar, eliminando la gestión manual de estelas en `ShipComponent`.

### Archivos afectados
- `src/engine/core/CoreComponents.ts`
- `src/engine/systems/RenderUpdateSystem.ts`
- `src/engine/physics/collision/CollisionSystem2D.ts`
- `src/engine/physics/dynamics/PhysicsSystem2D.ts`
- `src/games/asteroids/EntityFactory.ts`
- `src/games/asteroids/rendering/` (Canvas, Skia, ShapeDrawers)
- +6 sistemas adicionales del motor.

### Impacto
- **Rendimiento**: Estabilidad del frame-rate mejorada al reducir las pausas de GC.
- **Coherencia**: Alineación total con los estándares de codificación documentados para sistemas ECS.
- **Seguridad**: Mejora en la robustez de los sistemas ante posibles cambios en el ciclo de vida del motor.

### Deuda abierta / Siguientes pasos
- Implementar un `CommandBuffer` para el `World` que permita diferir cambios estructurales (add/remove) durante la iteración de sistemas, reforzando la seguridad de mutación.

---

## [Plantilla para Futuras Entradas]

### [FECHA] Título de la Evolución

#### Estado detectado
- Resumen del problema identificado.

#### Decisiones tomadas
- Qué se cambió y por qué.

#### Archivos afectados
- Lista de archivos modificados.

#### Impacto
- Cómo mejora la reusabilidad, coherencia o seguridad.

#### Deuda abierta / Siguientes pasos
- Qué quedó pendiente.
