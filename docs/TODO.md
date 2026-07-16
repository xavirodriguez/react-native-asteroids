# Tasks: TinyAsterEngine — ECS invariants, lifecycle, and architecture

## Execution order

Tasks must be completed in the order listed. Each task depends on the
previous layer being correct. Do not reorder.

---

## Layer 1 — ECS invariants

### Task 1 of 7: Fix ReplicationSystem — direct mutation bypasses ECS invariants

**File:** `packages/core/src/network/ReplicationSystem.ts`

**Problem:**
Lines 33–47 mutate `transform.x`, `transform.y`, and `transform.rotation`
directly using `+=`. This bypasses `mutateComponent`, so `stateVersion` is
never incremented. Any system that reads `stateVersion` to decide whether to
serialize or diff state will miss every interpolation frame.

**Fix:**

Replace the direct mutation block with `mutateComponent` calls. The LERP
logic stays the same; only the write path changes.

Before:

```typescript
transform.x += (remote.targetX - transform.x) * alpha;
transform.y += (remote.targetY - transform.y) * alpha;
transform.rotation += diffRot * alpha;
```

After:

```typescript
world.mutateComponent(entity, "Transform", (t) => {
  t.x += (remote.targetX - t.x) * alpha;
  t.y += (remote.targetY - t.y) * alpha;
  let diffRot = remote.targetRotation - t.rotation;
  while (diffRot > Math.PI) diffRot -= Math.PI * 2;
  while (diffRot < -Math.PI) diffRot += Math.PI * 2;
  t.rotation += diffRot * alpha;
});
```

Apply the same pattern to every direct property assignment in lines 97–100.

**Acceptance:** After the fix, run the existing test suite. Verify that
`stateVersion` increments during a simulated replication step by adding a
temporary assertion before committing.

---

### Task 2 of 7: Add Object.freeze guard in getComponent (**DEV** only)

**File:** `packages/core/src/ecs/World.ts`

**Problem:**
`getComponent()` at line 285 returns the internal component reference
directly. Any caller can mutate it without going through `mutateComponent`,
silently corrupting state with no runtime error.

**Fix:**

Wrap the return value with `Object.freeze()` when `__DEV__` is true:

```typescript
getComponent<K extends ComponentType<TComponents>>(
  entity: Entity,
  type: K
): TComponents[K] | undefined {
  const component = this.componentMaps.get(type as string)?.get(entity) as
    TComponents[K] | undefined;
  if (__DEV__ && component !== undefined) {
    return Object.freeze(component) as TComponents[K];
  }
  return component;
}
```

**Constraint:** `Object.freeze` is shallow. Do not apply it in production
(`__DEV__ === false`). Do not wrap in a deep-freeze utility — that adds
allocation on every read in a hot path. Document this limitation in a
TSDoc `@remarks` comment on the method.

**Acceptance:** In `__DEV__` mode, attempting to do
`world.getComponent(e, "Transform").x = 999` must throw a TypeError at
runtime. In production mode, the existing behavior is unchanged.

---

## Layer 2 — Lifecycle base

### Task 3 of 7: Fix BaseGame.destroy() — incomplete cleanup

**File:** `packages/core/src/runtime/BaseGame.ts`, lines 152–154

**Problem:**
`destroy()` only stops the loop. It does not clear registered systems,
event handlers, or input listeners. Calling `destroy()` followed by any
operation that checks world state will find stale data.

**Fix:**

```typescript
public destroy(): void {
  this.loop.stop();
  this.world.schedule.clearSystems();
  this.eventBus.clear();
  if (this.unifiedInput && typeof this.unifiedInput.dispose === "function") {
    this.unifiedInput.dispose();
  }
}
```

Before adding these calls, verify that `schedule.clearSystems()` calls
`dispose()` on each registered system. If it does not, add that loop here:

```typescript
// Only if clearSystems() does not call dispose() internally:
this.world.schedule.getSystems().forEach((s) => s.dispose?.());
this.world.schedule.clearSystems();
```

Do not assume — read `schedule.clearSystems()` implementation before
deciding.

**Acceptance:** After calling `destroy()`, the following must hold:

- `this.world.schedule.getSystems()` returns an empty array.
- `this.eventBus` has no registered handlers.

---

### Task 4 of 7: Fix BaseGame.restart() — eventBus accumulates handlers

**File:** `packages/core/src/runtime/BaseGame.ts`, lines 159–173

**Problem:**
`restart()` calls `this.destroy()` (which now correctly clears the world),
then creates a `new World`. But `this.eventBus` is reused without clearing.
Every call to `restart()` re-registers all handlers from `registerSystems()`
and `registerInternalResources()` on the same bus, so after N restarts each
event fires N times.

**Fix:**

Call `this.eventBus.clear()` before creating the new `World`. Do NOT create
a new `EventBus` instance — other objects may hold a reference to the
existing one.

```typescript
public async restart(seed?: number): Promise<void> {
  if (seed !== undefined) {
    this._config.gameOptions = { ...this._config.gameOptions, seed };
  }
  this.destroy();
  this.eventBus.clear();           // ← add this line

  this.world = new World<TComponents, TEvents, TBlueprints>(
    this._config.schedule
  );
  this.registerInternalResources();
  this.registerSystems();
  this.initializeEntities();
  this.start();
}
```

**Acceptance:** Call `restart()` three times in sequence. The handler count
on `eventBus` after the third restart must equal the handler count after
the first restart.

---

## Layer 3 — State guards

### Task 5 of 7: Add idempotency guards to pause() and resume()

**File:** `packages/core/src/runtime/BaseGame.ts`

