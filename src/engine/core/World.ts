import { Component, Entity } from "../types/EngineTypes";
import { System, SystemConfig, SystemPhase } from "./System";
import { Query } from "./Query";
import { SystemProfiler } from "../debug/SystemProfiler";

interface RegisteredSystem {
  system: System;
  phase: string;
  priority: number;
}

/**
 * ECS World class that manages the lifecycle of entities, components, and systems.
 */
export class World {
  private activeEntities = new Set<Entity>();
  private componentMaps = new Map<string, Map<Entity, Component>>();
  private componentIndex = new Map<string, Set<Entity>>();
  private entityComponentSets = new Map<Entity, Set<string>>();
  private queries = new Map<string, Query>();
  private queriesByComponent = new Map<string, Set<Query>>();
  private systems: RegisteredSystem[] = [];
  private sortedSystems: System[] = [];
  private systemsNeedSorting = false;
  private profilers: Map<System, SystemProfiler> = new Map();
  public debugMode = false;
  private nextEntityId = 1;
  private freeEntities: Entity[] = [];
  private resources = new Map<string, any>();

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
    this.activeEntities.add(id);
    this.version++;
    return id;
  }

  /**
   * Removes all registered systems from the world.
   */
  clearSystems(): void {
    this.systems = [];
    this.sortedSystems = [];
    this.systemsNeedSorting = false;
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

    // Principle 2: Strong Invariants - Normalizar en addNode (addComponent en ECS)
    if (type === "Transform") {
      const transform = component as any;
      if (transform.parent !== undefined) {
        if (!this.activeEntities.has(transform.parent)) {
          if (__DEV__) {
            console.warn(`Hierarchy Invariant Violation: Entity ${entity} has parent ${transform.parent} but parent does not exist in world.`);
          }
          transform.parent = undefined; // Normalizar SIEMPRE
        } else if (transform.parent === entity) {
          throw new Error(`Hierarchy Invariant Violation: Entity ${entity} cannot be its own parent.`);
        }
      }
    }

    this.ensureComponentStorage(type);

    const isNew = !this.componentIndex.get(type)?.has(entity);
    this.componentMaps.get(type)?.set(entity, component);
    this.componentIndex.get(type)?.add(entity);

    if (isNew) {
      let componentSet = this.entityComponentSets.get(entity);
      if (!componentSet) {
        componentSet = new Set();
        this.entityComponentSets.set(entity, componentSet);
      }
      componentSet.add(type);
      this.notifyQueries(entity, componentSet, type);
    }

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
    return this.componentMaps.get(type)?.get(entity) as T;
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
    const componentMap = this.componentMaps.get(type);
    if (componentMap && componentMap.delete(entity)) {
      this.componentIndex.get(type)?.delete(entity);
      const componentSet = this.entityComponentSets.get(entity);
      if (componentSet) {
        componentSet.delete(type);
        this.notifyQueries(entity, componentSet, type);
      }
      this.version++;
    }
  }

  /**
   * Queries entities that possess all of the specified component types.
   * Uses live queries to avoid redundant work.
   *
   * @param componentTypes - One or more component types to filter by.
   * @returns An array of {@link Entity} IDs that have all the required components.
   */
  query(...componentTypes: string[]): Entity[] {
    if (componentTypes.length === 0) return [];

    // Optimization: avoid sort/join for single component queries
    const key = componentTypes.length === 1 ? componentTypes[0] : [...componentTypes].sort().join(",");
    let query = this.queries.get(key);

    if (!query) {
      query = new Query(componentTypes);
      this.queries.set(key, query);

      // Index the query by its component types for fast notification
      for (const type of componentTypes) {
        let set = this.queriesByComponent.get(type);
        if (!set) {
          set = new Set();
          this.queriesByComponent.set(type, set);
        }
        set.add(query);
      }

      // Initialize query with existing entities
      this.activeEntities.forEach(entity => {
        const componentSet = this.entityComponentSets.get(entity);
        if (componentSet && query!.matches(componentSet)) {
          query!.add(entity);
        }
      });
    }

    return query.getEntities();
  }

  /**
   * Removes an entity and all of its attached components from the world.
   *
   * @param entity - The entity to remove.
   */
  removeEntity(entity: Entity): void {
    this.removeEntityFromComponentMaps(entity);
    this.entityComponentSets.delete(entity);
    this.queries.forEach(query => query.remove(entity));

    if (this.activeEntities.delete(entity)) {
      this.freeEntities.push(entity);
      this.version++;
    }
  }

  /**
   * Resets the entire world, removing all entities, components and resources.
   * Systems remain registered.
   */
  clear(): void {
    this.activeEntities.clear();
    this.componentMaps.clear();
    this.componentIndex.clear();
    this.entityComponentSets.clear();
    this.queries.clear();
    this.queriesByComponent.clear();
    this.resources.clear();
    this.version++;
  }

  /**
   * Sets a global resource in the world.
   */
  setResource<T>(name: string, resource: T): void {
    this.resources.set(name, resource);
  }

  /**
   * Retrieves a global resource by name.
   */
  getResource<T>(name: string): T | undefined {
    return this.resources.get(name) as T;
  }

  /**
   * Checks if a resource exists.
   */
  hasResource(name: string): boolean {
    return this.resources.has(name);
  }

  /**
   * Removes a resource from the world.
   */
  removeResource(name: string): void {
    this.resources.delete(name);
  }

  /**
   * Registers a system to be updated by the world.
   *
   * @param system - The {@link System} instance to add.
   * @param config - Optional configuration for phase and priority.
   */
  addSystem(system: System, config: SystemConfig = {}): void {
    const phase = config.phase ?? SystemPhase.Simulation;
    const priority = config.priority ?? 0;

    this.systems.push({ system, phase, priority });
    this.systemsNeedSorting = true;
  }

  /**
   * Updates all registered systems ordered by phase and priority.
   *
   * @param deltaTime - Time elapsed since the last update in milliseconds.
   */
  update(deltaTime: number): void {
    if (this.systemsNeedSorting) {
      this.sortSystems();
    }
    this.sortedSystems.forEach((system) => {
      if (this.debugMode) {
        let profiler = this.profilers.get(system);
        if (!profiler) {
          profiler = new SystemProfiler(system);
          this.profilers.set(system, profiler);
        }
        profiler.update(this, deltaTime);
      } else {
        system.update(this, deltaTime);
      }
    });
  }

  /**
   * Returns the average execution time for a system if profiling is enabled.
   */
  getSystemTiming(system: System): number {
    return this.profilers.get(system)?.getAverageTime() ?? 0;
  }

  /**
   * Returns all system timings.
   */
  getAllSystemTimings(): Record<string, number> {
    const timings: Record<string, number> = {};
    this.sortedSystems.forEach(system => {
      timings[system.constructor.name] = this.getSystemTiming(system);
    });
    return timings;
  }

  private sortSystems(): void {
    const phaseOrder: Record<string, number> = {
      [SystemPhase.Input]: 0,
      [SystemPhase.Simulation]: 1,
      [SystemPhase.Collision]: 2,
      [SystemPhase.GameRules]: 3,
      [SystemPhase.Presentation]: 4,
    };

    const getPhaseWeight = (phase: string) => phaseOrder[phase] ?? 999;

    this.systems.sort((a, b) => {
      const weightA = getPhaseWeight(a.phase);
      const weightB = getPhaseWeight(b.phase);

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      return b.priority - a.priority; // Higher priority first
    });

    this.sortedSystems = this.systems.map((s) => s.system);
    this.systemsNeedSorting = false;
  }

  /**
   * Returns a list of all active entities currently in the world.
   *
   * @returns An array of all {@link Entity} IDs.
   */
  getAllEntities(): Entity[] {
    return Array.from(this.activeEntities);
  }

  /**
   * Returns all component types attached to an entity.
   */
  getEntityComponentTypes(entity: Entity): string[] {
    const set = this.entityComponentSets.get(entity);
    return set ? Array.from(set) : [];
  }

  private notifyQueries(entity: Entity, componentSet: Set<string>, changedType?: string): void {
    // If we know which component changed, only notify queries that care about it.
    // Otherwise (entity removal), notify all queries that were tracking the entity.
    const queriesToNotify = changedType
      ? (this.queriesByComponent.get(changedType) || [])
      : this.queries.values();

    for (const query of queriesToNotify) {
      if (query.matches(componentSet)) {
        query.add(entity);
      } else {
        query.remove(entity);
      }
    }
  }

  private removeEntityFromComponentMaps(entity: Entity): void {
    this.componentMaps.forEach((componentMap, type) => {
      if (componentMap.delete(entity)) {
        this.componentIndex.get(type)?.delete(entity);
      }
    });
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

  private ensureComponentStorage(type: string): void {
    if (!this.componentMaps.has(type)) {
      this.componentMaps.set(type, new Map());
      this.componentIndex.set(type, new Set());
    }
  }
}

// Global helper for development mode
const __DEV__ = process.env.NODE_ENV !== "production";
