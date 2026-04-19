import { Entity } from "../types/EngineTypes";

/**
 * Consulta reactiva que mantiene un índice actualizado de entidades con una firma de
 * componentes específica.
 *
 * @responsibility Mantener una lista filtrada y cacheada de entidades que cumplen una firma.
 * @responsibility Responder de forma reactiva a cambios estructurales en el World.
 * @responsibility Proporcionar acceso de alto rendimiento O(1) a grupos de entidades.
 *
 * @remarks
 * Las queries eliminan la necesidad de iterar sobre todas las entidades del mundo en cada frame.
 * El {@link World} notifica a las queries relevantes solo cuando hay cambios estructurales
 * (add/remove componente), permitiendo una complejidad O(1) para obtener entidades activas.
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
   * Devuelve la lista de entidades que coinciden con la query.
   * Devuelve un array cacheado para minimizar la presión del GC.
   *
   * @remarks
   * El array devuelto es una referencia a un caché interno por razones de rendimiento.
   * Se devuelve como `ReadonlyArray` para señalizar que NO debe ser modificado.
   *
   * @returns Un array de solo lectura de IDs de {@link Entity}.
   *
   * @precondition No se debe realizar casting de este array a uno mutable ni utilizar métodos in-place (sort, push).
   * @postcondition El array devuelto refleja el estado actual del {@link World} para esta firma.
   * @postcondition Las entidades en el array están siempre ordenadas por ID de forma ascendente.
   *
   * @conceptualRisk [MUTABLE_CACHE_LEAK][MEDIUM] Si un consumidor rompe el contrato de solo lectura
   * mediante casting forzado, corromperá el estado interno de la Query y de todos los sistemas dependientes.
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
   * de componentes, garantizando que el orden de entrada no genere duplicados.
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
