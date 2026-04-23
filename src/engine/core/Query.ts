import { Entity } from "../types/EngineTypes";

/**
 * Consulta reactiva que mantiene un índice actualizado de entidades con una firma de
 * componentes específica.
 *
 * @responsibility Mantener una lista filtrada y cacheada de entidades que cumplen una firma.
 * @responsibility Responder de forma reactiva a cambios estructurales en el World.
 * @responsibility Proporcionar acceso eficiente a grupos de entidades filtrados por componentes.
 *
 * @remarks
 * Las queries reducen la necesidad de iterar sobre todas las entidades del mundo en cada frame.
 * El {@link World} notifica a las queries relevantes cuando ocurren cambios estructurales,
 * permitiendo un acceso rápido a las entidades que coinciden con la firma.
 *
 * @conceptualRisk [MUTABLE_CACHE_LEAK][MEDIUM] Si un consumidor modifica el array devuelto
 * (e.g., mediante `.push()` o `.sort()` in-place), corromperá el estado interno de la Query.
 */
export class Query {
  private entities: Set<Entity> = new Set();
  private entityArray: Entity[] = [];
  private needsUpdateArray = false;

  /**
   * Inicializa una query para una firma de componentes determinada.
   *
   * @param componentTypes - Lista de tipos de componentes que definen la firma.
   *
   * @precondition Debe proporcionarse al menos un tipo de componente.
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
   * @precondition La entidad debe cumplir la firma de la query.
   * @postcondition Si la entidad era nueva, marca {@link Query.needsUpdateArray} como `true`.
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
   */
  public remove(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.needsUpdateArray = true;
    }
  }

  /**
   * Proporciona la lista de entidades que coinciden actualmente con la firma de la query.
   * Emplea un array cacheado para reducir la presión sobre el recolector de basura.
   *
   * @remarks
   * El array devuelto es una referencia al caché interno. Se entrega como `ReadonlyArray`
   * para desaconsejar mutaciones externas que corromperían el estado de la query.
   *
   * @returns Un array de solo lectura de IDs de {@link Entity}.
   *
   * @precondition No se debe realizar casting de este array a uno mutable ni utilizar
   * métodos in-place (sort, push, splice).
   * @postcondition El array devuelto refleja el estado actual del {@link World} para esta firma.
   * @postcondition Las entidades en el array se entregan ordenadas por ID de forma ascendente.
   *
   * @conceptualRisk [MEMORY][MEDIUM] Fuga de caché mutable en Queries. Los sistemas reciben
   * una referencia al array interno de la query y pueden corromperlo si realizan casting forzado.
   * @conceptualRisk [GC_PRESSURE][LOW] Generación frecuente de nuevos arrays internos cuando
   * `needsUpdateArray` es true. Se mitiga mediante el sistema de cacheado incremental.
   */
  public getEntities(): ReadonlyArray<Entity> {
    if (this.needsUpdateArray) {
      this.entityArray = Array.from(this.entities).sort((a, b) => a - b);
      this.needsUpdateArray = false;
    }
    return this.entityArray as ReadonlyArray<Entity>;
  }

  /**
   * Devuelve la clave única para esta query basada en los tipos de componentes.
   *
   * @remarks
   * La clave es una cadena separada por comas y ordenada alfabéticamente de los tipos
   * de componentes, buscando que el orden de entrada no genere duplicados.
   */
  public get key(): string {
    return [...this.componentTypes].sort().join(",");
  }

  /**
   * Reconstruye los resultados de la query desde cero.
   * Utilizado durante la restauración del mundo para asegurar la consistencia sin romper referencias.
   *
   * @param allEntities - Conjunto de todas las entidades activas.
   * @param entityComponentSets - Mapa de conjuntos de componentes por entidad.
   *
   * @postcondition {@link Query.entities} refleja el estado actual proporcionado.
   * @postcondition Marca {@link Query.needsUpdateArray} como `true`.
   */
  public rebuild(allEntities: Set<Entity>, entityComponentSets: Map<Entity, Set<string>>): void {
    this.entities.clear();
    allEntities.forEach(entity => {
      const components = entityComponentSets.get(entity);
      if (components && this.matches(components)) {
        this.entities.add(entity);
      }
    });
    this.needsUpdateArray = true;
  }
}
