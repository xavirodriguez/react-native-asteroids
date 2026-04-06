import { Entity } from "../types/EngineTypes";

/**
 * Numerical Spatial Hash for efficient broadphase collision detection.
 * Divides the 2D space into a grid and maps entities to cells.
 */
export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, Entity[]> = new Map();

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }

  /**
   * Clears the hash.
   */
  public clear(): void {
    this.grid.clear();
  }

  /**
   * Adds an entity to the hash based on its bounding box.
   */
  public add(entity: Entity, x: number, y: number, radius: number): void {
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    for (let i = minX; i <= maxX; i++) {
      for (let j = minY; j <= maxY; j++) {
        // Principle 5: Composite keys without assuming ID ranges
        const key = `${i},${j}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(entity);
      }
    }
  }

  /**
   * Returns a list of potential collision candidates for a given entity.
   */
  public getCandidates(x: number, y: number, radius: number): Set<Entity> {
    const candidates = new Set<Entity>();
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    for (let i = minX; i <= maxX; i++) {
      for (let j = minY; j <= maxY; j++) {
        const key = `${i},${j}`;
        const entities = this.grid.get(key);
        if (entities) {
          entities.forEach((e) => candidates.add(e));
        }
      }
    }

    return candidates;
  }
}
