# TSDoc Nightly Changelog

## [1.0.0] - 2025-05-22
### Added
- Initial TSDoc audit state file.
- Initial TSDoc nightly changelog.
- Full Level 5 TSDoc audit for core ECS files:
  - `src/engine/core/World.ts`
  - `src/engine/core/System.ts`
  - `src/engine/core/Component.ts`
  - `src/engine/core/Query.ts`
  - `src/engine/core/Entity.ts`

### Detected Conceptual Risks
- `World.ts`: `version` overflow risk on long-running sessions.
- `World.ts`: Hierarchy normalization silently resetting parent (potential masked errors).
- `System.ts`: `deltaTime` unit consistency (ms vs seconds).
- `Query.ts`: Mutable cache leak in `getEntities()`.
- `Entity.ts`: Stale reference risk due to ID reuse.

## [1.1.0] - 2025-05-23
### Added
- Level 5 TSDoc audit for lifecycle and input files:
  - `src/engine/core/BaseGame.ts`
  - `src/engine/core/GameLoop.ts`
  - `src/engine/input/UnifiedInputSystem.ts`
  - `src/engine/core/CoreComponents.ts`
  - `src/engine/core/EntityPool.ts`

### Detected Conceptual Risks
- `BaseGame.ts`: Tick counter `currentTick` safety on long sessions (MAX_SAFE_INTEGER).
- `BaseGame.ts`: Multi-player input merging in a single singleton prevents per-player action tracking.
- `GameLoop.ts`: Potential "Spiral of Death" if tick processing exceeds `fixedDeltaTime`.
- `UnifiedInputSystem.ts`: `getInputState()` ignores semantic `overrides`, causing potential drift between UI/Net and simulation.
- `CoreComponents.ts`: `TransformComponent` data redundancy (local vs world) leads to stale read risks.
- `EntityPool.ts`: Missing "double-release" protection leads to ID collision and world corruption.

## [1.2.0] - 2025-05-24
### Added
- Level 5 TSDoc audit for core simulation systems:
  - `src/engine/systems/MovementSystem.ts`
  - `src/engine/systems/CollisionSystem.ts`
  - `src/engine/systems/FrictionSystem.ts`
  - `src/engine/systems/BoundarySystem.ts`
  - `src/engine/systems/HierarchySystem.ts`

### Detected Conceptual Risks
- `MovementSystem.ts`: [DETERMINISM][CRITICAL] Duplicated integration logic between ECS and networking prediction.
- `CollisionSystem.ts`: [MUTATION][HIGH] Risk of world corruption if `onCollision` mutates entities during iteration.
- `CollisionSystem.ts`: [TYPE_SAFETY][MEDIUM] Use of `as any` for collider properties breaks static contracts.
- `BoundarySystem.ts`: [DRIFT][MEDIUM] Non-centralized `bounce` logic in `BoundarySystem` vs `PhysicsUtils`.
- `HierarchySystem.ts`: [PERFORMANCE][MEDIUM] Stack overflow risk and O(N) cost in deep hierarchical resolutions.

## [1.3.0] - 2025-05-25
### Added
- Full Level 9 TSDoc audit for Presentation systems and core utilities:
  - `src/engine/systems/JuiceSystem.ts`
  - `src/engine/systems/ParticleSystem.ts`
  - `src/engine/systems/ScreenShakeSystem.ts`
  - `src/engine/systems/RenderUpdateSystem.ts`
  - `src/engine/systems/TTLSystem.ts`
  - `src/engine/core/EventBus.ts`
  - `src/engine/core/StateMachine.ts`
  - `src/engine/rendering/Renderer.ts`

### Detected Conceptual Risks
- `JuiceSystem.ts`: [DETERMINISM][MEDIUM] Visual tweens mutating `Transform` may cause drift if read by simulation.
- `ParticleSystem.ts`: [PERFORMANCE][HIGH] High emission rates risk saturating the World and degrading query performance.
- `RenderUpdateSystem.ts`: [DETERMINISM][LOW] Update of `Render.rotation` vs `Transform.rotation` can cause drift if used in physics.
- `EventBus.ts`: [ORDER][MEDIUM] Non-guaranteed execution order of handlers.
- `StateMachine.ts`: [CONTEXT_MUTATION][LOW] Shared context is mutable by reference, risk of side effects.

## [1.4.0] - 2025-05-25 (Nightly Update)
### Added
- Level 5 TSDoc audit for 10 core files: Renderers, SceneManager, Utilities (Physics/Random), and Asset Management.
  - `src/engine/rendering/SkiaRenderer.ts`
  - `src/engine/rendering/CanvasRenderer.ts`
  - `src/engine/scenes/SceneManager.ts`
  - `src/engine/camera/Camera2D.ts`
  - `src/engine/utils/PhysicsUtils.ts`
  - `src/engine/utils/RandomService.ts`
  - `src/engine/utils/LifecycleUtils.ts`
  - `src/engine/core/SceneGraph.ts`
  - `src/engine/assets/AssetLoader.ts`
  - `src/engine/systems/PaletteSystem.ts`

