import { Component, WorldSnapshot, ComponentDataSnapshot, SerializedComponent } from "../types/EngineTypes";
import { Entity } from "./Entity";
import { AnyCoreComponent, ComponentOf } from "./CoreComponents";

type DeepReadonly<T> = T extends (...args: any[]) => any
  ? T
  : T extends any[]
  ? ReadonlyArray<DeepReadonly<T[number]>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

import { System, SystemConfig, SystemPhase } from "./System";
import { RandomService } from "../utils/RandomService";
import { ComponentCloner } from "./ComponentCloner";
import { Query } from "./Query";
import { SystemProfiler } from "../debug/SystemProfiler";
import { WorldCommandBuffer } from "./WorldCommandBuffer";
import { EntityBlueprintAssembler } from "../../factories/EntityBlueprintAssembler";
import { BlueprintOverrides } from "../../data/blueprints/types/BlueprintTypes";

interface RegisteredSystem {
  system: System;
  phase: string;
  priority: number;
}

/**
 * ECS World - Central registry managing the lifecycle of entities, components, and systems.
 *
 * @remarks
 * The World acts as the central hub for the ECS architecture. It is designed to manage
 * entity allocation, component storage, and system orchestration. It aims to
 * minimize overhead in hot paths and provides tools to support deterministic simulations,
 * although results are subject to the constraints of the JavaScript environment,
 * execution timing, and strict adherence to the engine's mutation patterns.
 *
 * API status: Public
 */
const __DEV__ = process.env.NODE_ENV !== "production";
const RAW_DATA = Symbol("RAW_DATA");

export { Entity } from "./Entity";

export class World {
  /** @internal */
  private activeEntities = new Set<Entity>();
  /** @internal */
  public isUpdating = false;
  /**
   * Indicates if the world is currently performing a rollback re-simulation.
   * When true, systems should suppress visual/audio effects.
   */
  public isReSimulating = false;
  /** @internal */
  private componentMaps = new Map<string, Map<Entity, Component>>();
  /** @internal */
  private componentIndex = new Map<string, Set<Entity>>();
  /** @internal */
  private entityComponentSets = new Map<Entity, Set<string>>();
  /** @internal */
  private queries = new Map<string, Query>();
  /** @internal */
  private queriesByComponent = new Map<string, Set<Query>>();
  /** @internal */
  private systems: RegisteredSystem[] = [];
  /** @internal */
  private sortedSystems: System[] = [];
  /** @internal */
  private systemsNeedSorting = false;
  /** @internal */
  private _systemsVersion = 0;
  /** @internal */
  private _sortedComponentTypes: string[] = [];
  /** @internal */
  private _componentTypesDirty = true;
  /** @internal */
  private profilers: Map<System, SystemProfiler> = new Map();
  /** @internal */
  private componentPool = new Map<string, Component[]>();
  /**
   * Whether system profiling is enabled.
   */
  public debugMode = false;
  /** @internal */
  private nextEntityId = 1;
  /** @internal */
  private freeEntities: Entity[] = [];
  /** @internal */
  private _freeEntitiesSorted = true;
  private resources = new Map<string, unknown>();
  /**
   * Incremented on structural changes (entity creation/destruction, component addition/removal).
   */
  private _structureVersion = 0;
  /** @internal */
  private _entitiesCache: Entity[] = [];
  /** @internal */
  private _entitiesCacheVersion = -1;
  /** @internal */
  private _entitiesSorted = true;
  /**
   * Incremented on data changes or manual notification.
   */
  private _stateVersion = 0;
  /**
   * Tracks the state version of each component per entity.
   */
  public componentVersions = new Map<string, Map<Entity, number>>();
  /** Current simulation tick. */
  private _tick = 0;

  /**
   * Current structural version of the world.
   */
  public get structureVersion(): number { return this._structureVersion; }

  /**
   * Current data state version of the world.
   */
  public get stateVersion(): number { return this._stateVersion; }

  /**
   * Current authoritative simulation tick.
   */
  public get tick(): number { return this._tick; }

  private _gameplayRandom = new RandomService();
  private _renderRandom = new RandomService();

  /**
   * Provides access to the random number generator intended for simulation logic.
   *
   * @remarks
   * Designed to support deterministic simulations when seeded consistently and
   * restored via snapshots. Determinism is not guaranteed if external entropy sources,
   * non-deterministic JS features, or unmanaged side effects are used within systems.
   */
  public get gameplayRandom(): RandomService {
    return this._gameplayRandom;
  }

