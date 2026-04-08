import { Entity } from "../types/EngineTypes";

/**
 * Represents a reactive query that maintains an up-to-date list of entities
 * that match a specific component signature.
 */
export class Query {
  private entities: Set<Entity> = new Set();
  private entityArray: Entity[] = [];
  private needsUpdateArray = false;

  constructor(public readonly componentTypes: string[]) {}

  /**
   * Checks if an entity should be part of this query.
   */
  public matches(entityComponents: Set<string>): boolean {
    return this.componentTypes.every(type => entityComponents.has(type));
  }

  /**
   * Adds an entity to the query result if it's not already present.
   */
  public add(entity: Entity): void {
    if (!this.entities.has(entity)) {
      this.entities.add(entity);
      this.needsUpdateArray = true;
    }
  }

  /**
   * Removes an entity from the query result.
   */
  public remove(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.needsUpdateArray = true;
    }
  }

  /**
   * Returns the list of entities matching the query.
   * Returns a cached array to avoid GC pressure.
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
   */
  public get key(): string {
    return [...this.componentTypes].sort().join(",");
  }
}
