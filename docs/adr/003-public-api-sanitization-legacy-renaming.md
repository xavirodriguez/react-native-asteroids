# ADR 003: Public API Sanitization and Legacy Renaming

## Context
The engine's public API was contaminated with legacy types re-exported from `EngineTypes.ts`. Specifically, legacy interfaces like `Transform` and `ScreenShake` were available at the top-level, leading to naming collisions and confusion with their modern counterparts (`TransformComponent`, `ScreenShakeComponent`). Additionally, `LegacyComponents.ts` contained duplicate interface definitions.

## Problem
- **Naming Collisions**: Having both `Transform` (Legacy) and `TransformComponent` (Modern) available at the top level created ambiguity.
- **Maintenance Burden**: Duplicate definitions in `LegacyComponents.ts` made it harder to maintain and understand the legacy surface.
- **API Surface**: Exposing legacy types directly in the core API goes against the strategy of isolating legacy code in its own namespace.

## Decision
1. **Rename Legacy Interfaces**: Renamed `Transform` to `LegacyTransform` and `ScreenShake` to `LegacyScreenShake` within `src/engine/legacy/LegacyComponents.ts`.
2. **Clean up Legacy Definitions**: Removed duplicate definitions of `PositionComponent` and `ColliderComponent`.
3. **Restrict API Surface**: Removed all legacy re-exports from `src/engine/types/EngineTypes.ts`. Legacy types are now strictly accessible through the `Legacy` namespace exported from the main entry point.

## Consequences
- **Breaking Change**: Any code relying on importing `Transform` or `ScreenShake` from `@engine/index` or `@engine/types/EngineTypes` will break.
- **Improved Clarity**: Developers are now forced to use the `Legacy` namespace to access old components, signaling their deprecated status.
- **Better Tooling**: Naming collisions are eliminated, improving IDE autocompletion and type safety.

## Migration Plan
- Search and replace imports of `Transform` and `ScreenShake` from the top-level engine API.
- Update code to use `Legacy.LegacyTransform` and `Legacy.LegacyScreenShake` if those legacy structures are still needed.
- Preferably, migrate to `TransformComponent` and `ScreenShakeComponent`.
