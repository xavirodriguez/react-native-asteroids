import { Entity } from "./Entity";
import { ComponentRegistry } from "./Component";

export class Query<TComponents extends ComponentRegistry = ComponentRegistry> {
  private entities: Set<Entity> = new Set();
  private sortedEntities: Entity[] = [];
  private isDirty = false;

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
