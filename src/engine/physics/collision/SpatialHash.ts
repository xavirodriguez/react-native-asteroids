import { Entity, AABB } from "../../types/EngineTypes";
import { ObjectPool } from "../../utils/ObjectPool";

/**
 * Implementación de Spatial Hashing para detección de colisiones de fase ancha (broadphase).
 * Divide el espacio 2D en una cuadrícula uniforme y rastrea qué entidades ocupan qué celdas.
 *
 * @responsibility Intentar reducir la complejidad de comprobación de colisiones de O(N²) hacia O(N log N) en escenarios promedio.
 * @responsibility Gestionar el ciclo de vida de las listas de entidades por celda mediante pooling para reducir la presión sobre el GC.
 *
 * @conceptualRisk [GRID_SIZE_TUNING] Un `cellSize` demasiado pequeño aumenta el uso de memoria y el coste de inserción (muchas celdas por AABB).
 * @conceptualRisk [GRID_SIZE_TUNING] Un `cellSize` demasiado grande degrada a O(N²) dentro de una misma celda saturada.
 */
export class SpatialHash {
  /**
   * Mapa de celdas indexado por claves de coordenadas string "x,y".
   * @invariant Las celdas en el mapa solo contienen entidades activas durante el frame actual.
   */
  private grid = new Map<string, Entity[]>();

  /**
   * Pool de arrays para evitar alocaciones frecuentes de listas de entidades.
   * Principle 6: Explicit Object Pool for entity lists.
   */
  private cellPool = new ObjectPool<Entity[]>(
    () => [],
    (cell) => { cell.length = 0; },
    10
  );

  /**
   * @param cellSize - El tamaño de cada celda cuadrada en unidades del mundo.
   * @precondition cellSize \> 0
   */
  constructor(public cellSize: number) {}

  /**
   * Inserta una entidad en todas las celdas que solapan con su AABB.
   * @param id - ID de la entidad a insertar.
   * @param aabb - Caja delimitadora alineada con los ejes (AABB).
   * @mutates grid
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
   * Consulta todas las entidades en las celdas que solapan con el AABB dado.
   * @param aabb - Área de búsqueda.
   * @param result - Set donde se añadirán los candidatos (garantiza unicidad).
   * @queries grid
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
   * Limpia la cuadrícula y devuelve todas las listas de celdas al pool.
   * @contract Debe llamarse al inicio de cada frame antes de re-insertar entidades.
   * @mutates grid, cellPool
   */
  public clear(): void {
    this.grid.forEach(cell => {
      this.cellPool.release(cell);
    });
    this.grid.clear();

    if (__DEV__) {
      this.assertValid();
    }
  }

  /**
   * Verifica la integridad estructural de la cuadrícula.
   * Principle 2: Enforces hierarchical and structural invariants.
   * @contract Lanza un error si la cuadrícula no está vacía (usado tras clear() en dev).
   */
  public assertValid(): void {
    if (this.grid.size > 0) {
      throw new Error("SpatialHash Invariant Violation: Grid should be empty after clear()");
    }
  }
}

// Global helper for development mode
const __DEV__ = process.env.NODE_ENV !== "production";
