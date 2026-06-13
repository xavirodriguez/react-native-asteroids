import { Entity } from "./Entity";
import { ComponentRegistry } from "./Component";

export class Query<TComponents extends ComponentRegistry> {
  private entities: Set<Entity> = new Set();
  private sortedEntities: Entity[] = [];
  private isDirty = false;

  constructor(private componentTypes: string[]) {}

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
