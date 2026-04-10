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
- Full Level 5 TSDoc audit for 20 engine files (systems, renderers, input, and utilities):
  - `src/engine/systems/MovementSystem.ts`
  - `src/engine/systems/CollisionSystem.ts`
  - `src/engine/systems/BoundarySystem.ts`
  - `src/engine/systems/HierarchySystem.ts`
  - `src/engine/systems/JuiceSystem.ts`
  - `src/engine/systems/ParticleSystem.ts`
  - `src/engine/systems/ScreenShakeSystem.ts`
  - `src/engine/rendering/CanvasRenderer.ts`
  - `src/engine/rendering/SkiaRenderer.ts`
  - `src/engine/utils/PhysicsUtils.ts`
  - `src/engine/systems/FrictionSystem.ts`
  - `src/engine/systems/TTLSystem.ts`
  - `src/engine/systems/RenderUpdateSystem.ts`
  - `src/engine/input/InputManager.ts`
  - `src/engine/input/KeyboardController.ts`
  - `src/engine/utils/Juice.ts`
  - `src/engine/utils/PrefabPool.ts`
  - `src/engine/utils/ObjectPool.ts`
  - `src/engine/systems/BaseGameStateSystem.ts`
  - `src/engine/systems/AnimationSystem.ts`

### Detected Conceptual Risks
- `MovementSystem.ts`: Euler integration precision issues at high speeds (tunneling).
- `CollisionSystem.ts`: AABB broadphase with circular narrowphase creates drift for non-circular colliders.
- `HierarchySystem.ts`: Risk of stale world transforms if execution order is not strictly enforced.
- `JuiceSystem.ts`: Mutation conflict risk when multiple animations target the same property.
- `ParticleSystem.ts`: Silent failure risk on pool exhaustion; visual-only particles should avoid global RNG.
- `CanvasRenderer.ts`: Garbage Collector pressure from rebuilding render command arrays every frame.
- `SkiaRenderer.ts`: Performance bottleneck risk due to JS-Native bridge overhead in entity-heavy scenes.
- `TTLSystem.ts`: Mutation safety risks from side effects within the `onComplete` callback.
- `RenderUpdateSystem.ts`: Manual version bumping causing unnecessary re-renders (version bloat).
- `ObjectPool.ts`: Memory corruption risks due to mutable references returned by `acquire()`.
- `BaseGameStateSystem.ts`: Singleton state assumption risk (masks multi-state entity scenarios).
