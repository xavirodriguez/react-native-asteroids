# ADR 001: Physics & Collision Type Consolidation

## Context
Core physics data structures (like `CollisionManifold`) were previously located in `src/engine/legacy/LegacyComponents.ts`. This created a conceptual contradiction: modern systems like `CollisionSystem2D` and `NarrowPhase` were depending on a "legacy" file for their fundamental data contracts.

## Problem
- **Ambiguity**: Developers might avoid using `CollisionManifold` because it is in a "legacy" file.
- **Architectural Purity**: Core domain logic (physics) should not depend on legacy compatibility layers.
- **Documentation**: TSDoc and API extractors might incorrectly flag these types as deprecated if they reside in a legacy namespace.

## Decision
Move `CollisionManifold` to a new canonical home in `src/engine/physics/collision/CollisionTypes.ts`.

## Consequences
- **Modern Imports**: New code should import `CollisionManifold` from `@engine/physics/collision/CollisionTypes` (or the top-level index).
- **Backward Compatibility**: `LegacyComponents.ts` and `EngineTypes.ts` will continue to re-export the type to avoid breaking existing games or external consumers.
- **Clarity**: High-performance physics data is now physically and conceptually isolated from deprecated components.

## Migration Plan
1. Update engine systems to use the new import path.
2. (Optional) Future refactors can progressively move other core types out of legacy as they are modernized.
