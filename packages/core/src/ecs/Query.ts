import { Entity } from "./Entity";
import { ComponentRegistry } from "./Component";

/**
 * A Query provides a filtered view of entities that possess a specific set of components.
 *
 * @remarks
 * Queries are automatically updated by the {@link World} when components are added or removed.
 * They maintain a sorted list of entities to support stable iteration.
 *
 * @typeParam TComponents - The component registry this query operates on.
 */
export class Query<TComponents extends ComponentRegistry> {
  private entities: Set<Entity> = new Set();
  private sortedEntities: Entity[] = [];
  private isDirty = false;

  /**
   * @internal
   * @param componentTypes - The list of component types required by this query.
   */
  constructor(private componentTypes: string[]) {}

  /**
   * Checks if a set of component types matches the query's requirements.
   */
  public matches(componentSet: Set<string>): boolean {
    return this.componentTypes.every(type => componentSet.has(type));
  }

  public add(entity: Entity): void {
    if (!this.entities.has(entity)) {
      this.entities.add(entity);
      this.isDirty = true;
    }
  }

  public remove(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.isDirty = true;
    }
  }

  /**
   * Returns a sorted list of entities that match the query.
   *
   * @remarks
   * Sorting happens lazily when the query is dirty (i.e., after entities are added or removed).
   * The list is sorted by entity ID, which provides a stable iteration order across frames
   * as long as the world state remains consistent.
   */
  public getEntities(): ReadonlyArray<Entity> {
    if (this.isDirty) {
      this.sortedEntities = Array.from(this.entities).sort((a, b) => a - b);
      this.isDirty = false;
    }
    return this.sortedEntities;
  }

  public rebuild(activeEntities: Set<Entity>, entityComponentSets: Map<Entity, Set<string>>): void {
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