### Detected Conceptual Risks
- `CanvasRenderer.ts`: [GC_PRESSURE][MEDIUM] Reconstrucción de comandos cada frame.
- `CanvasRenderer.ts`: [RENDER_DRIFT] Desincronización visual potencial entre Canvas y Skia.
- `Camera2D.ts`: [FPS_DEPENDENCE] Suavizado lerp dependiente del framerate (no compensado por dt).
- `SceneManager.ts`: [ASYNC_RACE] Riesgo de estados inconsistentes si se ejecutan transiciones paralelas.
- `LifecycleUtils.ts`: [ZALGO] Uso de `async` introduce microtask delay incluso para llamadas síncronas.
- `SceneGraph.ts`: [STALE_TRANSFORMS] World transforms desincronizadas si no se llama a `updateTransforms()`.
- `AssetLoader.ts`: [MEMORY_PRESSURE] Riesgo de fuga de memoria si `unloadGroup` no se llama simétricamente.

## [1.5.0] - 2025-06-01
### Added
- Auditoría TSDoc Nivel 5 para sistemas de XP, Mutadores, UI y Debug:
  - `src/engine/systems/XPSystem.ts`
  - `src/engine/systems/MutatorSystem.ts`
  - `src/engine/ui/UILayoutSystem.ts`
  - `src/engine/ui/UITweenSystem.ts`
  - `src/engine/debug/StateHasher.ts`

### Detected Conceptual Risks
- `XPSystem.ts`: [ASYNC_RACE] Riesgo de emisión de `level:up` en contexto inválido por persistencia asíncrona tras `game:over`.
- `MutatorSystem.ts`: [STUB] El sistema carece de implementación funcional para mutadores dinámicos.
- `UILayoutSystem.ts`: [WORLD_SYNC] Lag visual en elementos adjuntos al mundo si el layout ocurre antes que la actualización de cámara/transform.
- `UITweenSystem.ts`: [DT_UNIT_MISMATCH] Riesgo de animaciones extremadamente lentas si `deltaTime` no coincide con la unidad de `duration` (ms).
- `StateHasher.ts`: [JSON_DETERMINISM] `JSON.stringify` no garantiza orden de propiedades, arriesgando falsos positivos de desync.
- `StateHasher.ts`: [FLOAT_PRECISION] Diferencias de precisión entre arquitecturas invalidando hashes de estado.

## [1.6.0] - 2025-06-02
### Added
- Auditoría TSDoc Nivel 5 para el pipeline de renderizado y grabación:
  - `src/engine/rendering/RenderSystem.ts`
  - `src/engine/rendering/RenderTypes.ts`
  - `src/engine/rendering/CommandBuffer.ts`
  - `src/engine/rendering/RenderSnapshot.ts`
  - `src/engine/debug/ReplayRecorder.ts`

### Detected Conceptual Risks
- `RenderSystem.ts`: [SCENE_GRAPH_DEPENDENCY] Riesgo de renderizar posiciones de frames anteriores si el SceneGraph no se actualiza primero.
- `RenderTypes.ts`: [ALLOCATION_FREE] Riesgo de presión sobre el GC en implementaciones de Renderer que no usen pools.
- `CommandBuffer.ts`: [POOL_EXHAUSTION] Ignora comandos silenciosamente si se supera el límite pre-asignado.
- `RenderSnapshot.ts`: [ARRAY_MUTATION] Riesgo de corrupción visual por mutación externa de arrays compartidos.
- `ReplayRecorder.ts`: [MEMORY_LEAK] Grabación sin límites en sesiones largas.
- `ReplayRecorder.ts`: [DETERMINISM] El replay puede fallar si no se captura el estado inicial del mundo junto con los inputs.

## [1.7.0] - 2025-06-03
### Added
- Auditoría TSDoc Nivel 5 para sistemas de física avanzados, animación y audio:
  - `src/engine/physics/dynamics/PhysicsSystem2D.ts`
  - `src/engine/physics/collision/CollisionSystem2D.ts`
  - `src/engine/systems/AnimationSystem.ts`
  - `src/engine/systems/StateMachineSystem.ts`
  - `src/engine/core/AudioSystem.ts`

### Detected Conceptual Risks
- `PhysicsSystem2D.ts`: [FPS_DEPENDENCE] Riesgo de túnel o variaciones en gravedad por integración Euler lineal.
- `PhysicsSystem2D.ts`: [STABILITY] Posible jitter en contactos de reposo por resolución secuencial de impulsos.
- `CollisionSystem2D.ts`: [MUTATION_SAFETY] Riesgo de estados inconsistentes si los callbacks modifican el mundo durante la iteración de pares.
- `CollisionSystem2D.ts`: [SPATIAL_HASH_TUNING] Rendimiento crítico dependiente del tamaño de celda vs densidad de entidades.
- `AnimationSystem.ts`: [PRECISION_DRIFT] Acumulación de tiempo transcurrido sensible a precisión de coma flotante en sesiones largas.
- `StateMachineSystem.ts`: [OPAQUE_STATE] El estado interno de las FSM no reside en componentes ECS estándar, arriesgando snapshots incompletos.
- `AudioSystem.ts`: [AUTOPLAY] Bloqueo por políticas de navegador si no se llama a `resume()` tras gesto de usuario.
- `AudioSystem.ts`: [LATENCY_MISMATCH] Diferencias de latencia notables al usar fallback de HTML Audio para SFX.
