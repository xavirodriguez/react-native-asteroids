import { Entity } from "../types/EngineTypes";

/**
 * Reactive Query that maintains an updated index of entities with a specific component signature.
 *
 * @responsibility Maintain a filtered and cached list of entities that match a signature.
 * @responsibility Respond reactively to structural changes in the {@link World}.
 * @responsibility Provide efficient access to component-filtered entity groups.
 *
 * @remarks
 * Queries are intended to reduce the need to iterate over all entities every frame.
 * The {@link World} notifies relevant queries when structural changes occur,
 * with the goal of providing efficient access to filtered entity groups.
 *
 * ### Internals: Reactive Indexing
 * The Query system uses a **Reactive Pull-Push** model:
 * 1. **Registration**: When a system calls `world.query('A', 'B')`, the World checks its cache.
 * 2. **Initial Matching**: If new, it performs an O(N_entities) scan to find matches.
 * 3. **Reactive Updates**: When a component is added/removed, the World identifies which
 *    Queries are "interested" based on component types and notifies them.
 * 4. **Lazy Sorting**: Queries maintain an internal `Set` for O(1) membership changes.
 *    The result array is rebuilt and sorted only when accessed after a change.
 *
 * ### Performance Characteristics (Typical):
 * - **Membership Check**: O(1) using internal `Set`.
 * - **Retrieval**: Rebuilding the sorted array takes O(N log N) upon first access after a mutation.
 *   Subsequent accesses to the same view are O(1).
 * - **Memory**: Retains references to active Entity IDs and caches one sorted array.
 *
 * @conceptualRisk [MUTABLE_CACHE_LEAK][MITIGATED] `getEntities()` returns a defensive
 * copy by default to prevent external state corruption.
 *
 * @public
 */
export class Query {
  private entities: Set<Entity> = new Set();
  private entityArray: Entity[] = [];
  private needsUpdateArray = false;

  /**
   * Initializes a query for a specific component signature.
   *
   * @param componentTypes - List of component type discriminators defining the signature.
   *
   * @precondition At least one component type should be provided.
   */
  constructor(public readonly componentTypes: string[]) {}

  /**
   * Checks if an entity's component set matches this query's signature.
   *
   * @param entityComponents - The set of component types currently possessed by the entity.
   * @returns `true` if the entity possesses ALL required component types.
   */
  public matches(entityComponents: Set<string>): boolean {
    return this.componentTypes.every(type => entityComponents.has(type));
  }

  /**
   * Adds an entity to the query result index.
   *
   * @param entity - Entity ID to add.
   *
   * @precondition The entity must match the query's signature.
   * @postcondition If the entity was new, `needsUpdateArray` is marked true.
   */
  public add(entity: Entity): void {
    if (!this.entities.has(entity)) {
      this.entities.add(entity);
      this.needsUpdateArray = true;
    }
  }

  /**
   * Removes an entity from the query result index.
   *
   * @param entity - Entity ID to remove.
   *
   * @postcondition If the entity was present, `needsUpdateArray` is marked true.
   */
  public remove(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.needsUpdateArray = true;
    }
  }

  /**
   * Provides a defensive copy of the entities matching this query's signature.
   *
   * @remarks
   * To help prevent external cache corruption, this method returns a shallow copy of the
   * internal entity array.
   *
   * ### Performance Characteristics:
   * 1. **Deterministic Order**: The returned array is sorted by Entity ID.
   * 2. **Caching**: If the internal Set hasn't changed, the existing sorted array is reused
   *    as the source for the copy.
   *
   * @warning **Dynamic Query Cost**: Avoid calling `world.query()` with different component
   * combinations inside high-frequency loops. Reuse specific query instances when possible.
   *
   * @returns A read-only array of matching {@link Entity} IDs.
   *
   * @conceptualRisk [GC_PRESSURE][HIGH] Every call allocates a new array instance.
   * High-frequency systems should consider `forEach()` or `getEntitiesView()` to minimize
   * per-frame allocations.
   */
  public getEntities(): ReadonlyArray<Entity> {
    if (this.needsUpdateArray) {
      this.entityArray = Array.from(this.entities).sort((a, b) => a - b);
      this.needsUpdateArray = false;
    }
    return [...this.entityArray];
  }

  /**
   * Executes a callback for each entity matching the query.
   *
   * @remarks
   * This is intended as a high-performance alternative to `getEntities()`, as it
   * seeks to avoid defensive array allocations by using the internal cached array.
   *
   * @param callback - Function to execute for each entity.
   */
  public forEach(callback: (entity: Entity) => void): void {
    if (this.needsUpdateArray) {
      this.entityArray = Array.from(this.entities).sort((a, b) => a - b);
      this.needsUpdateArray = false;
    }
    const len = this.entityArray.length;
    for (let i = 0; i < len; i++) {
      callback(this.entityArray[i]);
    }
  }

  /**
   * Provides a read-only view of the internal entities array.
   *
   * @remarks
   * **CAUTION**: Returning the internal array directly avoids allocation but is dangerous
   * if the caller attempts to mutate it. In development mode, the array may be frozen
   * to help detect unauthorized mutations. Use this primarily in performance-critical hot paths.
   *
   * @returns The internal sorted array of matching {@link Entity} IDs.
   */
  public getEntitiesView(): ReadonlyArray<Entity> {
    if (this.needsUpdateArray) {
      this.entityArray = Array.from(this.entities).sort((a, b) => a - b);
      if (__DEV__) {
        Object.freeze(this.entityArray);
      }
      this.needsUpdateArray = false;
    }
    return this.entityArray;
  }

  /**
   * Returns the unique cache key for this query based on component types.
   *
   * @remarks
   * The key is a comma-separated, alphabetically sorted string of component types.
   * This ensures that different orders of input types result in the same query key.
   */
  public get key(): string {
    return [...this.componentTypes].sort().join(",");
  }

  /**
   * Rebuilds query results from scratch.
   *
   * @remarks
   * Primarily used during world restoration or major state resets to ensure
   * consistency without breaking existing {@link Query} references.
   *
   * @param allEntities - Set of all active entities in the world.
   * @param entityComponentSets - Map containing component sets for each entity.
   *
   * @postcondition `entities` Set reflects the provided world state.
   * @postcondition Marks `needsUpdateArray` as true.
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

const __DEV__ = process.env.NODE_ENV !== "production";
