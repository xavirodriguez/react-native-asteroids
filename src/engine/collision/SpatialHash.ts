import { Entity, AABB } from "../types/EngineTypes";

/**
 * A spatial hashing implementation to provide efficient broadphase collision detection (O(n log n)).
 * Divides the 2D world into a grid of cells and tracks which entities are in which cells.
 */
export class SpatialHash {
  private grid = new Map<number, Entity[]>();
  private cellPool: Entity[][] = []; // Pool for the entity lists

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
        // Use a numerical key to avoid string allocations
        const key = (x << 16) | (y & 0xFFFF);
        let cell = this.grid.get(key);
        if (!cell) {
          cell = this.cellPool.pop() || [];
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
        const key = (x << 16) | (y & 0xFFFF);
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
      cell.length = 0;
      this.cellPool.push(cell);
    }
    this.grid.clear();
  }
}