  /**
   * Provee acceso al generador de números aleatorios para efectos visuales y renderizado.
   * No garantizado para ser determinista en el rollback.
   */
  public get renderRandom(): RandomService {
    if (RandomService.lockGameplayContext) {
      throw new Error(
        `Deterministic violation: 'render' random accessed via world.renderRandom during simulation. ` +
        `Only 'gameplay' stream is allowed.`
      );
    }
    return this._renderRandom;
  }

  /**
   * Emits an event to the global EventBus only if the world is not re-simulating.
   *
   * @remarks
   * Use this for side effects like Audio or VFX that should not be duplicated
   * during rollback ticks.
   */
  public emitSimulationEvent<T>(event: string, payload?: T): void {
    if (this.isReSimulating) return;

    const bus = this.getSingleton<import("./CoreComponents").EventBusComponent>("EventBus");
    if (bus) {
      bus.bus.emitDeferred(event, payload);
    }
  }

  /**
   * Manually advances the simulation tick.
   */
  public advanceTick(): void {
    this._tick++;
  }

  private _renderDirty = false;
  private commandBuffer = new WorldCommandBuffer();

  /**
   * Sorted list of all active entities in the world.
   */
  public get entities(): ReadonlyArray<Entity> {
    if (this._entitiesCacheVersion !== this._structureVersion) {
      // Optimization: Only copy and sort if structural version changed
      if (!this._entitiesSorted || this._entitiesCache.length !== this.activeEntities.size) {
        this._entitiesCache = Array.from(this.activeEntities).sort((a, b) => a - b);
        this._entitiesSorted = true;
      }

      if (__DEV__) {
        if (!Object.isFrozen(this._entitiesCache)) {
          Object.freeze(this._entitiesCache);
        }
      }
      this._entitiesCacheVersion = this._structureVersion;
    }
    return this._entitiesCache;
  }

  /**
   * Asserts that structural mutations are allowed in the current world state.
   */
  private assertCanMutateStructure(operationName: string): void {
    if (this.isUpdating) {
      throw new Error(
        `Structural mutation "${operationName}" during update is forbidden. Use WorldCommandBuffer.`
      );
    }
  }