**Problem:**
`isPaused` is a private boolean at line 54. `pause()` and `resume()` do not
check the current state before acting. Calling `pause()` twice applies the
paused logic twice — depending on loop implementation, this may skip frames
or corrupt delta accumulation.

**Fix:**

Add early-return guards. No FSM, no additional state variables:

```typescript
public pause(): void {
  if (this.isPaused) return;
  this.isPaused = true;
  this.loop.pause();
}

public resume(): void {
  if (!this.isPaused) return;
  this.isPaused = false;
  this.loop.resume();
}
```

**Acceptance:** See Task 7 (tests cover this directly).

---

## Layer 4 — Architecture

### Task 6 of 7: Remove game-specific exports from core barrel

**File:** `packages/core/src/index.ts`, lines 91–95

**Problem:**
The core barrel exports `AsteroidsGame`, `EntityFactory`, and Asteroids
types directly. This inverts the dependency: the engine knows about the game.
Any consumer of `@tiny-aster/core` gets Asteroids types in scope whether
they want them or not.

**Fix:**

1. Remove these lines from `packages/core/src/index.ts`:

```typescript
export * from "./games/asteroids/AsteroidsGame";
export * from "./games/asteroids/EntityFactory";
export * from "./games/asteroids/types/AsteroidRegistry";
export * from "./games/asteroids/types/AsteroidTypes";
export * from "./games/asteroids/types/AsteroidConfigSchema";
```

2. Create `packages/core/src/games/asteroids/index.ts` with those same
   exports. This is a scoped barrel — not a re-export in the root barrel.

3. Find every import of these symbols across the monorepo
   (`grep -r "AsteroidsGame\|EntityFactory\|AsteroidRegistry" --include="*.ts"`).
   Update each import to point to `@tiny-aster/core/games/asteroids` or to
   the relative path, depending on whether the consumer is inside or outside
   `packages/core`.

4. Verify `packages/core/package.json` exports field includes
   `"./games/asteroids": "./src/games/asteroids/index.ts"` (or the compiled
   equivalent).

**Acceptance:** `pnpm build:core` passes. No import of `AsteroidsGame` comes
from `@tiny-aster/core` directly — only from `@tiny-aster/core/games/asteroids`.

---

### Task 7 of 7 (parallel with Task 6): Create ComboSystem generic + ComboComponent

**File (new):** `packages/core/src/games/arcade/systems/ComboSystem.ts`
**File (new):** `packages/core/src/games/arcade/components/ComboComponent.ts`

**Problem:**
Combo/multiplier logic is duplicated across `SpaceInvadersCollisionSystem`
(lines 103–118), `SpaceInvadersGameStateSystem` (lines 43–51), and Asteroids
state. Each copy has its own timer and multiplier reset logic.

**Step 1 — define the component:**

```typescript
export interface ComboComponent {
  /** Current consecutive hit count. Resets to 0 on timer expiry. */
  combo: number;
  /** Damage/score multiplier derived from combo. */
  multiplier: number;
  /** Remaining time in seconds before combo resets. */
  timerRemaining: number;
  /** Total seconds the timer runs after each hit. */
  timerDuration: number;
}
```

**Step 2 — implement the system:**

```typescript
export class ComboSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    world.query(["GameState"]).forEach((entity) => {
      const combo = world.getComponent(entity, "Combo");
      if (!combo || combo.timerRemaining <= 0) return;

      world.mutateComponent(entity, "Combo", (c) => {
        c.timerRemaining -= deltaTime;
        if (c.timerRemaining <= 0) {
          c.combo = 0;
          c.multiplier = 1;
        }
      });
    });
  }

  public dispose(): void {}
}
```

**Step 3 — replace the duplicate logic:**
Remove the combo timer blocks from `SpaceInvadersGameStateSystem` and
`SpaceInvadersCollisionSystem`. Replace with a call to `mutateComponent`
that increments `combo` and resets `timerRemaining` on hit.

**Constraint:** Do not define what "multiplier formula" means in `ComboSystem`.
That is game-specific. The system only ticks the timer and resets on expiry.
Games set `multiplier` when they increment `combo`.

**Acceptance:** Running the Space Invaders game flow, the combo counter resets
after `timerDuration` seconds with no change in observable behavior.

---

## Layer 5 — Tests (after all above)

### Task 8 of 7: Write unit tests for lifecycle methods

**File (new):**
`packages/core/src/__tests__/BaseGame.lifecycle.test.ts`

**Test setup constraints:**

- Mock `this.loop` with `{ start: jest.fn(), stop: jest.fn(), pause: jest.fn(), resume: jest.fn() }`.
- Mock `this.eventBus` with a real `EventBus` instance (not a mock) so
  handler accumulation is actually observable.
- `restart()` is async — use `await` in every test case.
- Do not use `requestAnimationFrame` or real timers. The loop mock is sync.

**Required test cases:**

```
describe("BaseGame lifecycle", () => {

  test("destroy() clears all registered systems")
  // After destroy(), world.schedule.getSystems().length === 0

  test("destroy() clears eventBus handlers")
  // After destroy(), no handlers fire on emit

  test("restart() does not accumulate eventBus handlers")
  // After 3 restarts, handler count === handler count after 1 restart

  test("pause() is idempotent")
  // Calling pause() twice does not call loop.pause() twice

  test("resume() is idempotent")
  // Calling resume() twice does not call loop.resume() twice

  test("resume() after resume() (was never paused) is a no-op")
  // loop.resume() is never called if game was not paused

})
```

**Acceptance:** All 6 tests pass. `pnpm test:ci` exits with code 0.

```

```
