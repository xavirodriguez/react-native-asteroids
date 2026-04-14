# Asteroids Multiplayer Refactor: Deterministic Rollback Architecture

## 1. MANDATORY ARCHITECTURE AUDIT

### Server (`server/src/AsteroidsRoom.ts`)
- **Status**: REFACTORED.
- **Previous state**: Contained authoritative simulation mixed with schema updates. Had redundant "shoot" message handler.
- **Current state**: Delegates ALL gameplay logic to `DeterministicSimulation.ts`.
- **Input Handling**: Only processes `input` message. All actions (thrust, rotation, shoot, hyperspace) are extracted from the `InputFrame` buffer.
- **State Sync**: Uses `syncWorldToSchema()` for visual/UI sync and `fullWorldState` (serialized ECS world) for client rollback.

### Shared Logic (`src/simulation/DeterministicSimulation.ts`)
- **Status**: NEW MODULE (Unified).
- **Responsibility**: Contains 100% of the gameplay simulation (Physics, Input Application, Collisions, Spawning).
- **Determinism**: Strictly uses `RandomService.getInstance("gameplay")`.
- **Side Effects**: Gated by `SimulationContext.isResimulating`.

### Client (`src/games/asteroids/AsteroidsGame.ts`)
- **Status**: REFACTORED.
- **Previous state**: Used threshold-based snapping for server updates. Physics was loosely coupled.
- **Current state**: Implements full Rollback.
  - `predictLocalPlayer`: Predicts ahead using shared simulation.
  - `updateFromServer`: Compares predicted tick state with authoritative snapshot. If mismatch, restores authoritative state and re-simulates to the current tick.

### Engine (`src/engine/core/World.ts`)
- **Status**: ENHANCED.
- **Changes**: Added `snapshot()` and `restore()` methods. `query()` now returns entities sorted by ID ASC to guarantee deterministic iteration.

---

## 2. DETERMINISM CHECKLIST

- [x] **No Math.random()**: Replaced with `RandomService.getInstance("gameplay")` in all simulation paths (EntityFactory, DeterministicSimulation).
- [x] **No Date.now()**: Replaced with tick-based time or gameplay accumulated time in rendering/logic.
- [x] **Stable Iteration**: `World.query()` and `snapshot()` enforce Entity ID sorting.
- [x] **Seeded RNG**: Match seed is propagated from server to all clients via `AsteroidsState`.
- [x] **Side-Effect Gating**: Haptics, Screen Shake, and Event emission are disabled during `isResimulating`.
- [x] **Fixed Time Step**: All simulation updates use a constant `16.66ms` (60Hz) delta.

---

## 3. MIGRATION NOTES (What breaks + why)

- **Legacy Input Handler**: The `"shoot"` message handler in `AsteroidsRoom` has been REMOVED. Clients must now include the `shoot` action in their `InputFrame` sent via the `"input"` message.
- **Direct Physics Mutation**: Modifying `Transform` or `Velocity` outside of `DeterministicSimulation` will cause desyncs.
- **Component Serialization**: Any new component must be plain-data (serializable) to support `World.snapshot()`. Functions in components are explicitly stripped during serialization.
- **Entity IDs**: Client and Server entity IDs MUST stay in sync. The `restore()` method handles `nextEntityId` and `freeEntities` to ensure ID continuity.

---

## 4. PERFORMANCE CONSIDERATIONS

- **Snapshot Frequency**: Currently, the server sends a full world snapshot every tick as a JSON string.
- **Risk**: For worlds with many entities, this will increase bandwidth and parsing overhead.
- **Future Optimization**: Move to binary serialization (e.g., Protocol Buffers) or delta-compressed snapshots.
