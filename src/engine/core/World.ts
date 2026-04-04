import { Component, Entity } from "../types/EngineTypes";
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
  private freeEntities: Entity[] = [];

  /**
   * Cache for query results to avoid redundant computations and GC pressure.
   */
  private queryCache = new Map<string, { version: number; entities: Entity[] }>();

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
    const id = this.freeEntities.length > 0 ? this.freeEntities.pop()! : this.nextEntityId++;
    this.entities.add(id);
    this.version++;
    return id;
  }

  /**
   * Removes all registered systems from the world.
   */
  clearSystems(): void {
    this.systems = [];
    this.version++;
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
   * Alias for {@link query} to support the required ECS extension interface.
   */
  getEntitiesWith(...componentTypes: string[]): Entity[] {
    return this.query(...componentTypes);
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
   * Uses a version-based cache to avoid redundant work.
   *
   * @param componentTypes - One or more component types to filter by.
   * @returns An array of {@link Entity} IDs that have all the required components.
   */
  query(...componentTypes: string[]): Entity[] {
    if (componentTypes.length === 0) return [];

    const cacheKey = componentTypes.sort().join(",");
    const cached = this.queryCache.get(cacheKey);

    if (cached && cached.version === this.version) {
      return cached.entities;
    }

    const sortedTypes = this.getSortedTypes(componentTypes);
    const candidates = this.componentIndex.get(sortedTypes[0]);

    if (!candidates || candidates.size === 0) {
      this.queryCache.set(cacheKey, { version: this.version, entities: [] });
      return [];
    }

    const result = this.filterByComponents(candidates, sortedTypes.slice(1));
    this.queryCache.set(cacheKey, { version: this.version, entities: result });
    return result;
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
      this.freeEntities.push(entity);
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
    this.queryCache.clear();
    this.nextEntityId = 1;
    this.freeEntities = [];
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

  /**
   * Retrieves a singleton component from the world.
   * If the component is frozen, it replaces it with a mutable copy.
   *
   * @param type - The component type to retrieve.
   * @returns The component if found, otherwise `undefined`.
   */
  getSingleton<T extends Component>(type: string): T | undefined {
    const [entity] = this.query(type);
    if (entity === undefined) return undefined;

    const component = this.getComponent<T>(entity, type);
    if (!component) return undefined;

    if (Object.isFrozen(component)) {
      const mutableCopy = { ...component };
      this.addComponent(entity, mutableCopy);
      return mutableCopy;
    }

    return component;
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
