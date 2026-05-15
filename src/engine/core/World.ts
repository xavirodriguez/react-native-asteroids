import { Component, Entity, WorldSnapshot, ComponentDataSnapshot, SerializedComponent } from "../types/EngineTypes";
import { AnyCoreComponent, ComponentOf } from "./CoreComponents";
import { System, SystemConfig, SystemPhase } from "./System";
import { RandomService } from "../utils/RandomService";
import { Query } from "./Query";
import { SystemProfiler } from "../debug/SystemProfiler";
import { WorldCommandBuffer } from "./WorldCommandBuffer";

interface RegisteredSystem {
  system: System;
  phase: string;
  priority: number;
}

/**
 * ECS World - Central registry managing the lifecycle of entities, components, and systems.
 *
 * API status: Public
 */
export class World {
  /** @internal */
  private activeEntities = new Set<Entity>();
  /** @internal */
  public isUpdating = false;
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
  private profilers: Map<System, SystemProfiler> = new Map();
  /**
   * Whether system profiling is enabled.
   */
  public debugMode = false;
  /** @internal */
  private nextEntityId = 1;
  /** @internal */
  private freeEntities: Entity[] = [];
  private resources = new Map<string, unknown>();
  /**
   * Incremented on structural changes (entity creation/destruction, component addition/removal).
   */
  private _structureVersion = 0;
  /** @internal */
  private _entitiesCache: Entity[] = [];
  /** @internal */
  private _entitiesCacheVersion = -1;
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
      this._entitiesCache = Array.from(this.activeEntities).sort((a, b) => a - b);
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
   * Generates a serializable snapshot of the entire world state for rollback or persistence.
   */
  public snapshot(): WorldSnapshot {
    const gameplayRandom = RandomService.getInstance("gameplay");
    const componentData: ComponentDataSnapshot = {};

    // Deterministic sort of component types
    const sortedTypes = Array.from(this.componentMaps.keys()).sort();

    for (const type of sortedTypes) {
      const map = this.componentMaps.get(type)!;
      componentData[type] = {};

      // Deterministic sort of entities
      const sortedEntities = Array.from(map.keys()).sort((a, b) => a - b);

      for (const entity of sortedEntities) {
        const component = map.get(entity)!;
        const serializedComp: SerializedComponent = {};
        const compAsRecord = component as unknown as Record<string, unknown>;

        for (const key in compAsRecord) {
          if (typeof compAsRecord[key] !== "function") {
            serializedComp[key] = compAsRecord[key];
          }
        }

        if (type === "Reclaimable") {
            delete (serializedComp as SerializedComponent).onReclaim;
        }

        if (type === "Juice") {
          const juiceComp = serializedComp as unknown as { animations: Array<{ onComplete?: unknown }> };
          if (Array.isArray(juiceComp.animations)) {
            juiceComp.animations = juiceComp.animations.map((anim) => {
              const { onComplete: _, ...rest } = anim;
              return rest;
            });
          }
        }

        // structuredClone is much faster and safer than JSON.parse(JSON.stringify)
        componentData[type][entity] = structuredClone(serializedComp) as SerializedComponent;
      }
    }

    return {
      entities: Array.from(this.activeEntities).sort((a, b) => a - b),
      componentData,
      nextEntityId: this.nextEntityId,
      freeEntities: [...this.freeEntities].sort((a, b) => a - b),
      structureVersion: this._structureVersion,
      stateVersion: this._stateVersion,
      seed: gameplayRandom.getSeed()
    };
  }

