# ADR

## DECISION-001: Cached World.entities Sorting

### Context
In every tick/frame, active game systems and/or visual rendering backends iterate over all active entities in the ECS World. The original implementation of `World.entities` (and its alias `World.getAllEntities()`) performed `Array.from(this.activeEntities).sort((a, b) => a - b)` on *every single invocation*.

Since `activeEntities` is a dynamic Set of numbers, this caused:
1. High CPU overhead from sorting ($O(N \log N)$ operations per call).
2. Large GC pressure from allocating a new array on every access, even when no structural changes occurred.

### Decision
We introduced a private cache variable `cachedEntities: ReadonlyArray<Entity> | null` to cache the sorted entities list.

- The `get entities` property now checks if `cachedEntities` is present. If not, it computes and caches the sorted list.
- We invalidate the cache (`this.cachedEntities = null`) whenever a structural change occurs:
  1. `createEntity()`
  2. `removeEntity()`
  3. `clear()`

### Consequences
- **Performance**: Accessing `entities` in the hot path is now $O(1)$ and allocations are minimized to $0$ on frames without entity creation/removal.
- **GC Pressure**: Substantially reduced garbage collection frequency, leading to smoother and more consistent frame times (less visual stuttering).

## DECISION-002: Exposing World Entity Activation API

### Context
The `WorldCommandBuffer` class had to activate reserved entity IDs by reaching into the private state of `World` using unsafe casts (`world as unknown as { activeEntities: Set<number>, _structureVersion: number }`). This bypassed encapsulation and created a fragile coupling between `World` and `WorldCommandBuffer`.

### Decision
We exposed a clean, public `activateEntity(entity: Entity)` method on the `World` class that handles adding the entity to `activeEntities`, invalidating the entity cache, and incrementing `_structureVersion`. The `WorldCommandBuffer` now calls this method directly.

### Consequences
- **Encapsulation**: Restored strict object encapsulation on the core `World` instance.
- **Robustness**: Eliminated unsafe TypeScript type assertion workarounds, preventing compile-time and runtime breakage on refactoring.

## DECISION-003: Decoupled ECS Input Bridge

### Context
The Asteroids game screen (`src/app/asteroids/index.tsx`) previously bypassed game-state boundaries by directly querying the ECS World for `"LocalPlayer"`, fetching its entity, and directly mutating its `"InputState"` component with type-unsafe callbacks. This violated Hexagonal Architecture and coupled the React view directly to the internal structure of ECS components.

### Decision
We implemented a decoupled "Input Bridge" by defining an `setInputState` method in the `IAsteroidsGame` interface and implementing it in both `AsteroidsGame` and `NullAsteroidsGame`. This method accepts `Partial<InputState>` and internally queries and updates the local player entity. The React component now calls `game.setInputState(input)` instead.

### Consequences
- **Loose Coupling**: The React view is now completely decoupled from internal ECS query names and component mutation details.
- **Type Safety**: Avoids type-unsafe casts (`as any`) inside React components, making the game simulation easier to maintain and refactor.
