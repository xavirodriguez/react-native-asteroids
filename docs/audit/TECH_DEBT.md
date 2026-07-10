# Technical Debt Log - TinyAster

This document lists and maps the technical debt items discovered during the audit, acting as an executive backlog of issues to resolve.

---

## Technical Debt Backlog Matrix

| ID | Issue Description | Severity | Category | Target File(s) / Folder | Proposal Summary |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **TD-01** | Client-Server Direct Core Import Leakage | **Critical** | Architecture | `server/src/AsteroidsRoom.ts`, `src/games/` | Split games into pure, headless packages and platform adaptors. |
| **TD-02** | `"strict": false` on server configuration | **Critical** | Type Safety | `server/tsconfig.json` | Enable `"strict": true` and resolve compiler errors. |
| **TD-03** | Transpilation artifact leak into `/src` | **Critical** | Build | `server/src/`, `src/` | Set proper `"outDir"` and delete raw `.js` and `.js.map` files. |
| **TD-04** | Replication Sync Physics scale discrepancy | **Critical** | Physics / Net | `ReplicationSystem.ts` vs `MovementSystem.ts` | Use seconds-based or milliseconds-based deltas consistently everywhere. |
| **TD-05** | Direct sorting of lists inside hot render paths | **High** | Performance | `CanvasRenderer.ts`, `SkiaRenderer.ts` | Cache sorted entity lists; re-sort only on structural mutations. |
| **TD-06** | `World.entities` O(N log N) sorting | **High** | Performance | `packages/core/src/ecs/World.ts` | Cache active entities array; rebuild on dirty flag. |
| **TD-07** | Pure protocol `NetTypes` placed in UI hooks | **High** | Architecture | `packages/react-native/src/hooks/` | Move networking types to `@tiny-aster/core` or a network package. |
| **TD-08** | Hardcoded physics simulation in reconciliation | **High** | Duplication | `ReplicationSystem.ts` | Reuse engine physics systems instead of writing hardcoded thrust math. |
| **TD-09** | Missing tests for rendering and network prediction | **High** | Testing | `packages/renderer-*/`, `packages/network-*/` | Create simulated mock networks and Virtual Canvas testing. |
| **TD-10** | Empty Input System skeletons | **Medium** | Clean Code | `src/games/asteroids/systems/...` | Complete input systems or prune obsolete skeleton code. |
| **TD-11** | Tight coupling of Renderer to Collider components | **Medium** | Architecture | `CanvasRenderer.ts`, `SkiaRenderer.ts` | Render entities based on `Render` components, not `Collider`. |
| **TD-12** | EventBus using loose types and `as any` casts | **Medium** | Type Safety | `EventBus.ts`, `AsteroidsRoom.ts` | Define strict event-to-payload map interfaces. |
| **TD-13** | Lack of parameter validation on room creations | **Medium** | Security | `server/src/AsteroidsRoom.ts` | Validate inputs (seed, options) using Zod schemas on room initialization. |

---

## Executive Refactoring Strategy

### Phase 1: Isolation & Build Recovery (Target: 1-2 weeks)
- Remove compiled `.js` artifacts from the source tree. Update gitignore to prevent this from ever happening again.
- Move `NetTypes.ts` out of `@tiny-aster/react-native` to `@tiny-aster/core` or `@tiny-aster/network`.
- Correct the server `tsconfig.json` to configure `"outDir": "./dist"` and enable `"strict": true`.
- Establish clean architectural interfaces so the Server Headless room doesn't depend on client React Native elements.

### Phase 2: Core Physics & Multiplayer Alignment (Target: 2-3 weeks)
- Align delta time scales between `MovementSystem` and `ReplicationSystem` to cure the desynchronization/warp issue.
- Refactor the reconciliation loop to re-execute actual ECS systems instead of hardcoded math, restoring the integrity of Client-Side Prediction.
- Implement the actual Delta and Network Budget compression algorithms in `@tiny-aster/core` instead of utilizing dummy stubs.

### Phase 3: Performance & Rendering Optimization (Target: 1 week)
- Replace the expensive `O(N log N)` render-time sorting routines inside `CanvasRenderer` and `SkiaRenderer` with reactive cached lists.
- Fix `World.entities` by caching the array representation and only sorting lazily when structural world changes (creation/deletion of entities) occur.
