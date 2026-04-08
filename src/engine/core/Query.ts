import { Entity } from "../types/EngineTypes";

/**
 * Represents a reactive query that maintains an up-to-date list of entities
 * that match a specific component signature.
 *
 * @remarks
 * Queries are managed by the {@link World} and updated incrementally
 * when entities or components are added or removed.
 */
export class Query {
  private entities: Set<Entity> = new Set();
  private entityArray: Entity[] = [];
  private needsUpdateArray = false;

  /**
   * Creates a new Query for a specific set of components.
   * @param componentTypes - The required component types.
   */
  constructor(public readonly componentTypes: string[]) {}

  /**
   * Checks if an entity should be part of this query based on its components.
   *
   * @param entityComponents - The set of component types the entity currently has.
   * @returns `true` if the entity has ALL required component types.
   */
  public matches(entityComponents: Set<string>): boolean {
    return this.componentTypes.every(type => entityComponents.has(type));
  }

  /**
   * Adds an entity to the query result if it's not already present.
   *
   * @param entity - The entity to add.
   * @postcondition If entity was new, sets {@link Query.needsUpdateArray} to `true`.
   */
  public add(entity: Entity): void {
    if (!this.entities.has(entity)) {
      this.entities.add(entity);
      this.needsUpdateArray = true;
    }
  }

  /**
   * Removes an entity from the query result.
   *
   * @param entity - The entity to remove.
   * @postcondition If entity was present, sets {@link Query.needsUpdateArray} to `true`.
   */
  public remove(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.needsUpdateArray = true;
    }
  }

  /**
   * Returns the list of entities matching the query.
   * Returns a cached array to avoid GC pressure.
   *
   * @returns An array of {@link Entity} IDs.
   *
   * @remarks
   * The returned array is a reference to an internal cache.
   * @conceptualRisk [MUTABLE_CACHE_LEAK] If a caller modifies the returned array, it will corrupt the Query state.
   */
  public getEntities(): Entity[] {
    if (this.needsUpdateArray) {
      this.entityArray = Array.from(this.entities);
      this.needsUpdateArray = false;
    }
    return this.entityArray;
  }

  /**
   * Returns the unique key for this query based on component types.
   *
   * @remarks
   * The key is a sorted, comma-separated string of component types.
   */
  public get key(): string {
    return [...this.componentTypes].sort().join(",");
  }
}
