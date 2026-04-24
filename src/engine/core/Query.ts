import { Entity } from "../types/EngineTypes";

/**
 * Vista de solo lectura e iterable sobre los resultados de una {@link Query}.
 *
 * @responsibility Proporcionar acceso seguro a las entidades sin exponer el array interno.
 * @responsibility Implementar el protocolo iterable para su uso en bucles `for...of`.
 */
export class QueryView implements Iterable<Entity> {
  constructor(private query: Query) {}

  /**
   * Devuelve un iterador sobre las entidades que coinciden con la query.
   */
  [Symbol.iterator](): Iterator<Entity> {
    return this.query.getEntities()[Symbol.iterator]();
  }

  /**
   * Devuelve el número de entidades que coinciden con la query.
   */
  public get length(): number {
    return this.query.getEntities().length;
  }

  /**
   * Devuelve la entidad en el índice especificado.
   */
  public at(index: number): Entity | undefined {
    return this.query.getEntities()[index];
  }

  /**
   * Ejecuta una función para cada entidad en la vista.
   */
  public forEach(callback: (entity: Entity) => void): void {
    this.query.getEntities().forEach(callback);
  }

  /**
   * Devuelve un array con los resultados de aplicar una función a cada entidad.
   */
  public map<T>(callback: (entity: Entity) => T): T[] {
    return this.query.getEntities().map(callback);
  }

  /**
   * Comprueba si la vista está vacía.
   */
  public get isEmpty(): boolean {
    return this.query.getEntities().length === 0;
  }
}

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
 */
export class Query {
  private entities: Set<Entity> = new Set();
  private entityArray: Entity[] = [];
  private needsUpdateArray = false;
  private view: QueryView;

  /**
   * Inicializa una query para una firma de componentes determinada.
   *
   * @param componentTypes - Lista de tipos de componentes que definen la firma.
   *
   * @precondition Debe proporcionarse al menos un tipo de componente.
   */
  constructor(public readonly componentTypes: string[]) {
    this.view = new QueryView(this);
  }

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
   * @internal Use {@link Query.getView} for public access.
   *
   * @returns Un array de solo lectura de IDs de {@link Entity}.
   */
  public getEntities(): ReadonlyArray<Entity> {
    if (this.needsUpdateArray) {
      this.entityArray = Array.from(this.entities).sort((a, b) => a - b);
      this.needsUpdateArray = false;
    }
    return this.entityArray as ReadonlyArray<Entity>;
  }

  /**
   * Devuelve una vista segura y eficiente de los resultados de la query.
   */
  public getView(): QueryView {
    return this.view;
  }

  /**
   * Devuelve la clave única para esta query basada en los tipos de componentes.
   */
  public get key(): string {
    return [...this.componentTypes].sort().join(",");
  }

  /**
   * Reconstruye los resultados de la query desde cero.
   *
   * @param allEntities - Conjunto de todas las entidades activas.
   * @param entityComponentSets - Mapa de conjuntos de componentes por entidad.
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
