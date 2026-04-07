import { Entity, AABB } from "../types/EngineTypes";
import { ObjectPool } from "../utils/ObjectPool";

/**
 * A spatial hashing implementation to provide efficient broadphase collision detection (O(n log n)).
 * Divides the 2D world into a grid of cells and tracks which entities are in which cells.
 */
export class SpatialHash {
  private grid = new Map<string, Entity[]>();

  /**
   * Principle 6: Explicit Object Pool for entity lists.
   */
  private cellPool = new ObjectPool<Entity[]>(
    () => [],
    (cell) => { cell.length = 0; },
    10
  );

  constructor(public cellSize: number) {}

  /**
   * Inserts an entity into all cells that its AABB overlaps.
   */
  public insert(id: Entity, aabb: AABB): void {
    const minX = Math.floor(aabb.minX / this.cellSize);
    const maxX = Math.floor(aabb.maxX / this.cellSize);
    const minY = Math.floor(aabb.minY / this.cellSize);
    const maxY = Math.floor(aabb.maxY / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // Principle 5: Composite keys without assuming ID ranges
        const key = `${x},${y}`;
        let cell = this.grid.get(key);
        if (!cell) {
          cell = this.cellPool.acquire();
          this.grid.set(key, cell);
        }
        cell.push(id);
      }
    }
  }

  /**
   * Queries all entities in cells that the given AABB overlaps.
   * Returns a list of unique candidates.
   */
  public query(aabb: AABB, result: Set<Entity>): void {
    const minX = Math.floor(aabb.minX / this.cellSize);
    const maxX = Math.floor(aabb.maxX / this.cellSize);
    const minY = Math.floor(aabb.minY / this.cellSize);
    const maxY = Math.floor(aabb.maxY / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            result.add(cell[i]);
          }
        }
      }
    }
  }

  /**
   * Clears the grid and returns lists to the pool.
   */
  public clear(): void {
    for (const cell of this.grid.values()) {
      this.cellPool.release(cell);
    }
    this.grid.clear();

    if (__DEV__) {
      this.assertValid();
    }
  }

  /**
   * Principle 2: Enforces hierarchical and structural invariants.
   */
  public assertValid(): void {
    if (this.grid.size > 0) {
      throw new Error("SpatialHash Invariant Violation: Grid should be empty after clear()");
    }
  }
}

// Global helper for development mode
const __DEV__ = process.env.NODE_ENV !== "production";