  /**
   * Restores the world state from a previously captured snapshot.
   */
  public restore(state: WorldSnapshot): void {
    this.activeEntities = new Set(state.entities);
    this.nextEntityId = state.nextEntityId;
    this.freeEntities = [...state.freeEntities];
    this._structureVersion = state.structureVersion;
    this._stateVersion = state.stateVersion;

    if (state.seed !== undefined) {
        RandomService.getInstance("gameplay").setSeed(state.seed);
    }

    // Clear and rebuild component maps
    this.componentMaps.clear();
    this.componentIndex.clear();
    this.entityComponentSets.clear();

    this.componentVersions.clear();

    for (const type in state.componentData) {
      const storage = new Map<Entity, Component>();
      const index = new Set<Entity>();
      const versions = new Map<Entity, number>();
      this.componentMaps.set(type, storage);
      this.componentIndex.set(type, index);
      this.componentVersions.set(type, versions);

      for (const entityIdStr in state.componentData[type]) {
        const entityId = parseInt(entityIdStr);
        const component = state.componentData[type][entityId] as unknown as Component;
        storage.set(entityId, component);
        index.add(entityId);
        versions.set(entityId, this._stateVersion);

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

    this.commandBuffer.clear();

    // Re-attach Reclaimable functions if any pool exists in resources
    const reclaimableMap = this.componentMaps.get("Reclaimable");
    if (reclaimableMap) {
        this.resources.forEach(resource => {
            if (resource && typeof (resource as Record<string, unknown>).release === "function") {
                reclaimableMap.forEach((comp: Component, _entity) => {
                    (comp as unknown as Record<string, unknown>).onReclaim = (w: World, e: Entity) => (resource as { release: (w: World, e: Entity) => void }).release(w, e);
                });
            }
        });
    }
  }

  /**
   * Reservers a new entity ID without activating it in the world yet.
   * Safe to call during update().
   * API status: Public
   */
  public reserveEntityId(): Entity {
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

    // If an ID was provided manually, ensure nextEntityId stays ahead
    if (id !== undefined && id >= this.nextEntityId) {
      this.nextEntityId = id + 1;
    }

    // Incremented in reserveEntityId or here if id was provided
    if (id !== undefined) this._structureVersion++;
    
    return entityId;
  }

  /**
   * Unregisters all systems from all execution phases.
   */
  clearSystems(): void {
    this.systems = [];
    this.sortedSystems = [];
    this.systemsNeedSorting = false;
    this._systemsVersion++;
    this._structureVersion++;
  }

  /**
   * Adds or replaces a component on a specific entity.
   */
  addComponent<T extends Component>(entity: Entity, component: T): Readonly<T> {
    this.assertCanMutateStructure("addComponent");

    const type = component.type;

    if (type === "Transform") {
      const transform = component as unknown as { parent?: Entity };
      if (transform.parent !== undefined) {
        if (!this.activeEntities.has(transform.parent)) {
          transform.parent = undefined;
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
      this._structureVersion++;
    }

    this._stateVersion++;
    this.updateComponentVersion(entity, type);
    return component;
  }

  /**
   * Returns the live mutable component reference stored in the World.
   *
   * API status: Public
   */
  public getComponent<TType extends AnyCoreComponent["type"]>(entity: Entity, type: TType): ComponentOf<TType> | undefined;
   /** @internal */ public getComponent<T extends Component>(entity: Entity, type: string): T | undefined;
  public getComponent<T extends Component>(entity: Entity, type: string): T | undefined {
    return this.componentMaps.get(type)?.get(entity) as T | undefined;
  }

  /**
   * Performs an immediate mutation on a component.
   *
   * API status: Public
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
   * Checks for entity existence in O(1) time.
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
  public query(...componentTypes: string[]): ReadonlyArray<Entity> {
    if (componentTypes.length === 0) return [];
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

    return query.getEntities();
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
      this.freeEntities.push(entity);
      this._structureVersion++;
    }
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
      structureVersion: this._structureVersion
    };
  }

  /**
   * Resets the entire world state.
   */
  public clear(): void {
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
  getResource<T>(name: string): Readonly<T> | undefined {
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
    // Prevent duplicate system instances
    for (const reg of this.systems) {
      if (reg.system === system) return;
    }

    const phase = config.phase ?? SystemPhase.Simulation;
    const priority = config.priority ?? 0;
    this.systems.push({ system, phase, priority });
    this.systemsNeedSorting = true;
    this._systemsVersion++;
  }

  /**
   * Orchestrates a simulation tick by executing systems in order.
   */
  update(deltaTime: number): void {
    this._tick++;
    if (this.systemsNeedSorting) this.sortSystems();

    this.isUpdating = true;
    try {
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
    } finally {
      this.isUpdating = false;
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
      if (componentMap.delete(entity)) {
        this.componentIndex.get(type)?.delete(entity);
        this.componentVersions.get(type)?.delete(entity);
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
  public getSingleton<TType extends AnyCoreComponent["type"]>(type: TType): ComponentOf<TType> | undefined;
  public getSingleton<T extends Component>(type: string): T | undefined;
  public getSingleton<T extends Component>(type: string): T | undefined {
    const [entity] = this.query(type);
    if (entity === undefined) return undefined;
    return this.getComponent(entity, type);
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

  private ensureComponentStorage(type: string): void {
    if (!this.componentMaps.has(type)) {
      this.componentMaps.set(type, new Map());
      this.componentIndex.set(type, new Set());
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

const __DEV__ = process.env.NODE_ENV !== "production";
