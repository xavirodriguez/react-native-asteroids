import { Entity } from "./Entity";

/**
 * ECS Query - Maintains a filtered list of entities that match a specific component signature.
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

  public forEach(callback: (entity: Entity) => void): void {
    this.getEntities().forEach(callback);
  }

  public getEntitiesView(): ReadonlyArray<Entity> {
    return this.getEntities();
  }
}
