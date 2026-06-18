import { ComponentRegistry, ComponentType } from "./Component";
import { Entity } from "./Entity";
import { EventRegistry, EventBus } from "../events/EventBus";
import { Query } from "./Query";
import { System, SystemPhase, SystemConfig } from "./System";
import { RandomService } from "../utils/RandomService";
import { WorldSnapshot } from "../snapshots/WorldSnapshot";
import { SnapshotSerializer } from "../snapshots/SnapshotSerializer";
import { SnapshotRestore } from "../snapshots/SnapshotRestore";
import { WorldCommandBuffer } from "./WorldCommandBuffer";
import { BlueprintDefinition } from "./BlueprintRegistry";

/**
 * Map type for blueprint definitions.
 */
export type BlueprintRegistryMap<
  TComponents extends ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> = Record<string, BlueprintDefinition<TComponents, TEvents, any>>;

/**
 * The World acts as the central container for an ECS (Entity Component System) simulation.
 * It manages entities, components, systems, and resources.
 *
 * @remarks
 * This implementation is designed to support reproducible simulations when provided with consistent
 * initial states and stable inputs. It aims to minimize non-deterministic factors; however,
 * bit-for-bit determinism depends on external constraints and can be affected by:
 * - Floating-point precision differences across different JS engines, WASM runtimes, or platforms.
 * - Non-deterministic behavior in user-defined systems, hooks, or callbacks.
 * - External state mutations or side effects during the update loop.
 * - Reliance on non-serializable resource state or external volatile state.
 *
 * @typeParam TComponents - The registry of components allowed in this world.
 * @typeParam TEvents - The registry of events handled by the world's event bus.
 * @typeParam TBlueprints - The registry of blueprints available for spawning entities.
 */
