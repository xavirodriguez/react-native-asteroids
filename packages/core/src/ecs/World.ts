/**
 * @packageDocumentation
 * Core ECS World implementation.
 */

import { ComponentRegistry, ComponentType, DeepReadonly } from "./Component";
import { Entity } from "./Entity";
import { EventRegistry } from "../events/EventBus";
import { Query } from "./Query";
import { System, SystemPhase, SystemConfig } from "./System";

/**
 * Interface for entity blueprints.
 *
 * @typeParam TComponents - The component registry this blueprint uses.
 * @typeParam TArgs - The arguments required to spawn this blueprint.
 */
export interface BlueprintDefinition<
  TComponents extends ComponentRegistry,
  TArgs
> {
  spawn(world: World<TComponents, EventRegistry, BlueprintRegistryMap<TComponents>>, entity: Entity, args: TArgs): void;
}

/**
 * A map of blueprint definitions.
 */
export type BlueprintRegistryMap<TComponents extends ComponentRegistry> =
  Record<string, BlueprintDefinition<TComponents, any>>;

/**
 * ECS World - Central registry managing the lifecycle of entities, components, and systems.
 *
 * @remarks
 * The World acts as the central hub for the ECS architecture. It is designed to coordinate
 * entity lifecycle, component storage, and system orchestration.
 *
 * Performance and consistency are influenced by the JavaScript environment and adherence
 * to the engine's recommended mutation patterns.
 *
 * @typeParam TComponents - The registry of components available in this world.
 * @typeParam TEvents - The registry of events that can be emitted.
 * @typeParam _TBlueprints - The registry of blueprints that can be spawned.
 */
