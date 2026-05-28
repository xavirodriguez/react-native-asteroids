import { Entity } from "../types/EngineTypes";

/**
 * Manager for recycling entity identifiers.
 *
 * @remarks
 * Designed to help reduce per-frame allocations during entity creation and destruction.
 * By reusing numeric IDs, it aims to help mitigate garbage collector (GC) pressure in hot paths.
 * In practice, the effectiveness of pooling is subject to the frequency of structural
 * changes and the JavaScript engine's memory management.
 *
 * @public
 */
export class EntityPool {
  /** @internal */
  private pool: Entity[] = [];
  /** @internal */
  private pooledSet: Set<Entity> = new Set();
  /** @internal */
  private nextId = 1;

  /**
   * Retrieves an available entity ID.
   *
   * @remarks
   * Attempts to reuse IDs from the internal pool. If the pool is empty, it increments
   * the global ID counter.
   *
   * @returns A new {@link Entity} (numeric identifier).
   * @expectation The returned ID is not expected to be available in the pool until explicitly released.
   * @sideEffect Increments `nextId` if the pool is empty.
   */
  public acquire(): Entity {
    if (this.pool.length > 0) {
        const id = this.pool.pop()!;
        this.pooledSet.delete(id);
        return id;
    }
    return this.nextId++;
  }

  /**
   * Returns an entity ID to the pool for future reuse.
   *
   * @remarks
   * The released ID becomes eligible for reuse in subsequent calls to {@link EntityPool.acquire}.
   *
   * @param id - The entity identifier to release.
   *
   * @expectation The ID is expected to have been previously acquired via {@link EntityPool.acquire}.
   * @postcondition The ID is added to the available IDs stack.
   * @conceptualRisk [ENTITY_REUSE][FIXED] Includes validation via `pooledSet`
   * to help prevent "double-release" scenarios (releasing the same ID twice),
   * which could lead to state corruption in the {@link World}.
   */
  public release(id: Entity): void {
    if (this.pooledSet.has(id)) {
        console.error(`[EntityPool] Double-release detected for entity ID: ${id}.`);
        throw new Error(`Entity ${id} already in pool.`);
    }
    this.pool.push(id);
    this.pooledSet.add(id);
  }

  /**
   * Resets the pool and the ID counter.
   *
   * @remarks
   * Effectively invalidates previously created entity IDs. Use with caution,
   * typically during a total engine reset.
   *
   * @precondition The ECS world should be empty to help mitigate the risk of ID collisions with existing entities.
   * @postcondition {@link EntityPool.pool} is empty and `nextId` resets to 1.
   */
  public clear(): void {
    this.pool = [];
    this.pooledSet.clear();
    this.nextId = 1;
  }
}
