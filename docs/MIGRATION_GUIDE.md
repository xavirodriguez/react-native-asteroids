# Migration Guide: Legacy System Isolation (2024-05-25)

## Overview
As part of the engine consolidation strategy, several legacy systems and platform-dependent controllers have been moved to the `Legacy` namespace. The `src/engine/collision` directory has also been restructured to group modern physics components under `src/engine/physics/collision`.

## Breaking Changes

### 1. CameraSystem
`CameraSystem` (React Native dependent) is no longer exported from the top-level entry point.
- **Old:** `import { CameraSystem } from '@engine/index';`
- **New:** `import { Legacy } from '@engine/index'; const cam = new Legacy.CameraSystem(...);`
- **Recommendation:** Migrate to `Camera2D` for platform-agnostic, deterministic camera logic.

### 2. InputManager & Controllers
`InputManager`, `KeyboardController`, and `TouchController` are now isolated in the `Legacy` namespace.
- **Old:** `import { InputManager } from '@engine/index';` (if previously exported)
- **New:** `import { Legacy } from '@engine/index';`
- **Recommendation:** Use `UnifiedInputSystem` and `InputStateComponent` for modern action-based input.

### 3. CollisionRouter
The Matter.js-dependent `CollisionRouter` has been moved to `Legacy`.
- **Recommendation:** Use `CollisionSystem2D` for the built-in physics engine.

### 4. SpatialHash Relocation
`SpatialHash` has been moved from `@engine/collision/SpatialHash` to `@engine/physics/collision/SpatialHash`.
- **Update:** Internal engine imports have been updated. Public access via the main entry point remains the same (exported from `src/engine/index.ts`).

### 5. Legacy Type Renaming and API Sanitization (2024-05-25)
Legacy types have been renamed and removed from the top-level API to prevent naming collisions and ensure developers use modern alternatives.
- **Renamed:** `Transform` (Legacy) -> `LegacyTransform`, `ScreenShake` (Legacy) -> `LegacyScreenShake`.
- **API Change:** Legacy types are no longer re-exported from `EngineTypes.ts`. They are only accessible via the `Legacy` namespace.
- **Old:** `import { Transform } from '@engine/index';`
- **New:** `import { Legacy } from '@engine/index'; const t: Legacy.LegacyTransform = ...;`

## Migration Steps
1. Update any direct file imports to use the new paths in `src/engine/legacy/`.
2. Prefer the modern alternatives (`Camera2D`, `UnifiedInputSystem`, `CollisionSystem2D`) for all new development.
3. If using legacy systems, access them via the `Legacy` namespace export from the engine.
