import { Component } from "./Component";
import { Entity } from "./Entity";
import { System } from "./System";

/**
 * ECS World class that manages the lifecycle of entities, components, and systems.
 */
export class World {
  private entities = new Set<Entity>();
  private components = new Map<string, Map<Entity, Component>>();
  private componentIndex = new Map<string, Set<Entity>>();
  private systems: System[] = [];
  private nextEntityId = 1;
  /**
   * Current version of the world structure.
   * Incremented whenever an entity or component is added or removed.
   */
  public version = 0;

  /**
   * Creates a new unique entity in the world.
   *
   * @returns The newly created {@link Entity} ID.
   */
  createEntity(): Entity {
    const id = this.nextEntityId++;
    this.entities.add(id);
    this.version++;
    return id;
  }

  /**
   * Attaches a component to an entity.
   * If the entity already has a component of this type, it will be overwritten.
   *
   * @param entity - The entity to attach the component to.
   * @param component - The component instance to attach.
   */
  addComponent<T extends Component>(entity: Entity, component: T): void {
    const type = component.type;

    this.ensureComponentStorage(type);

    this.components.get(type)?.set(entity, component);
    this.componentIndex.get(type)?.add(entity);
    this.version++;
  }

  /**
   * Retrieves a component of a specific type from an entity.
   *
   * @param entity - The entity to get the component from.
   * @param type - The type of the component to retrieve.
   * @returns The component instance if found, otherwise `undefined`.
   */
  getComponent<T extends Component>(entity: Entity, type: string): T | undefined {
    return this.components.get(type)?.get(entity) as T;
  }

  /**
   * Checks if an entity has a component of a specific type.
   *
   * @param entity - The entity to check.
   * @param type - The component type to look for.
   * @returns `true` if the entity has the component, otherwise `false`.
   */
  hasComponent(entity: Entity, type: string): boolean {
    return this.componentIndex.get(type)?.has(entity) ?? false;
  }

  /**
   * Removes a component of a specific type from an entity.
   *
   * @param entity - The entity to remove the component from.
   * @param type - The type of the component to remove.
   */
  removeComponent(entity: Entity, type: string): void {
    const componentMap = this.components.get(type);
    if (componentMap && componentMap.delete(entity)) {
      this.componentIndex.get(type)?.delete(entity)
      this.version++;
    }
  }

  /**
   * Queries entities that possess all of the specified component types.
   *
   * @param componentTypes - One or more component types to filter by.
   * @returns An array of {@link Entity} IDs that have all the required components.
   */
  query(...componentTypes: string[]): Entity[] {
    if (componentTypes.length === 0) return [];

    const sortedTypes = this.getSortedTypes(componentTypes);
    const candidates = this.componentIndex.get(sortedTypes[0]);

    if (!candidates || candidates.size === 0) {
      return [];
    }

    return this.filterByComponents(candidates, sortedTypes.slice(1));
  }

  /**
   * Removes an entity and all of its attached components from the world.
   *
   * @param entity - The entity to remove.
   */
  removeEntity(entity: Entity): void {
    this.components.forEach((componentMap, type) => {
      if (componentMap.delete(entity)) {
        this.componentIndex.get(type)?.delete(entity);
      }
    });

    if (this.entities.delete(entity)) {
      this.version++;
    }
  }

  /**
   * Resets the entire world, removing all entities and components.
   * Systems remain registered.
   */
  clear(): void {
    this.entities.clear();
    this.components.clear();
    this.componentIndex.clear();
    this.version++;
  }

  /**
   * Registers a system to be updated by the world.
   *
   * @param system - The {@link System} instance to add.
   */
  addSystem(system: System): void {
    this.systems.push(system);
  }

  /**
   * Updates all registered systems in the order they were added.
   *
   * @param deltaTime - Time elapsed since the last update in milliseconds.
   */
  update(deltaTime: number): void {
    this.systems.forEach((system) => system.update(this, deltaTime));
  }

  /**
   * Returns a list of all active entities currently in the world.
   *
   * @returns An array of all {@link Entity} IDs.
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities);
  }

  private filterByComponents(entities: Set<Entity>, types: string[]): Entity[] {
    return Array.from(entities).filter((entity) =>
      types.every((type) => this.componentIndex.get(type)?.has(entity)),
    );
  }

  private getSortedTypes(types: string[]): string[] {
    return [...types].sort((a, b) => {
      const countA = this.componentIndex.get(a)?.size ?? 0;
      const countB = this.componentIndex.get(b)?.size ?? 0;
      return countA - countB;
    });
  }

  private ensureComponentStorage(type: string): void {
    if (!this.components.has(type)) {
      this.components.set(type, new Map());
      this.componentIndex.set(type, new Set());
    }
  }
}
