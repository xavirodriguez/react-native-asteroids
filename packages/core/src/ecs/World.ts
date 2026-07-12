import { ComponentRegistry, ComponentType } from "./Component";
import { Entity } from "./Entity";
import { EventRegistry, EventBus } from "../events/EventBus";
import { Query } from "./Query";
import { System, SystemConfig } from "./System";
import { Schedule } from "./Schedule";
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
> = Record<string, BlueprintDefinition<TComponents, TEvents, unknown>>;

/**
 * The World acts as the central container for an ECS (Entity Component System) simulation.
 * It manages entities, components, systems, and resources.
 *
 * @remarks
 * This implementation is designed to support reproducible simulations when provided with consistent
 * initial states and stable inputs. It aims to minimize non-deterministic factors in the core
 * simulation logic; however, reproducibility is conditional and depends on several factors:
 * - Floating-point precision: Behavior may vary across different JS engines, WASM runtimes, or hardware platforms.
 * - User-defined logic: Non-deterministic behavior in systems, hooks, or callbacks will propagate.
 * - Side effects: External state mutations or asynchronous side effects during the update loop can break consistency.
 * - State coverage: Features like rollback and snapshots rely on all relevant state being stored in serializable components.
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
  private cachedEntities: ReadonlyArray<Entity> | null = null;

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
   * Default schedule for handling ECS systems.
   */
  private defaultSchedule: Schedule<TComponents, TEvents>;

  constructor(schedule?: Schedule<TComponents, TEvents>) {
    this.defaultSchedule = schedule ?? new Schedule<TComponents, TEvents>();
  }

  /** @internal */
  private nextEntityId = 1;
  /** @internal */
  private freeEntities: Entity[] = [];
  /** @internal */
  private resources = new Map<string, unknown>();
  /** @internal */
  private _tick = 0;
  /** @internal */
  private commandBuffer = new WorldCommandBuffer<TComponents, TEvents, TBlueprints>();

  /**
   * RNG service for visual-only effects.
   * @internal
   */
  public renderRandom = new RandomService();

  /** @internal */
  private _structureVersion = 0;
  /** @internal */
  private _stateVersion = 0;

  /**
   * Internal component version tracking for delta snapshots.
   * @internal
   */
  public componentVersions = new Map<string, Map<Entity, number>>();

  /** @internal */
  private _gameplayRandom = new RandomService();

  /**
   * Internal debug flag.
   * @internal
   */
  public debugMode = false;

  /** Current simulation tick. */
  public get tick(): number { return this._tick; }
  /** Incremented on structural changes (entity create/remove, component add/remove). */
  public get structureVersion(): number { return this._structureVersion; }
  /** Incremented on any state change (structural change or component mutation). */
  public get stateVersion(): number { return this._stateVersion; }
  /** Seeded RNG service intended for gameplay logic to support reproducibility. */
  public get gameplayRandom(): RandomService { return this._gameplayRandom; }
  public getEventBus(): EventBus<TEvents> { return this.getResource<EventBus<TEvents>>("EventBus")!; }
  public getCommandBuffer(): WorldCommandBuffer<TComponents, TEvents, TBlueprints> { return this.commandBuffer; }

  /**
   * Returns a list of all active entities, sorted by ID.
   *
   * @remarks
   * Iterating over this list provides a stable order based on entity IDs, provided
   * entity creation and recycling remain consistent.
   *
   * @warning
   * **Performance & Memory**: This operation creates a new array and performs a sort (O(N log N)) on every call.
   * Frequent access in hot paths is expected to increase GC pressure and may impact frame budget.
   * For efficient, cached entity filtering, it is recommended to use {@link Query}.
   */
  public get entities(): ReadonlyArray<Entity> {
    if (!this.cachedEntities) {
      this.cachedEntities = Array.from(this.activeEntities).sort((a, b) => a - b);
    }
    return this.cachedEntities;
  }

  /**
   * Alias for {@link World.entities}.
   *
   * @remarks
   * @warning
   * **Performance & Memory**: Frequent use in performance-critical paths is discouraged due to O(N log N) sorting
   * and high GC pressure from array allocations.
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
   * **Structural Change**: Direct entity creation during world update may disrupt
   * active iterations in systems that are not using stable queries. To help maintain
   * simulation stability and avoid inconsistent state during a frame, it is recommended
   * to use {@link WorldCommandBuffer} to defer creation until the end of the update.
   */
  createEntity(): Entity {
    const id = this.freeEntities.length > 0 ? this.freeEntities.pop()! : this.nextEntityId++;
    this.activeEntities.add(id);
    this.cachedEntities = null;
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
   * **Structural Change**: Removing entities during system updates may disrupt
   * active iterations and lead to unexpected behavior if not handled carefully.
   * To help maintain simulation stability, it is recommended to use {@link WorldCommandBuffer}
   * to defer entity removal until the end of the frame.
   */
  removeEntity(entity: Entity): void {
    if (this.activeEntities.delete(entity)) {
      this.freeEntities.push(entity);
      this.entityComponentSets.delete(entity);
      this.componentMaps.forEach(map => map.delete(entity));
      this.componentIndex.forEach(set => set.delete(entity));
      this.componentVersions.forEach(map => map.delete(entity));
      this.queries.forEach(query => query.remove(entity));
      this.cachedEntities = null;
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
    this.cachedEntities = null;
  }

  public clearSystems(): void {
    this.defaultSchedule.clearSystems();
  }

  /**
   * Adds a component to an entity.
   *
   * @warning
   * **Structural Change**: Adding components during an update loop may disrupt
   * ongoing iterations and triggers immediate query updates. Deferring this through
   * {@link WorldCommandBuffer} is recommended to ensure consistency across all systems.
   */
  addComponent<K extends ComponentType<TComponents>>(entity: Entity, component: TComponents[K] & { type: K }): void {
    const type = component.type as string;
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

  /**
   * Removes a component from an entity.
   *
   * @warning
   * **Structural Change**: This operation modifies the entity's composition and
   * triggers immediate query updates. To help avoid iterator invalidation during
   * system updates, it is recommended to use {@link WorldCommandBuffer}.
   */
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
    this.defaultSchedule.addSystem(system, config, this);
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
   * This method is synchronous. The core update loop is designed for synchronous execution;
   * asynchronous side effects (like `await`) within systems should be avoided in core logic
   * to help prevent race conditions, inconsistent state, and non-deterministic behavior.
   *
   * @warning
   * **Structural changes during iteration**: Direct structural changes (like adding/removing
   * components or entities) during this call may disrupt active iterations in systems
   * that do not use stable queries. It is recommended to use {@link WorldCommandBuffer}
   * to defer these changes until the end of the update to help preserve simulation stability.
   */
  update(deltaTime: number): void {
    this._tick++;
    this.defaultSchedule.update(this, deltaTime);
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
   * @param target - Optional snapshot object to reuse and help minimize allocations.
   * @returns A snapshot of the world's entities, components, and RNG state.
   *
   * @remarks
   * This operation is designed to capture components and their serializable properties (primitive values,
   * plain nested objects/arrays).
   *
   * @warning
   * - **Serialization limits**: Functions, non-serializable objects (e.g., class instances without
   *   a custom cloner), and circular references are not supported and may result in incomplete
   *   state restoration.
   * - **Performance impact**: Snapshotting involves deep cloning; frequent use in performance-critical
   *   hot paths is expected to increase GC pressure and may impact frame budget.
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
   * - **Restores serializable state**: This only restores the serializable state captured in
   *   the snapshot (primitive values, plain objects/arrays).
   * - **Manual state management**: Any transient state, non-serializable resources (e.g. textures,
   *   audio buffers), or external subscriptions are not captured and should be managed
   *   or re-initialized manually after this call.
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
