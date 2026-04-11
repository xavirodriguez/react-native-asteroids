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
