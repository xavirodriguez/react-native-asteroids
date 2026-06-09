import { Entity, AABB } from "../../ecs/CoreComponents";
import { ObjectPool } from "../../utils/ObjectPool";

/**
 * Spatial Grid for broad-phase optimization.
 *
 * API status: Public
 *
 * Responsibility: Divide the world into square cells to help accelerate spatial queries.
 * Responsibility: Aims to provide efficient access to cells and reduced complexity for queries over AABBs.
 *
 * @remarks
 * Implements a **Spatial Hash** strategy where entities are indexed in
 * one or more cells based on their AABB. This is designed to help reduce collision
 * detection complexity from O(N^2) toward approximately O(N) in typical scenarios,
 * although performance depends on cell size, entity distribution, and density.
 *
 * ### Configuración:
 * - **cellSize**: Tamaño de cada celda en píxeles. Se recomienda que sea mayor que el objeto
 *   más grande para mejorar el rendimiento de las consultas espaciales.
 */
export class SpatialGrid {
  private grid = new Map<string, Entity[]>();
  private cellPool = new ObjectPool<Entity[]>(
    () => [],
    (cell) => { cell.length = 0; },
    100
  );

  constructor(public cellSize: number = 100) {}

  /**
   * Inserts an entity into the grid based on its AABB.
   *
   * @warning **Allocations**: While cell arrays are pooled, inserting into multiple
   * cells may trigger map lookups and pool acquisitions. Key strings are generated
   * per cell, which contributes to per-frame allocations.
   */
  public insert(id: Entity, aabb: AABB): void {
    const minX = Math.floor(aabb.minX / this.cellSize);
    const maxX = Math.floor(aabb.maxX / this.cellSize);
    const minY = Math.floor(aabb.minY / this.cellSize);
    const maxY = Math.floor(aabb.maxY / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
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
   * Queries entities within an AABB.
   *
   * @warning **Allocations**: Generates cell key strings during iteration, which
   * contributes to per-frame allocations.
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
   * Returns keys of cells intersected by an AABB.
   */
  public getIntersectingCells(aabb: AABB): string[] {
    const keys: string[] = [];
    const minX = Math.floor(aabb.minX / this.cellSize);
    const maxX = Math.floor(aabb.maxX / this.cellSize);
    const minY = Math.floor(aabb.minY / this.cellSize);
    const maxY = Math.floor(aabb.maxY / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        keys.push(`${x},${y}`);
      }
    }
    return keys;
  }

  /**
   * Clears the grid.
   */
  public clear(): void {
    this.grid.forEach(cell => {
      this.cellPool.release(cell);
    });
    this.grid.clear();
  }

  /**
   * Get total number of active cells.
   */
  public get cellCount(): number {
    return this.grid.size;
  }
}
