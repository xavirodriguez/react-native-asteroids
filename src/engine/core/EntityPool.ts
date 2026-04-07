import { Entity } from "../types/EngineTypes";

/**
 * Manages a pool of entity IDs to ensure zero allocations during high-frequency acquisition.
 */
export class EntityPool {
  private pool: Entity[] = [];
  private nextId = 1;

  /**
   * Acquires an entity ID from the pool or creates a new one.
   */
  public acquire(): Entity {
    return this.pool.length > 0 ? this.pool.pop()! : this.nextId++;
  }

  /**
   * Releases an entity ID back to the pool for reuse.
   */
  public release(id: Entity): void {
    this.pool.push(id);
  }

  /**
   * Resets the pool and the next ID counter.
   */
  public clear(): void {
    this.pool = [];
    this.nextId = 1;
  }
}
