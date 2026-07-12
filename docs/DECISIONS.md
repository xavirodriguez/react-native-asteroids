# Design Decisions - Tiny Aster Engine

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
