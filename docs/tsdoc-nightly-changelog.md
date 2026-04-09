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
