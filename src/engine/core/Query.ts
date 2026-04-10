import { Entity } from "../types/EngineTypes";

/**
 * Representa una consulta reactiva que mantiene una lista actualizada de entidades
 * que coinciden con una firma de componentes específica.
 *
 * @remarks
 * Las queries son gestionadas por el {@link World} y se actualizan de forma incremental
 * cuando se añaden o eliminan entidades o componentes, evitando el escaneo total del mundo.
 */
export class Query {
  private entities: Set<Entity> = new Set();
  private entityArray: Entity[] = [];
  private needsUpdateArray = false;

  /**
   * Crea una nueva Query para un conjunto específico de componentes.
   * @param componentTypes - Los tipos de componentes requeridos (firma de la query).
   */
  constructor(public readonly componentTypes: string[]) {}

  /**
   * Comprueba si una entidad debe formar parte de esta query basado en sus componentes.
   *
   * @param entityComponents - El conjunto de tipos de componentes que posee la entidad.
   * @returns `true` si la entidad posee TODOS los tipos de componentes requeridos.
   */
  public matches(entityComponents: Set<string>): boolean {
    return this.componentTypes.every(type => entityComponents.has(type));
  }

  /**
   * Añade una entidad al resultado de la query si no está presente.
   *
   * @param entity - La entidad a añadir.
   *
   * @postcondition Si la entidad era nueva, marca {@link Query.needsUpdateArray} como `true`.
   * @sideEffect Altera el `Set` interno de entidades.
   */
  public add(entity: Entity): void {
    if (!this.entities.has(entity)) {
      this.entities.add(entity);
      this.needsUpdateArray = true;
    }
  }

  /**
   * Elimina una entidad del resultado de la query.
   *
   * @param entity - La entidad a eliminar.
   *
   * @postcondition Si la entidad estaba presente, marca {@link Query.needsUpdateArray} como `true`.
   * @sideEffect Altera el `Set` interno de entidades.
   */
  public remove(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.needsUpdateArray = true;
    }
  }

  /**
   * Devuelve la lista de entidades que coinciden con la query.
   * Devuelve un array cacheado para minimizar la presión del GC.
   *
   * @returns Un array de IDs de {@link Entity}.
   *
   * @remarks
   * El array devuelto es una referencia a un caché interno.
   *
   * @conceptualRisk [MUTABLE_CACHE_LEAK][MEDIUM] Si un consumidor modifica el array devuelto
   * (e.g., mediante `.push()` o `.sort()` in-place), corromperá el estado interno de la Query.
   */
  public getEntities(): Entity[] {
    if (this.needsUpdateArray) {
      this.entityArray = Array.from(this.entities);
      this.needsUpdateArray = false;
    }
    return this.entityArray;
  }

  /**
   * Devuelve la clave única para esta query basada en los tipos de componentes.
   *
   * @remarks
   * La clave es una cadena separada por comas y ordenada alfabéticamente de los tipos
   * de componentes, garantizando que el orden de entrada no genere duplicados.
   */
  public get key(): string {
    return [...this.componentTypes].sort().join(",");
  }
}
