import { ComponentRegistry, ComponentType } from "./Component";
import { Entity } from "./Entity";

/**
 * Represents a collection of entities that possess a specific set of components.
 *
 * @remarks
 * Queries are the primary mechanism for systems to iterate over entities of interest.
 * They maintain an internal cache that is updated when entities or components are
 * added or removed from the world.
 */
export class Query<TComponents extends ComponentRegistry = ComponentRegistry> {
  private entities = new Set<Entity>();
  private cache: Entity[] = [];
  private cacheDirty = true;

  constructor(private componentTypes: ComponentType<TComponents>[]) {}

  /**
   * Returns a read-only list of entities matching this query.
   *
   * @remarks
   * The returned array is sorted by entity ID to help support stable iteration orders,
   * though true determinism depends on the caller avoiding non-deterministic logic
   * during iteration.
   */
  getEntities(): ReadonlyArray<Entity> {
    if (this.cacheDirty) {
      this.cache = Array.from(this.entities).sort((a, b) => a - b);
      this.cacheDirty = false;
    }
    return this.cache;
  }

  matches(entityComponentSet: Set<string>): boolean {
    return this.componentTypes.every(type => entityComponentSet.has(type));
  }

  add(entity: Entity): void {
    if (!this.entities.has(entity)) {
      this.entities.add(entity);
      this.cacheDirty = true;
    }
  }

  remove(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.cacheDirty = true;
    }
  }

  rebuild(activeEntities: Set<Entity>, entityComponentSets: Map<Entity, Set<string>>): void {
    this.entities.clear();
    activeEntities.forEach(entity => {
      const set = entityComponentSets.get(entity);
      if (set && this.matches(set)) {
        this.entities.add(entity);
      }
    });
    this.cacheDirty = true;
  }
}
