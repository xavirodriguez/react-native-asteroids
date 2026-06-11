import { Entity } from "./Entity";

/**
 * ECS Query - Maintains a filtered list of entities that match a specific component signature.
 *
 * @remarks
 * Queries are updated by the {@link World} when components are added
 * or removed from entities. The entity list is lazily sorted by ID to help support
 * stable iteration order when the set of matching entities is the same.
 */
export class Query<_TComponents extends Record<string, any> = Record<string, any>> {
  private entities = new Set<Entity>();
  private entitiesCache: Entity[] = [];
  private cacheDirty = true;
  private readonly componentTypes: string[];

  constructor(componentTypes: string[]) {
    this.componentTypes = componentTypes;
  }

  /**
   * Checks if an entity matches the query's signature.
   */
  matches(entityComponentSet: Set<string>): boolean {
    for (let i = 0; i < this.componentTypes.length; i++) {
      if (!entityComponentSet.has(this.componentTypes[i])) return false;
    }
    return true;
  }

  /**
   * Adds an entity to the query if it matches.
   * @internal
   */
  add(entity: Entity): void {
    if (!this.entities.has(entity)) {
      this.entities.add(entity);
      this.cacheDirty = true;
    }
  }

  /**
   * Removes an entity from the query.
   * @internal
   */
  remove(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.cacheDirty = true;
    }
  }

  /**
   * Returns a read-only list of entities matching the query.
   *
   * @remarks
   * The returned array is a cached version that is rebuilt only when the
   * query's matching entity set changes.
   */
  getEntities(): ReadonlyArray<Entity> {
    if (this.cacheDirty) {
      this.entitiesCache = Array.from(this.entities).sort((a, b) => a - b);
      this.cacheDirty = false;
    }
    return this.entitiesCache;
  }

  /**
   * Rebuilds the entity list from scratch.
   * @internal
   */
  rebuild(allEntities: Set<Entity>, entityComponentSets: Map<Entity, Set<string>>): void {
    this.entities.clear();
    allEntities.forEach(entity => {
      const set = entityComponentSets.get(entity);
      if (set && this.matches(set)) {
        this.entities.add(entity);
      }
    });
    this.cacheDirty = true;
  }

  /**
   * Iterates over all entities matching the query.
   *
   * @warning **Structural Mutations**: Performing direct structural mutations on the
   * {@link World} (like removing the current entity or adding/removing components)
   * during iteration is discouraged, as it may lead to inconsistent results, skipped
   * entities, or invalid iterator states. The world's command buffer is recommended
   * for deferred, consistent mutations.
   */
  public forEach(callback: (entity: Entity) => void): void {
    this.getEntities().forEach(callback);
  }

  public getEntitiesView(): ReadonlyArray<Entity> {
    return this.getEntities();
  }
}
