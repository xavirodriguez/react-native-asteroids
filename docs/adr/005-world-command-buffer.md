# ADR 005: World Command Buffer (Deferred Mutations)

## Context
In an ECS architecture, systems often iterate over entities and their components. If a system adds or removes entities or components during this iteration, it can invalidate the data structures the system is currently traversing (e.g., the entity array returned by a Query).

## Problem
- **Iterator Invalidation**: Modifying the world state mid-iteration can lead to skipped entities, double-processing, or out-of-bounds errors.
- **Mid-frame Inconsistency**: Different systems might see different versions of the world state within the same frame depending on their execution order, making the simulation harder to reason about.

## Decision
Implement a `WorldCommandBuffer` to defer all structural changes (`createEntity`, `removeEntity`, `addComponent`, `removeComponent`) that occur while the world is updating.

1. Added `isUpdating` flag to `World.ts`.
2. Modified structural mutation methods to check `isUpdating`.
3. If `isUpdating` is true, mutations are pushed to a `WorldCommandBuffer`.
4. At the end of `World.update()`, `flush()` is called to apply all buffered changes.

## Consequences
- **Safety**: Systems can now safely create or destroy entities and components without fear of corrupting the current iteration.
- **Consistency**: All systems within a single frame see a consistent view of the world structure as it was at the start of the frame.
- **API Transparency**: The public API remains identical, but its behavior becomes more robust under concurrent-like system execution.
- **Reserved IDs**: `createEntity` still returns a valid ID immediately, but the entity is not "active" in queries until the end of the frame.

## Migration Plan
No changes are required for existing game code as the external API is preserved. Developers should be aware that new entities created during a system's `update()` will not be available for queries until the next tick.
