import { Entity } from "../types/EngineTypes";

/**
 * Reactive Query that maintains an updated index of entities with a specific component signature.
 *
 * @responsibility Maintain a filtered and cached list of entities that match a signature.
 * @responsibility Respond reactively to structural changes in the {@link World}.
 * @responsibility Provide efficient access to component-filtered entity groups.
 *
 * @remarks
 * Queries significantly reduce the need to iterate over all entities every frame.
 * The {@link World} notifies relevant queries when structural changes occur,
 * enabling O(1) or O(N_matching) access to relevant entities.
 *
 * @conceptualRisk [MUTABLE_CACHE_LEAK][MITIGATED] `getEntities()` returns a defensive
 * copy to prevent external state corruption.
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
   * @postcondition If the entity was new, {@link needsUpdateArray} is marked true.
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
   * @postcondition If the entity was present, {@link needsUpdateArray} is marked true.
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
   * To prevent external cache corruption, this method returns a shallow copy of the
   * internal entity array. This ensures that callers cannot mutate the query's
   * state by casting the result.
   *
   * ### Performance Invariants:
   * 1. **Deterministic Order**: The returned array is always sorted by Entity ID.
   * 2. **Caching**: If the internal Set hasn't changed, the existing sorted array is reused.
   *
   * @warning **Dynamic Query Cost**: Avoid calling `world.query()` with new arrays inside loops.
   * Reuse specific query instances to benefit from persistent caching.
   *
   * @returns A read-only array of matching {@link Entity} IDs.
   *
   * @conceptualRisk [GC_PRESSURE][MEDIUM] Every call allocates a new array instance.
   * High-frequency systems should consider local result caching if `world.structureVersion`
   * remains unchanged.
   */
  public getEntities(): ReadonlyArray<Entity> {
    if (this.needsUpdateArray) {
      this.entityArray = Array.from(this.entities).sort((a, b) => a - b);
      this.needsUpdateArray = false;
    }
    return [...this.entityArray];
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
   * @postcondition {@link entities} Set reflects the provided world state.
   * @postcondition Marks {@link needsUpdateArray} as true.
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