export class World<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  _TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private activeEntities = new Set<Entity>();
  public isUpdating = false;
  public isReSimulating = false;
  private componentMaps = new Map<string, Map<Entity, unknown>>();
  private componentIndex = new Map<string, Set<Entity>>();
  private entityComponentSets = new Map<Entity, Set<string>>();
  private queries = new Map<string, Query<TComponents>>();
  private queriesByComponent = new Map<string, Set<Query<TComponents>>>();
  private systems: { system: System<TComponents, TEvents>; phase: string; priority: number }[] = [];
  private nextEntityId = 1;
  private freeEntities: Entity[] = [];
  private resources = new Map<string, unknown>();
  private _tick = 0;

  /**
   * The current simulation tick.
   */
  public get tick(): number { return this._tick; }

  /**
   * Creates a new entity.
   *
   * @remarks
   * **Warning**: Avoid calling this directly during system updates if it might
   * invalidate active queries or cause structural desyncs. Use a command buffer
   * for deferred creation when necessary.
   */
  createEntity(): Entity {
    const id = this.freeEntities.length > 0 ? this.freeEntities.pop()! : this.nextEntityId++;
    this.activeEntities.add(id);
    return id;
  }

  /**
   * Removes an entity and all its components.
   *
   * @remarks
   * **Warning**: This method performs immediate structural changes. Calling it
   * during an update cycle may lead to unpredictable behavior in active iterators.
   */
  removeEntity(entity: Entity): void {
    if (this.activeEntities.delete(entity)) {
      this.freeEntities.push(entity);
      this.entityComponentSets.delete(entity);
      this.componentMaps.forEach(map => map.delete(entity));
      this.componentIndex.forEach(set => set.delete(entity));
      this.queries.forEach(query => query.remove(entity));
    }
  }

  /**
   * Adds a component to an entity.
   *
   * @remarks
   * **Warning**: Adding components during a world update may interfere with
   * systems currently iterating over entities. It is generally recommended
   * to use a command buffer for structural changes during the simulation phase.
   */
  addComponent<K extends ComponentType<TComponents>>(entity: Entity, component: TComponents[K]): void {
    const type = component.type;
    if (!this.componentMaps.has(type)) {
      this.componentMaps.set(type, new Map());
      this.componentIndex.set(type, new Set());
    }

    this.componentMaps.get(type)!.set(entity, component);
    this.componentIndex.get(type)!.add(entity);

    let componentSet = this.entityComponentSets.get(entity);
    if (!componentSet) {
      componentSet = new Set();
      this.entityComponentSets.set(entity, componentSet);
    }
    componentSet.add(type);
    this.notifyQueries(entity, componentSet, type);
  }

  /**
   * Gets a read-only reference to a component.
   */
  getComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): DeepReadonly<TComponents[K]> | undefined {
    return this.componentMaps.get(type as string)?.get(entity) as DeepReadonly<TComponents[K]> | undefined;
  }

  /**
   * Gets a mutable reference to a component.
   */
  getMutableComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): TComponents[K] | undefined {
    return this.componentMaps.get(type as string)?.get(entity) as TComponents[K] | undefined;
  }

  /**
   * Removes a component from an entity.
   */
  removeComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): void {
    const map = this.componentMaps.get(type);
    if (map && map.delete(entity)) {
      this.componentIndex.get(type)?.delete(entity);
      const set = this.entityComponentSets.get(entity);
      if (set) {
        set.delete(type);
        this.notifyQueries(entity, set, type);
      }
    }
  }

  /**
   * Safely mutates a component using an updater function.
   */
  mutateComponent<K extends ComponentType<TComponents>>(
    entity: Entity,
    type: K,
    updater: (component: TComponents[K]) => void
  ): boolean {
    const component = this.getMutableComponent(entity, type);
    if (!component) return false;
    updater(component);
    return true;
  }

  /**
   * Retrieves or creates a query for the specified component types.
   */
  getQuery(...componentTypes: ComponentType<TComponents>[]): Query<TComponents> {
    const key = [...componentTypes].sort().join(",");
    let query = this.queries.get(key);
    if (!query) {
      query = new Query<TComponents>(componentTypes);
      this.queries.set(key, query);
      for (const type of componentTypes) {
        if (!this.queriesByComponent.has(type)) this.queriesByComponent.set(type, new Set());
        this.queriesByComponent.get(type)!.add(query);
      }
      this.activeEntities.forEach(entity => {
        const set = this.entityComponentSets.get(entity);
        if (set && query!.matches(set)) query!.add(entity);
      });
    }
    return query;
  }

  /**
   * Returns a list of entities matching the specified component types.
   */
  query(...componentTypes: ComponentType<TComponents>[]): ReadonlyArray<Entity> {
    return this.getQuery(...componentTypes).getEntities();
  }

  private notifyQueries(entity: Entity, componentSet: Set<string>, changedType: string): void {
    const affected = this.queriesByComponent.get(changedType);
    if (affected) {
      affected.forEach(query => {
        if (query.matches(componentSet)) query.add(entity);
        else query.remove(entity);
      });
    }
  }

  /**
   * Registers a system in the world.
   */
  addSystem(system: System<TComponents, TEvents>, config: SystemConfig = {}): void {
    this.systems.push({
      system,
      phase: config.phase ?? SystemPhase.Simulation,
      priority: config.priority ?? 0
    });
    system.onRegister(this);
  }

  /**
   * Orchestrates a simulation tick by executing registered systems in their defined phases.
   *
   * @remarks
   * Updates are processed in a fixed order of phases: Input, Simulation, Transform,
   * Collision, GameRules, and Presentation. Priority within each phase determines
   * the execution order of systems.
   */
  update(deltaTime: number): void {
    this._tick++;
    this.isUpdating = true;
    try {
      const phases = [
        SystemPhase.Input,
        SystemPhase.Simulation,
        SystemPhase.Transform,
        SystemPhase.Collision,
        SystemPhase.GameRules,
        SystemPhase.Presentation
      ];

      for (const phase of phases) {
        const systems = this.systems
          .filter(s => s.phase === phase)
          .sort((a, b) => b.priority - a.priority);

        for (const reg of systems) {
          reg.system.update(this, deltaTime);
        }
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Locates the first component of a given type.
   */
  getSingleton<K extends ComponentType<TComponents>>(type: K): DeepReadonly<TComponents[K]> | undefined {
    const entities = this.query(type);
    if (entities.length === 0) return undefined;
    return this.getComponent(entities[0], type);
  }

  /**
   * Registers a global resource.
   */
  setResource<T>(name: string, resource: T): void {
    this.resources.set(name, resource);
  }

  /**
   * Retrieves a global resource.
   */
  getResource<T>(name: string): T | undefined {
    return this.resources.get(name) as T;
  }
}
