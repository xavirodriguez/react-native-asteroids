import { ComponentRegistry, ComponentType } from "./Component";
import { Entity } from "./Entity";

export class Query<TComponents extends ComponentRegistry = ComponentRegistry> {
  private entities = new Set<Entity>();
  private cache: Entity[] = [];
  private cacheDirty = true;

  constructor(private componentTypes: ComponentType<TComponents>[]) {}

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
