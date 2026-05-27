import { Entity } from "../types/EngineTypes";

/**
 * Reactive Query that maintains an index of entities with a specific component signature.
 *
 * @remarks
 * Queries are intended to reduce the overhead of iterating over all entities by maintaining
 * a filtered cache. The {@link World} notifies relevant queries when structural changes occur.
 *
 * ### Internals: Reactive Indexing
 * The Query system is designed to follow these steps:
 * 1. **Registration**: The World checks for an existing query matching the component signature.
 * 2. **Initial Matching**: If new, it performs a scan of active entities to find matches.
 * 3. **Reactive Updates**: When components are added or removed, the World notifies
 *    interested Queries to update their internal indices.
 * 4. **Lazy Sorting**: Queries use an internal `Set` for membership changes.
 *    The result array is typically rebuilt and sorted upon the first access after a change.
 *
 * ### Performance Characteristics:
 * - **Membership Check**: Generally O(1) using an internal `Set`.
 * - **Retrieval**: Rebuilding the sorted array is O(N log N) upon the first access after
 *   a structural mutation. Subsequent accesses to the same view are O(1).
 * - **Memory**: Retains references to matching Entity IDs and caches one sorted array.
 *
 * @conceptualRisk [MUTABLE_CACHE_LEAK] `getEntities()` returns a shallow copy to
 * help prevent external state corruption, which incurs an allocation cost.
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
   * @remarks
   * Expected to be called by the {@link World} when an entity matches the query's signature.
   * If the entity was new to this query, `needsUpdateArray` is marked true.
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
   * @remarks
   * Expected to be called by the {@link World} when an entity no longer matches the signature.
   * If the entity was present, `needsUpdateArray` is marked true.
   */
  public remove(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.needsUpdateArray = true;
    }
  }

  /**
   * Provides a shallow copy of the entities matching this query's signature.
   *
   * @remarks
   * This method returns a copy of the internal entity array to help prevent external
   * cache corruption.
   *
   * ### Performance Considerations:
   * 1. **Deterministic Order**: The returned array is sorted by Entity ID.
   * 2. **Caching**: If the internal state hasn't changed, the existing sorted array is reused
   *    as the source for the copy.
   *
   * @warning **Dynamic Query Cost**: Frequent calls to `world.query()` with varying component
   * signatures inside hot loops may impact performance. Reusing query instances is
   * recommended.
   *
   * @returns A read-only array of matching {@link Entity} IDs.
   *
   * @conceptualRisk [GC_PRESSURE] Frequent calls allocate new array instances.
   * In performance-critical loops, `forEach()` or `getEntitiesView()` are typically
   * preferred to help minimize per-frame allocations.
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
   * This is a high-performance alternative to `getEntities()` that minimizes per-frame
   * allocations by iterating over the internal cached array.
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
   * Primarily used during world restoration or major state resets to help ensure
   * consistency without breaking existing {@link Query} references.
   *
   * @param allEntities - Set of all active entities in the world.
   * @param entityComponentSets - Map containing component sets for each entity.
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
