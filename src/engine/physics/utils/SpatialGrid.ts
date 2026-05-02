import { Entity, AABB } from "../../types/EngineTypes";
import { ObjectPool } from "../../utils/ObjectPool";

/**
 * Grid Espacial para optimización de fase ancha (Broadphase).
 *
 * @responsibility Dividir el mundo en celdas cuadradas para acelerar consultas espaciales.
 * @responsibility Proporcionar acceso O(1) a celdas y consultas O(M) sobre AABBs.
 *
 * @remarks
 * Implementa una estrategia de **Hash Espacial** donde las entidades se indexan en
 * una o más celdas basadas en su AABB. Esto reduce la complejidad de detección de
 * colisiones de O(N^2) a aproximadamente O(N).
 *
 * ### Configuración:
 * - **cellSize**: Tamaño de cada celda en píxeles. Debe ser mayor que el objeto más grande
 *   para un rendimiento óptimo.
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
