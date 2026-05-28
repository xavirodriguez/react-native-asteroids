import { Entity } from "../types/EngineTypes";
import { ComponentRegistry } from "./Component";

/**
 * Reactive Query that maintains an index of entities with a specific component signature.
 */
export class Query<TComponents extends ComponentRegistry = any> {
  private entities: Set<Entity> = new Set();
  private entityArray: Entity[] = [];
  private needsUpdateArray = false;

  constructor(public readonly componentTypes: string[]) {}

  public matches(entityComponents: Set<string>): boolean {
    return this.componentTypes.every(type => entityComponents.has(type));
  }

  public add(entity: Entity): void {
    if (!this.entities.has(entity)) {
      this.entities.add(entity);
      this.needsUpdateArray = true;
    }
  }

  public remove(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.needsUpdateArray = true;
    }
  }

  public getEntities(): ReadonlyArray<Entity> {
    if (this.needsUpdateArray) {
      this.entityArray = Array.from(this.entities).sort((a, b) => a - b);
      this.needsUpdateArray = false;
    }
    return [...this.entityArray];
  }

  public forEach(callback: (entity: Entity) => void): void {
    if (this.needsUpdateArray) {
      this.entityArray = Array.from(this.entities).sort((a, b) => a - b);
      this.needsUpdateArray = false;
    }
    const len = this.entityArray.length;
    for (let i = 0; i < len; i++) {
      callback(this.entityArray[i]);
    }
  }

  public getEntitiesView(): ReadonlyArray<Entity> {
    if (this.needsUpdateArray) {
      this.entityArray = Array.from(this.entities).sort((a, b) => a - b);
      if (__DEV__) {
        Object.freeze(this.entityArray);
      }
      this.needsUpdateArray = false;
    }
    return this.entityArray;
  }

  public get key(): string {
    return [...this.componentTypes].sort().join(",");
  }

  public rebuild(allEntities: Set<Entity>, entityComponentSets: Map<Entity, Set<string>>): void {
    this.entities.clear();
    allEntities.forEach(entity => {
      const components = entityComponentSets.get(entity);
      if (components && this.matches(components)) {
        this.entities.add(entity);
      }
    });
    this.needsUpdateArray = true;
  }
}

const __DEV__ = process.env.NODE_ENV !== "production";
