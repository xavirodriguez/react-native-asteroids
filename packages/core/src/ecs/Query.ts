import { Entity } from "./Entity";
import { ComponentRegistry } from "./Component";

/**
 * Represents a cached collection of entities that match a specific set of component types.
 *
 * @remarks
 * Queries are automatically updated by the {@link World} when components are added or
 * removed from entities.
 */
export class Query<TComponents extends ComponentRegistry = ComponentRegistry> {
  private entities: Set<Entity> = new Set();
  private sortedEntities: Entity[] = [];
  private isDirty = false;

  /**
   * @param componentTypes - The required component types for an entity to match this query.
   */
  constructor(public readonly componentTypes: string[]) {}

  matches(entityComponentSet: Set<string>): boolean {
    for (const type of this.componentTypes) {
      if (!entityComponentSet.has(type)) return false;
    }
    return true;
  }

  add(entity: Entity): void {
    if (!this.entities.has(entity)) {
      this.entities.add(entity);
      this.isDirty = true;
    }
  }

  remove(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.isDirty = true;
    }
  }

  /**
   * Returns a list of entities matching the query.
   *
   * @remarks
   * The list is lazily updated and sorted by entity ID to help maintain stable iteration.
   *
   * @performance
   * Rebuilding the sorted list has a cost of O(N log N) where N is the number of matching entities,
   * but it only occurs when the matching set has changed since the last call.
   */
  getEntities(): ReadonlyArray<Entity> {
    if (this.isDirty) {
      this.sortedEntities = Array.from(this.entities).sort((a, b) => a - b);
      this.isDirty = false;
    }
    return this.sortedEntities;
  }

  forEach(callback: (entity: Entity) => void): void {
    this.getEntities().forEach(callback);
  }

  rebuild(activeEntities: Set<Entity>, entityComponentSets: Map<Entity, Set<string>>): void {
    this.entities.clear();
    activeEntities.forEach(entity => {
      const set = entityComponentSets.get(entity);
      if (set && this.matches(set)) {
        this.entities.add(entity);
      }
    });
    this.isDirty = true;
  }
}
