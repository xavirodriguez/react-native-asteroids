import { Entity } from "../types/EngineTypes";

/**
 * Gestor de reciclaje de identificadores de entidades.
 *
 * @remarks
 * Proporciona una estrategia de "Zero Allocation" para la creación y destrucción de entidades.
 * Al reutilizar IDs numéricos, se minimiza la fragmentación de memoria y se reduce el trabajo
 * del recolector de basura (GC) en juegos con alta tasa de spawn (balas, partículas).
 */
export class EntityPool {
  private pool: Entity[] = [];
  private pooledSet: Set<Entity> = new Set();
  private nextId = 1;

  /**
   * Obtiene un ID de entidad disponible.
   *
   * @remarks
   * Prioriza la reutilización de IDs en el pool interno. Si el pool está vacío, incrementa
   * el contador global de IDs.
   *
   * @returns Un nuevo {@link Entity} (identificador numérico).
   * @postcondition El ID devuelto no estará disponible en el pool hasta que sea liberado.
   * @sideEffect Incrementa `nextId` si el pool está vacío.
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
   * Devuelve un ID de entidad al pool para su futura reutilización.
   *
   * @remarks
   * El ID liberado estará disponible en la próxima llamada a {@link EntityPool.acquire}.
   *
   * @param id - El identificador de la entidad a liberar.
   *
   * @precondition El ID debe haber sido obtenido previamente mediante {@link EntityPool.acquire}.
   * @postcondition El ID se añade a la pila de IDs disponibles.
   * @conceptualRisk [ENTITY_REUSE][FIXED] Se ha implementado una validación mediante `pooledSet`
   * para evitar el "double-release" (liberar el mismo ID dos veces), previniendo la corrupción
   * de estado en el {@link World}.
   */
  public release(id: Entity): void {
    if (this.pooledSet.has(id)) {
        console.warn(`[EntityPool] Double-release detected for entity ID: ${id}. Ignoring.`);
        if (__DEV__) {
            // throw new Error(`Entity ${id} already in pool.`);
        }
        return;
    }
    this.pool.push(id);
    this.pooledSet.add(id);
  }

  /**
   * Reinicia el pool y el contador de IDs.
   *
   * @remarks
   * Invalida todos los IDs de entidades creados anteriormente. Debe usarse con precaución,
   * generalmente solo durante el reinicio total del motor.
   *
   * @postcondition {@link EntityPool.pool} queda vacío y `nextId` vuelve a 1.
   */
  public clear(): void {
    this.pool = [];
    this.pooledSet.clear();
    this.nextId = 1;
  }
}