  /**
   * Registered systems sorted by phase and priority.
   */
  public get systemsList(): ReadonlyArray<System> {
    if (this.systemsNeedSorting) {
      this.sortSystems();
    }
    if (__DEV__) {
      if (!Object.isFrozen(this.sortedSystems)) {
        Object.freeze(this.sortedSystems);
      }
    }
    return this.sortedSystems;
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
   * Generates a serializable snapshot of the world state, intended for rollback or persistence.
   *
   * @remarks
   * The snapshot is a deep-cloned representation of the world state, designed to facilitate
   * state restoration. It seeks to ensure that:
   * 1. Entity lists are sorted by ID.
   * 2. Component types are sorted alphabetically.
   * 3. Component data per type is stored in entity-order.
   * 4. Functional or non-serializable data (like event handlers) is excluded.
   *
   * @warning Deep cloning is used to ensure snapshot independence and avoid reference sharing (aliasing),
   * which carries a performance cost proportional to the total number of components and their complexity.
   * Frequent snapshotting may impact the frame rate in large-scale simulations.
   */
  public snapshot(target?: WorldSnapshot): WorldSnapshot {
    const gameplayRandom = this.gameplayRandom;
    const componentData: ComponentDataSnapshot = target?.componentData ?? {};

    // Deterministic sort of component types (cached)
    if (this._componentTypesDirty) {
      this._sortedComponentTypes = Array.from(this.componentMaps.keys()).sort();
      this._componentTypesDirty = false;
    }

    // Pre-initialize componentData with sorted types to ensure deterministic key order
    for (const type of this._sortedComponentTypes) {
      if (!componentData[type]) {
          componentData[type] = {};
      }
    }

    // Use the cached sorted entities list
    const allEntities = this.entities;

    // Optimized capture: Iterate over sorted entities and their components.
    // This avoids sorting per component type and is designed to achieve O(Total Components) complexity.
    for (const entity of allEntities) {
      const componentSet = this.entityComponentSets.get(entity);
      if (!componentSet) continue;

      for (const type of componentSet) {
        const map = this.componentMaps.get(type);
        if (!map) continue;
        const component = map.get(entity);
        if (!component) continue;

        let serializedComp = componentData[type][entity] as Record<string, unknown>;
        if (!serializedComp) {
            serializedComp = {};
            componentData[type][entity] = serializedComp as SerializedComponent;
        }

        const compAsRecord = component as unknown as Record<string, unknown>;

        // Clean up properties that no longer exist in the source
        for (const key in serializedComp) {
            if (!(key in compAsRecord)) {
                delete serializedComp[key];
            }
        }

        // Optimized capture: iterate over properties and copy them using deep cloning.
        // We assume components are flat POJOs as per engine architecture.
        for (const key in compAsRecord) {
          const val = compAsRecord[key];
          if (typeof val !== "function") {
            // MANDATORY: Deep clone every property to ensure snapshot independence.
            // Using ComponentCloner ensures that objects and arrays are independent.
            serializedComp[key] = ComponentCloner.cloneComponent(val);
          }
        }
      }
    }

    if (!this._freeEntitiesSorted) {
      // Sort descending so pop() returns the smallest ID deterministically and in O(1)
      this.freeEntities.sort((a, b) => b - a);
      this._freeEntitiesSorted = true;
    }

    // Final cleanup: remove entities/components from target that are no longer in world
    for (const type in componentData) {
        const snapshotEntities = componentData[type];
        for (const entityId in snapshotEntities) {
            if (!this.hasComponent(parseInt(entityId), type)) {
                delete snapshotEntities[entityId];
            }
        }
    }

    if (target) {
        target.entities = [...allEntities];
        target.componentData = componentData;
        target.nextEntityId = this.nextEntityId;
        target.freeEntities = [...this.freeEntities];
        target.structureVersion = this._structureVersion;
        target.stateVersion = this._stateVersion;
        target.seed = gameplayRandom.getSeed();
        target.rngState = gameplayRandom.getSeed(); // Bit-perfect restoration via getSeed()
        target.accumulator = this.getResource<import("./GameLoop").GameLoop>("GameLoop")?.getAccumulator();
        target.tick = this._tick;
        return target;
    }

    return {
      entities: [...allEntities],
      componentData,
      nextEntityId: this.nextEntityId,
      freeEntities: [...this.freeEntities],
      structureVersion: this._structureVersion,
      stateVersion: this._stateVersion,
      seed: gameplayRandom.getSeed(),
      rngState: gameplayRandom.getSeed(), // Bit-perfect restoration via getSeed()
      accumulator: this.getResource<import("./GameLoop").GameLoop>("GameLoop")?.getAccumulator(),
      tick: this._tick
    };
  }

  /**
   * Restores the world state from a previously captured snapshot.
   *
   * @remarks
   * This method performs a deep restoration to ensure the live world state
   * becomes independent of the snapshot object. It rebuilds internal indexes and
   * re-synchronizes queries to maintain structural integrity.
   *
   * @warning Deterministic restoration is expected only if the world's static structure
   * (registered systems, component types) exactly matches the state when the snapshot was taken.
   * Manual restoration of resources or external state not managed by the World
   * must be handled by the developer to maintain full consistency.
   */
  public restore(state: WorldSnapshot): void {
    this.assertCanMutateStructure("restore");
    this.activeEntities = new Set(state.entities);

    // Reuse entities cache if possible
    if (this._entitiesCache.length !== state.entities.length) {
        this._entitiesCache = [...state.entities];
    } else {
        for (let i = 0; i < state.entities.length; i++) {
            this._entitiesCache[i] = state.entities[i];
        }
    }
    this._entitiesSorted = true;
    this._entitiesCacheVersion = state.structureVersion;

    this.nextEntityId = state.nextEntityId;
    this.freeEntities = [...state.freeEntities];
    this._freeEntitiesSorted = false; // Snapshot might be sorted, but mark dirty to be safe
    this._structureVersion = state.structureVersion;
    this._stateVersion = state.stateVersion;
    this._tick = state.tick ?? 0;

    if (state.rngState !== undefined) {
        this.gameplayRandom.setSeed(state.rngState); // Bit-perfect restoration of internal state
    } else if (state.seed !== undefined) {
        this.gameplayRandom.setSeed(state.seed);
    }

    if (state.accumulator !== undefined) {
        this.getResource<import("./GameLoop").GameLoop>("GameLoop")?.setAccumulator(state.accumulator);
    }

    // Sync component data with snapshot instead of clearing everything
    this.entityComponentSets.clear();

    // 1. Identify types that are NOT in the snapshot and remove them
    const snapshotTypes = Object.keys(state.componentData);
    for (const [type] of this.componentMaps) {
        if (!snapshotTypes.includes(type)) {
            this.componentMaps.delete(type);
            this.componentIndex.delete(type);
            this.componentVersions.delete(type);
        }
    }

    for (const type of snapshotTypes) {
      let storage = this.componentMaps.get(type);
      let index = this.componentIndex.get(type);
      let versions = this.componentVersions.get(type);

      if (!storage) {
        storage = new Map<Entity, Component>();
        index = new Set<Entity>();
        versions = new Map<Entity, number>();
        this.componentMaps.set(type, storage);
        this.componentIndex.set(type, index);
        this.componentVersions.set(type, versions);
      }

      // Remove entities not in this component type's snapshot
      const snapshotEntities = state.componentData[type];
      for (const [entityId] of storage) {
          if (snapshotEntities[entityId] === undefined) {
              storage.delete(entityId);
              index!.delete(entityId);
              versions!.delete(entityId);
          }
      }

      for (const entityIdStr in snapshotEntities) {
        const entityId = parseInt(entityIdStr);
        const sourceComp = snapshotEntities[entityId];

        // Optimized restoration: Reuse existing component object to avoid GC pressure.
        let component = storage.get(entityId) as unknown as Record<string, unknown>;
        if (!component) {
          component = {} as Record<string, unknown>;
          storage.set(entityId, component as unknown as Component);
        }

        // Optimized restoration: Reset component keys efficiently.
        // Instead of 'delete', we overwrite to maintain hidden class stability where possible.
        for (const key in component) {
          if (!(key in sourceComp)) {
             (component as any)[key] = undefined;
          }
        }

        // Apply snapshot data with deep cloning.
        // MANDATORY: We must clone again when restoring to ensure the live world
        // does not share references with the snapshot (aliasing).
        for (const key in sourceComp) {
          const val = sourceComp[key];

          if (__DEV__) {
            // Detection of severe aliasing bug:
            // If the property is an object/array and has the same reference, rollback will be corrupted.
            if (val !== null && typeof val === "object" && val === component[key]) {
               console.warn(
                 `[World.restore] ALIASING DETECTED: Component "${type}" on entity ${entityId} ` +
                 `shares reference for property "${key}" with snapshot. This will corrupt rollback.`
               );
            }
          }

          component[key] = ComponentCloner.cloneComponent(val);
        }

        index!.add(entityId);
        versions!.set(entityId, this._stateVersion);

        let componentSet = this.entityComponentSets.get(entityId);
        if (!componentSet) {
          componentSet = new Set();
          this.entityComponentSets.set(entityId, componentSet);
        }
        componentSet.add(type);
      }
    }

    // Rebuild all existing queries to maintain consistency without breaking references
    this.queries.forEach(query => {
        query.rebuild(this.activeEntities, this.entityComponentSets);
    });

    this._structureVersion = state.structureVersion;
    this._stateVersion = state.stateVersion;
    this._renderDirty = true;
    this.commandBuffer.clear();

  }

  /**
   * Reserves a new entity ID without activating it in the world yet.
   * Safe to call during `update()`.
   */
  public reserveEntityId(): Entity {
    if (!this._freeEntitiesSorted) {
      this.freeEntities.sort((a, b) => b - a);
      this._freeEntitiesSorted = true;
    }
    const id = this.freeEntities.length > 0 ? this.freeEntities.pop()! : this.nextEntityId++;
    this._structureVersion++;
    return id;
  }

  /**
   * Requests the creation of a new entity, recycling IDs from the free pool when available.
   */
  public createEntity(id?: Entity): Entity {
    this.assertCanMutateStructure("createEntity");

    const entityId = id ?? this.reserveEntityId();

    this.activeEntities.add(entityId);
    this._entitiesSorted = false;

    // If an ID was provided manually, ensure nextEntityId stays ahead
    if (id !== undefined && id >= this.nextEntityId) {
      this.nextEntityId = id + 1;
    }

    // Incremented in reserveEntityId or here if id was provided
    if (id !== undefined) this._structureVersion++;

    return entityId;
  }

  /**
   * Unregisters all systems from all execution phases and disposes them.
   */
  clearSystems(): void {
    this.assertCanMutateStructure("clearSystems");
    this.systems.forEach((reg) => {
      reg.system.onUnregister(this);
      reg.system.dispose();
    });
    this.systems = [];
    this.sortedSystems = [];
    this.systemsNeedSorting = false;
    this._systemsVersion++;
    this._structureVersion++;
  }

  /**
   * Adds or replaces a component on a specific entity.
   *
   * @remarks
   * **Caution**: This method is restricted during the world's update cycle
   * (`isUpdating === true`) to protect iterator safety. Attempting to call it during
   * an update will throw an error. Use {@link World.getCommandBuffer} to queue
   * component additions for deferred execution.
   *
   * To modify data in an existing component, {@link World.mutateComponent} is the
   * recommended and authoritative approach as it tracks state versions.
   */
  addComponent<T extends Component>(entity: Entity, component: T): Readonly<T> {
    this.assertCanMutateStructure("addComponent");

    const type = component.type;

    // General hierarchical invariant check for any component implementing IHierarchicalComponent
    const hComp = component as unknown as Partial<import("./CoreComponents").IHierarchicalComponent>;
    if (hComp.parentEntity !== undefined) {
      if (hComp.parentEntity !== null) {
        if (!this.activeEntities.has(hComp.parentEntity)) {
          hComp.parentEntity = null;
        } else if (hComp.parentEntity === entity) {
          throw new Error(`Hierarchy Invariant Violation: Entity ${entity} cannot be its own parent.`);
        }
      }
    }

    this.ensureComponentStorage(type);

    let rawComponent = component;
    if (__DEV__ && component && (component as Record<string | symbol, unknown>)[RAW_DATA]) {
      rawComponent = (component as Record<string | symbol, unknown>)[RAW_DATA] as T;
    }

    const isNew = !this.componentIndex.get(type)?.has(entity);
    this.componentMaps.get(type)?.set(entity, rawComponent);
    this.componentIndex.get(type)?.add(entity);

    if (isNew) {
      let componentSet = this.entityComponentSets.get(entity);
      if (!componentSet) {
        componentSet = new Set();
        this.entityComponentSets.set(entity, componentSet);
      }
      componentSet.add(type);
      this.notifyQueries(entity, componentSet, type);
      this._structureVersion++;
    }

    this._stateVersion++;
    this.updateComponentVersion(entity, type);
    return component;
  }

  /**
   * Returns a READ-ONLY component reference stored in the World.
   *
   * @remarks
   * For performance reasons, in production this returns the live reference but typed as Readonly.
   * In development mode, the object may be frozen or proxied to detect unauthorized mutations.
   *
   * API status: Public
   */
  public getComponent<TType extends AnyCoreComponent["type"]>(entity: Entity, type: TType): DeepReadonly<ComponentOf<TType>> | undefined;
   /** @internal */ public getComponent<T extends Component>(entity: Entity, type: string): DeepReadonly<T> | undefined;
  public getComponent<T extends Component>(entity: Entity, type: string): DeepReadonly<T> | undefined {
    const component = this.componentMaps.get(type)?.get(entity) as T | undefined;
    if (__DEV__ && component) {
      return this.createMutationProxy(component, type, entity) as DeepReadonly<T>;
    }
    return component as DeepReadonly<T> | undefined;
  }

  /**
   * Internal proxy to detect illegal mutations in development mode.
   */
  private createMutationProxy<T extends object>(target: T, type: string, entity: Entity): T {
    return new Proxy(target, {
      get: (obj, prop) => {
        if (prop === RAW_DATA) return obj;
        return (obj as Record<string | symbol, unknown>)[prop];
      },
      set: (obj, prop, value) => {
        console.error(
          `[World] ILLEGAL MUTATION DETECTED: Direct write to "${String(prop)}" on component "${type}" (Entity ${entity}). ` +
          `Always use world.mutateComponent() to ensure state versioning and determinism.`
        );
        (obj as Record<string | symbol, unknown>)[prop] = value;
        return true;
      }
    });
  }

  /**
   * Performs an immediate mutation on a component.
   *
   * @remarks
   * This is the **authoritative** way to modify component data. It ensures
   * that state versioning, change detection, and render-dirty flags are correctly updated.
   * Direct property assignments on component references retrieved via `getComponent`
   * bypass the engine's tracking mechanisms and are blocked in development mode
   * to help prevent desyncs in deterministic environments.
   */
  public mutateComponent<TType extends AnyCoreComponent["type"]>(
    entity: Entity,
    type: TType,
    updater: (component: ComponentOf<TType>) => void
  ): boolean;
  public mutateComponent<T extends Component>(
    entity: Entity,
    type: string,
    updater: (component: T) => void
  ): boolean;
  public mutateComponent<T extends Component>(
    entity: Entity,
    type: string,
    updater: (component: T) => void
  ): boolean {
    const component = this.componentMaps.get(type)?.get(entity) as T | undefined;
    if (component === undefined) return false;

    updater(component);
    this._stateVersion++;
    this.updateComponentVersion(entity, type);
    this._renderDirty = true;
    return true;
  }

  /**
   * Checks for entity existence. Typically O(1).
   */
  public hasEntity(entity: Entity): boolean {
    return this.activeEntities.has(entity);
  }

  /**
   * Checks if an entity possesses a specific component.
   */
  hasComponent(entity: Entity, type: string): boolean {
    return this.componentIndex.get(type)?.has(entity) ?? false;
  }

  /**
   * Removes a component from an entity.
   *
   * @remarks
   * **Caution**: This method is restricted during the world's update cycle
   * (`isUpdating === true`) to protect iterator safety. Use {@link World.getCommandBuffer}
   * to queue removals for deferred execution.
   */
  removeComponent(entity: Entity, type: string): void {
    this.assertCanMutateStructure("removeComponent");

    const componentMap = this.componentMaps.get(type);
    if (componentMap && componentMap.delete(entity)) {
      this.componentIndex.get(type)?.delete(entity);
      this.componentVersions.get(type)?.delete(entity);
      const componentSet = this.entityComponentSets.get(entity);
      if (componentSet) {
        componentSet.delete(type);
        this.notifyQueries(entity, componentSet, type);
      }
      this._structureVersion++;
    }
  }

  /**
   * Provides a set of entities matching the specified component signature.
   */
  /**
   * Retrieves a query for a specific component signature.
   *
   * @param componentTypes - Component type discriminators.
   * @returns The {@link Query} instance.
   */
  public getQuery(...componentTypes: string[]): Query {
    if (componentTypes.length === 0) throw new Error("World.getQuery requires at least one component type.");
    const key = componentTypes.length === 1 ? componentTypes[0] : [...componentTypes].sort().join(",");
    let query = this.queries.get(key);

    if (!query) {
      query = new Query(componentTypes);
      this.queries.set(key, query);
      for (const type of componentTypes) {
        let set = this.queriesByComponent.get(type);
        if (!set) {
          set = new Set();
          this.queriesByComponent.set(type, set);
        }
        set.add(query);
      }
      Array.from(this.activeEntities).sort((a, b) => a - b).forEach(entity => {
        const componentSet = this.entityComponentSets.get(entity);
        if (componentSet && query!.matches(componentSet)) {
          query!.add(entity);
        }
      });
    }

    return query;
  }

  public query(...componentTypes: string[]): ReadonlyArray<Entity> {
    if (componentTypes.length === 0) return [];
    return this.getQuery(...componentTypes).getEntities();
  }

  /**
   * Completely removes an entity and all its components from the world.
   */
  public removeEntity(entity: Entity): void {
    this.assertCanMutateStructure("removeEntity");

    this.removeEntityFromComponentMaps(entity);
    this.entityComponentSets.delete(entity);
    this.queries.forEach(query => query.remove(entity));

    if (this.activeEntities.delete(entity)) {
      this._entitiesSorted = false;
      this.freeEntities.push(entity);
      this._freeEntitiesSorted = false;
      this._structureVersion++;
    }
  }

  /**
   * Spawns an entity from a data-driven blueprint.
   * API status: Public
   */
  public spawnFromBlueprint(blueprintId: string, x: number, y: number, overrides?: BlueprintOverrides): Entity {
    return EntityBlueprintAssembler.assemble(this, blueprintId, x, y, overrides);
  }

  /**
   * Accesses the command buffer for deferred structural mutations.
   */
  public getCommandBuffer(): WorldCommandBuffer {
    return this.commandBuffer;
  }

  /**
   * Consolidates all buffered structural mutations.
   */
  public flush(): void {
    this.commandBuffer.flush(this);
  }

  /**
   * Generates a partial snapshot containing modified components since a version.
   */
  public deltaSnapshot(sinceVersion: number, filterEntities?: Set<Entity>): Partial<WorldSnapshot> {
    const componentData: ComponentDataSnapshot = {};

    this.componentMaps.forEach((map, type) => {
      const typeVersions = this.componentVersions.get(type);
      if (!typeVersions) return;

      const typeData: Record<Entity, SerializedComponent> = {};
      let hasData = false;

      map.forEach((component, entity) => {
        // Apply interest filter if provided
        if (filterEntities && !filterEntities.has(entity)) return;

        const version = typeVersions.get(entity) ?? 0;
        if (version > sinceVersion) {
          const serializedComp: SerializedComponent = {};
          const compAsRecord = component as unknown as Record<string, unknown>;

          for (const key in compAsRecord) {
            if (typeof compAsRecord[key] !== "function") {
              serializedComp[key] = compAsRecord[key];
            }
          }
          typeData[entity] = structuredClone(serializedComp) as SerializedComponent;
          hasData = true;
        }
      });

      if (hasData) {
        componentData[type] = typeData;
      }
    });

    return {
      componentData,
      stateVersion: this._stateVersion,
      structureVersion: this._structureVersion,
      tick: this._tick
    };
  }

  /**
   * Acquires a component from the pool or returns undefined if empty.
   * API status: Internal/Advanced
   */
  public acquireComponent<T extends Component>(type: string): T | undefined {
    return this.componentPool.get(type)?.pop() as T | undefined;
  }

  /**
   * Resets the entire world state.
   */
  public clear(): void {
    this.assertCanMutateStructure("clear");
    this.activeEntities.clear();
    this.componentMaps.clear();
    this.componentIndex.clear();
    this.componentVersions.clear();
    this.entityComponentSets.clear();
    this.queries.clear();
    this.queriesByComponent.clear();
    this.resources.clear();
    this.commandBuffer.clear();
    this._structureVersion++;
    this._componentTypesDirty = true;
    this._freeEntitiesSorted = true;
  }

  /**
   * Registers a global singleton resource.
   */
  setResource<T>(name: string, resource: T): void {
    this.resources.set(name, resource);
  }

  /**
   * Retrieves a registered global resource.
   */
  getResource<T>(name: string): T | undefined {
    if (name === "gameplay") return this.gameplayRandom as unknown as T;
    if (name === "render") return this.renderRandom as unknown as T;
    return this.resources.get(name) as T;
  }

  /**
   * Performs a controlled mutation on a global resource.
   */
  mutateResource<T>(name: string, mutator: (resource: T) => void): void {
    const resource = this.resources.get(name) as T;
    if (resource) {
      mutator(resource);
      this.notifyStateChange();
    }
  }

  /**
   * Verifies if a resource is registered.
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
   * Registers a system to participate in the simulation loop.
   */
  addSystem(system: System, config: SystemConfig = {}): void {
    this.assertCanMutateStructure("addSystem");

    // Prevent duplicate system instances
    for (let i = 0; i < this.systems.length; i++) {
      if (this.systems[i].system === system) return;
    }

    const phase = config.phase ?? SystemPhase.Simulation;
    const priority = config.priority ?? 0;
    this.systems.push({ system, phase, priority });
    this.systemsNeedSorting = true;
    this._systemsVersion++;

    if (system.onRegister) {
      system.onRegister(this);
    }
  }

  /**
   * Orchestrates a simulation tick by executing systems in order.
   */
  update(deltaTime: number): void {
    this._tick++;
    if (this.systemsNeedSorting) this.sortSystems();

    this.isUpdating = true;
    RandomService.lockGameplayContext = true;

    try {
      // Standard Execution Order defined by SystemPhase
      const phases = [
        SystemPhase.Input,
        SystemPhase.Simulation,
        SystemPhase.Transform, // Critical: Hierarchy resolution BEFORE collisions
        SystemPhase.Collision,
        SystemPhase.GameRules,
        SystemPhase.Presentation
      ];

      for (const phase of phases) {
        const systemsInPhase = this.systems.filter(s => s.phase === phase);
        // Sort by priority within phase
        systemsInPhase.sort((a, b) => b.priority - a.priority);

        for (const reg of systemsInPhase) {
          if (this.debugMode) {
            let profiler = this.profilers.get(reg.system);
            if (!profiler) {
              profiler = new SystemProfiler(reg.system);
              this.profilers.set(reg.system, profiler);
            }
            profiler.update(this, deltaTime);
          } else {
            reg.system.update(this, deltaTime);
          }
        }
      }
    } finally {
      this.isUpdating = false;
      RandomService.lockGameplayContext = false;
    }

    this.flush();
  }

  /**
   * Returns the average execution time (ms) of a system.
   */
  getSystemTiming(system: System): number {
    return this.profilers.get(system)?.getAverageTime() ?? 0;
  }

  /** Returns performance metrics for all registered systems. */
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
      [SystemPhase.Transform]: 4,
      [SystemPhase.Presentation]: 5,
    };
    const getPhaseWeight = (phase: string) => phaseOrder[phase] ?? 999;
    this.systems.sort((a, b) => {
      const weightA = getPhaseWeight(a.phase);
      const weightB = getPhaseWeight(b.phase);
      if (weightA !== weightB) return weightA - weightB;
      return b.priority - a.priority;
    });
    this.sortedSystems = this.systems.map((s) => s.system);
    this.systemsNeedSorting = false;
  }

  /** Returns all component types attached to an entity. */
  getEntityComponentTypes(entity: Entity): string[] {
    const set = this.entityComponentSets.get(entity);
    return set ? Array.from(set) : [];
  }

  private notifyQueries(entity: Entity, componentSet: Set<string>, changedType?: string): void {
    const queriesToNotify = changedType
      ? (this.queriesByComponent.get(changedType) || [])
      : Array.from(this.queries.values());

    queriesToNotify.forEach((query) => {
      if (query.matches(componentSet)) {
        query.add(entity);
      } else {
        query.remove(entity);
      }
    });
  }

  private removeEntityFromComponentMaps(entity: Entity): void {
    this.componentMaps.forEach((componentMap, type) => {
      const component = componentMap.get(entity);
      if (component) {
        componentMap.delete(entity);
        this.componentIndex.get(type)?.delete(entity);
        this.componentVersions.get(type)?.delete(entity);

        // Recycle component
        let pool = this.componentPool.get(type);
        if (!pool) {
          pool = [];
          this.componentPool.set(type, pool);
        }
        pool.push(component);
      }
    });
  }

  /**
   * Manually notifies the engine of a global state change.
   */
  public notifyStateChange(): void {
    this._stateVersion++;
    this._renderDirty = true;
  }

  /**
   * Marks the world as requiring a re-render.
   */
  public setRenderDirty(dirty: boolean): void {
    this._renderDirty = dirty;
  }

  /**
   * Checks if the world state has changed since the last frame was rendered.
   */
  public isRenderDirty(): boolean {
    return this._renderDirty;
  }

  /**
   * Tries to locate the first component of a given type, treating it as a Singleton.
   */
  public getSingleton<TType extends AnyCoreComponent["type"]>(type: TType): DeepReadonly<ComponentOf<TType>> | undefined;
  public getSingleton<T extends Component>(type: string): DeepReadonly<T> | undefined;
  public getSingleton<T extends Component>(type: string): DeepReadonly<T> | undefined {
    const [entity] = this.query(type);
    if (entity === undefined) return undefined;
    return this.getComponent(entity, type) as DeepReadonly<T> | undefined;
  }

  /**
   * Returns a mutable reference to a component.
   *
   * @remarks
   * This method bypasses `Readonly` protection and should be used with caution.
   * It is intended for performance-critical hot paths where the overhead of the
   * `mutateComponent` callback might be measurable. It manually triggers
   * the state version increment and render-dirty flags.
   *
   * @warning Bypassing the standard mutation flow increases the risk of accidental
   * side effects or desyncs if state tracking is not handled carefully.
   */
  public getMutableComponent<TType extends AnyCoreComponent["type"]>(entity: Entity, type: TType): ComponentOf<TType> | undefined;
  public getMutableComponent<T extends Component>(entity: Entity, type: string): T | undefined;
  public getMutableComponent<T extends Component>(entity: Entity, type: string): T | undefined {
    const component = this.componentMaps.get(type)?.get(entity) as T | undefined;
    if (component) {
      this._stateVersion++;
      this.updateComponentVersion(entity, type);
      this._renderDirty = true;
    }
    return component;
  }

  /**
   * Performs an immediate mutation on a Singleton component.
   *
   * API status: Public
   */
  public mutateSingleton<TType extends AnyCoreComponent["type"]>(
    type: TType,
    updater: (component: ComponentOf<TType>) => void
  ): boolean;
  public mutateSingleton<T extends Component>(
    type: string,
    updater: (component: T) => void
  ): boolean;
  public mutateSingleton<T extends Component>(
    type: string,
    updater: (component: T) => void
  ): boolean {
    const [entity] = this.query(type);
    if (entity !== undefined) {
      return this.mutateComponent<T>(entity, type, updater);
    }
    return false;
  }

  /**
   * Internal method to trigger the Transformation phase for all hierarchical components.
   * This is called automatically during the World.update() cycle.
   */
  private runTransformPhase(deltaTime: number): void {
    // We expect HierarchySystem to be registered in the World or accessible.
    // If not, we fall back to a built-in resolution logic to guarantee invariant.
    const hierarchySystems = this.systems.filter(s => s.phase === SystemPhase.Transform);
    if (hierarchySystems.length > 0) {
      hierarchySystems.forEach(reg => reg.system.update(this, deltaTime));
    }
  }

  private ensureComponentStorage(type: string): void {
    if (!this.componentMaps.has(type)) {
      this.componentMaps.set(type, new Map());
      this.componentIndex.set(type, new Set());
      this._componentTypesDirty = true;
    }
  }

  // ==========================================================================
  // LEGACY COMPATIBILITY
  // ==========================================================================

  /**
   * @deprecated Use {@link World.structureVersion} or {@link World.stateVersion} instead.
   */
  public get version(): number {
    return this._structureVersion + this._stateVersion;
  }

  /**
   * Alias of {@link World.query} for entities with a specific signature.
   * @deprecated Use {@link World.query} directly.
   */
  public getEntitiesWith(...componentTypes: string[]): ReadonlyArray<Entity> {
    return this.query(...componentTypes);
  }

  /** @deprecated Use {@link World.entities} getter. */
  public getAllEntities(): ReadonlyArray<Entity> {
    return this.entities;
  }
}