export class World<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private activeEntities = new Set<Entity>();

  /**
   * Indicates if the world is currently executing its update loop.
   */
  public isUpdating = false;

  /**
   * Indicates if the world is in a re-simulation phase (e.g., during network rollback).
   */
  public isReSimulating = false;

  /**
   * Internal component storage.
   * @internal
   */
  private componentMaps = new Map<string, Map<Entity, unknown>>();

  /**
   * Internal entity index by component type.
   * @internal
   */
  private componentIndex = new Map<string, Set<Entity>>();

  /**
   * Internal set of components for each entity.
   * @internal
   */
  private entityComponentSets = new Map<Entity, Set<string>>();

  /**
   * Internal query cache.
   * @internal
   */
  private queries = new Map<string, Query<TComponents>>();

  /**
   * Internal query index by component type.
   * @internal
   */
  private queriesByComponent = new Map<string, Set<Query<TComponents>>>();

  /**
   * Internal systems list.
   * @internal
   */
  private systems: { system: System<TComponents, TEvents>; phase: string; priority: number }[] = [];
  private nextEntityId = 1;
  private freeEntities: Entity[] = [];
  private resources = new Map<string, unknown>();
  private _tick = 0;
  private commandBuffer = new WorldCommandBuffer<TComponents, TEvents, TBlueprints>();

  /**
   * @internal
   */
  public renderRandom = new RandomService();

  private _structureVersion = 0;
  private _stateVersion = 0;

  /**
   * @internal
   */
  public componentVersions = new Map<string, Map<Entity, number>>();

  private _gameplayRandom = new RandomService();

  public debugMode = false;

  public get tick(): number { return this._tick; }
  public get structureVersion(): number { return this._structureVersion; }
  public get stateVersion(): number { return this._stateVersion; }
  public get gameplayRandom(): RandomService { return this._gameplayRandom; }
  public getEventBus(): EventBus<TEvents> { return this.getResource<EventBus<TEvents>>("EventBus")!; }
  public getCommandBuffer(): WorldCommandBuffer<TComponents, TBlueprints> { return this.commandBuffer; }

  /**
   * Returns a list of all active entities, sorted by ID.
   *
   * @remarks
   * Iterating over this list provides a stable order based on entity IDs.
   *
   * @warning
   * Performance impact: This operation creates a new array and performs a sort (O(N log N)) on every call.
   * Frequent access in performance-critical paths will increase GC pressure and may impact frame budget.
   * It is recommended to use {@link Query} for efficient, cached entity filtering.
   */
  public get entities(): ReadonlyArray<Entity> {
    return Array.from(this.activeEntities).sort((a, b) => a - b);
  }

  /**
   * Alias for {@link World.entities}.
   *
   * @remarks
   * @warning
   * Frequent use in performance-critical paths is discouraged due to O(N log N) sorting
   * and GC pressure.
   */
  public getAllEntities(): ReadonlyArray<Entity> {
    return this.entities;
  }

  public getEntityComponentTypes(entity: Entity): string[] {
    const set = this.entityComponentSets.get(entity);
    return set ? Array.from(set) : [];
  }

  /**
   * Creates a new entity or recycles a previously removed ID.
   * Increments the structure version of the world.
   *
   * @warning
   * Structural change: Direct entity creation during world update is allowed but may disrupt
   * ongoing iterations in systems that do not use stable queries. Using the
   * {@link WorldCommandBuffer} for deferred creation is recommended to maintain
   * simulation stability during the frame.
   */
  createEntity(): Entity {
    const id = this.freeEntities.length > 0 ? this.freeEntities.pop()! : this.nextEntityId++;
    this.activeEntities.add(id);
    this._structureVersion++;
    return id;
  }

  /**
   * Reserves an entity ID without activating it.
   */
  reserveEntityId(): Entity {
    return this.nextEntityId++;
  }

  /**
   * Removes an entity and all its associated components from the world.
   *
   * @warning
   * Structural change: Removing entities during system updates can disrupt
   * active iterations if not handled carefully. Using {@link WorldCommandBuffer}
   * to defer entity removal until the end of the frame is recommended to maintain
   * simulation stability.
   */
  removeEntity(entity: Entity): void {
    if (this.activeEntities.delete(entity)) {
      this.freeEntities.push(entity);
      this.entityComponentSets.delete(entity);
      this.componentMaps.forEach(map => map.delete(entity));
      this.componentIndex.forEach(set => set.delete(entity));
      this.componentVersions.forEach(map => map.delete(entity));
      this.queries.forEach(query => query.remove(entity));
      this._structureVersion++;
    }
  }

  public hasEntity(entity: Entity): boolean {
    return this.activeEntities.has(entity);
  }

  public clear(): void {
    this.activeEntities.forEach(e => this.removeEntity(e));
    this.freeEntities = [];
    this.nextEntityId = 1;
    this.resources.clear();
    this._tick = 0;
    this._stateVersion = 0;
    this._structureVersion = 0;
  }

  public clearSystems(): void {
    this.systems.forEach(s => s.system.dispose());
    this.systems = [];
  }

  addComponent<K extends ComponentType<TComponents>>(entity: Entity, component: TComponents[K]): void {
    const type = (component as any).type as string;
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
    const isNew = !componentSet.has(type);
    componentSet.add(type);

    if (isNew) {
      this.notifyQueries(entity, componentSet, type);
      this._structureVersion++;
    }

    this._stateVersion++;
    this.updateComponentVersion(entity, type);
  }

  public hasComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): boolean {
    return this.componentIndex.get(type as string)?.has(entity) ?? false;
  }

  getComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): TComponents[K] | undefined {
    return this.componentMaps.get(type as string)?.get(entity) as TComponents[K] | undefined;
  }

  getMutableComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): TComponents[K] | undefined {
    const component = this.getComponent(entity, type);
    if (component) {
      this._stateVersion++;
      this.updateComponentVersion(entity, type as string);
    }
    return component;
  }

  removeComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): void {
    const map = this.componentMaps.get(type as string);
    if (map && map.delete(entity)) {
      this.componentIndex.get(type as string)?.delete(entity);
      this.componentVersions.get(type as string)?.delete(entity);
      const set = this.entityComponentSets.get(entity);
      if (set) {
        set.delete(type as string);
        this.notifyQueries(entity, set, type as string);
      }
      this._structureVersion++;
    }
  }

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

  getQuery<K extends ComponentType<TComponents>>(...componentTypes: K[]): Query<TComponents> {
    const key = [...componentTypes].sort().join(",");
    let query = this.queries.get(key);
    if (!query) {
      query = new Query<TComponents>(componentTypes as string[]);
      this.queries.set(key, query);
      for (const type of componentTypes) {
        if (!this.queriesByComponent.has(type as string)) this.queriesByComponent.set(type as string, new Set());
        this.queriesByComponent.get(type as string)!.add(query);
      }
      this.activeEntities.forEach(entity => {
        const set = this.entityComponentSets.get(entity);
        if (set && query!.matches(set)) query!.add(entity);
      });
    }
    return query;
  }

  query<K extends ComponentType<TComponents>>(...componentTypes: K[]): ReadonlyArray<Entity> {
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

  addSystem(system: System<TComponents, TEvents>, config: SystemConfig = {}): void {
    this.systems.push({
      system,
      phase: (config.phase as string) ?? SystemPhase.Simulation,
      priority: config.priority ?? 0
    });
    system.onRegister(this);
  }

  /**
   * Updates the world by executing all registered systems in their designated phases.
   *
   * @param deltaTime - Time elapsed since the last update in seconds.
   *
   * @remarks
   * Systems are executed following the order of {@link SystemPhase} and their priority
   * within each phase. After all phases, the {@link WorldCommandBuffer} is flushed.
   *
   * This method is synchronous. The core update loop is intended for synchronous execution;
   * asynchronous side effects (like `await`) within systems should be avoided as they
   * can lead to race conditions, inconsistent state, and non-deterministic behavior.
   *
   * @warning
   * Direct structural changes: Making structural changes (like adding/removing components or entities)
   * directly during this call can disrupt active iterations. Use {@link WorldCommandBuffer}
   * to defer these changes until the end of the update for better stability.
   */
  update(deltaTime: number): void {
    this._tick++;
    this.isUpdating = true;
    RandomService.lockGameplayContext = true;
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
      RandomService.lockGameplayContext = false;
    }
    this.flush();
  }

  public flush(): void {
    this.commandBuffer.flush(this);
  }

  /**
   * Manually advances the world's simulation tick.
   *
   * @remarks
   * This is typically called automatically by {@link update}, but can be used
   * manually in custom simulation loops or for re-simulation/rollback.
   */
  public advanceTick(): void {
    this._tick++;
  }

  getSingleton<K extends ComponentType<TComponents>>(type: K): TComponents[K] | undefined {
    const entities = this.query(type);
    if (entities.length === 0) return undefined;
    return this.getComponent(entities[0], type);
  }

  mutateSingleton<K extends ComponentType<TComponents>>(
    type: K,
    mutator: (component: TComponents[K]) => void
  ): void {
    const entities = this.query(type);
    if (entities.length > 0) {
      this.mutateComponent(entities[0], type, mutator);
    }
  }

  setResource<T>(name: string, resource: T): void {
    this.resources.set(name, resource);
  }

  getResource<T>(name: string): T | undefined {
    return this.resources.get(name) as T;
  }

  private updateComponentVersion(entity: Entity, type: string): void {
    let typeMap = this.componentVersions.get(type);
    if (!typeMap) {
      typeMap = new Map();
      this.componentVersions.set(type, typeMap);
    }
    typeMap.set(entity, this._stateVersion);
  }

  /**
   * Captures the current serializable state of the world.
   *
   * @param target - Optional snapshot object to reuse and minimize allocations.
   * @returns A snapshot of the world's entities, components, and RNG state.
   *
   * @remarks
   * This operation is designed to capture components and their serializable properties (primitive values,
   * plain nested objects/arrays).
   *
   * @warning
   * - Limitations: Functions, non-serializable objects (e.g., class instances without a custom cloner),
   *   and circular references are not supported and will lead to incomplete state restoration.
   * - Performance: Snapshotting involves significant allocations and deep cloning; frequent use
   *   in hot paths should be avoided to minimize GC pressure.
   */
  public snapshot(target?: WorldSnapshot): WorldSnapshot {
    return SnapshotSerializer.snapshot(this, target);
  }

  /**
   * Restores the world state from a snapshot.
   *
   * @param state - The snapshot to restore.
   *
   * @remarks
   * This method performs a restoration of entities and components from the snapshot,
   * rebuilding internal indexes and queries. It is a computationally expensive
   * operation intended for scene transitions, rollback, or game loading.
   *
   * @warning
   * - Serializable only: This only restores the serializable state captured in the snapshot.
   * - Manual management: Any transient state, non-serializable resources, or external subscriptions
   *   must be managed or re-initialized manually after this call.
   */
  public restore(state: WorldSnapshot): void {
    SnapshotRestore.restore(this, state);
  }

  /**
   * Captures the changes in component data since a specific version.
   *
   * @param sinceVersion - The state version to compare against.
   * @returns A partial snapshot containing only the changed components.
   */
  public deltaSnapshot(sinceVersion: number): Partial<WorldSnapshot> {
    return SnapshotSerializer.deltaSnapshot(this, sinceVersion);
  }
}

export { ComponentRegistry, ComponentType };
