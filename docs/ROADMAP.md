# Roadmap

Here is the ongoing roadmap of performance, technical debt, and architecture improvements for the engine.

## Phase 1: Architecture and Boundaries
- [x] Align package dependencies and fix workspace builds for headless server and client core.
- [x] Implement an "Input Bridge" to decouple React UI from ECS.
- [x] Remove `as unknown as AsteroidsGame` casts in React components.
- [ ] Centralize `KeepAwake` and audio services in a Provider.

## Phase 2: Core Performance
- [x] Optimize `World.entities` by caching sorted entities list.
- [ ] Investigate migration of snapshot structures to SoA (Structure of Arrays / TypedArrays) to reduce GC pressure.
- [ ] Implement entity pooling to prevent object recreation during gameplay.

## Phase 3: Strict Typing and Quality
- [ ] Turn on `@typescript-eslint/no-explicit-any` warning to error level.
- [ ] Strongly type ECS queries on the UI.
- [ ] Validate configuration schemas with Zod at load time.

## Phase 4: Semicolon / Code Smells Cleanup
- [ ] Fix various code smells identified during initial audits.

## Phase 5: Documentation & Invariant Quality
- [x] Complete TSDoc Audit and precise contracts for Core ECS Container (`World.ts`).
- [x] Document BaseGame Lifecycle contracts, postconditions, and idempotency rules (`BaseGame.ts`).
- [x] Document Multiplayer Replication client-prediction & rollback tradeoffs (`ReplicationSystem.ts`).
- [ ] Extend Level 1 and Level 2 TSDoc contracts to `CollisionSystems.ts` and `Schedule.ts`.
