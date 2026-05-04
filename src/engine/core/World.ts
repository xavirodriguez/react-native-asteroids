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
 * @responsibility Manage entity creation and destruction (ID recycling).
 * @responsibility Provide high-performance access to component storage.
 * @responsibility Orchestrate system execution across specific phases.
 * @responsibility Maintain global shared resources.
 *
 * @remarks
 * The `World` is the core of the ECS architecture. It is designed to minimize GC pressure
 * through entity ID pooling and utilizes reactive cached queries to optimize system lookups.
 *
 * ### State Versioning System:
 * - **structureVersion**: Incremented on structural changes (adding/removing entities or components).
 *   Used to invalidate cached query results.
 * - **stateVersion**: Incremented on data mutations (via `mutateComponent` or `mutateSingleton`).
 *   Fundamental for the **Delta Replication** system to detect what changed since the last ACK.
 *
 * ### Performance Invariants:
 * 1. **Structural Buffering**: During `update()`, structural changes are deferred to a
 *    `WorldCommandBuffer` to prevent iterator invalidation in active queries.
 * 2. **Snapshotting Cost**: Methods like `snapshot()` and `deltaSnapshot()` are O(N) relative
 *    to component counts. Use sparingly in high-frequency paths.
 *
 * @conceptualRisk [VERSION_OVERFLOW][LOW] Versions are 32-bit integers; sessions lasting
 * years might trigger overflow, though engine resets usually happen much earlier.
 * @conceptualRisk [GC_PRESSURE][MEDIUM] Frequent snapshots in worlds with >1000 entities
 * will increase garbage collection frequency.
 *
 * @example
 * ```ts
 * const world = new World();
 * const player = world.createEntity();
 * world.addComponent(player, { type: 'Transform', x: 0, y: 0 });
 * world.addSystem(new PhysicsSystem());
 * world.update(16.6);
 * ```
 *
 * @public
 */
export class World {
  /** @internal */
  private activeEntities = new Set<Entity>();
  /** @internal */
  private isUpdating = false;
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
   *
   * @remarks
   * When enabled, the world tracks execution time for each system, accessible via {@link getSystemTiming}.
   */
  public debugMode = false;
  /** @internal */
  private nextEntityId = 1;
  /** @internal */
  private freeEntities: Entity[] = [];
  private resources = new Map<string, unknown>();
  /**
   * Incremented on structural changes (entity creation/destruction, component addition/removal).
   * Used to invalidate caches in systems that iterate over all entities.
   */
  private _structureVersion = 0;
  /** @internal */
  private _entitiesCache: Entity[] = [];
  /** @internal */
  private _entitiesCacheVersion = -1;
  /**
   * Incremented on data changes or manual notification.
   * Used by the Renderer and Network systems to detect mutations within components.
   */
  private _stateVersion = 0;
  /**
   * Tracks the state version of each component per entity.
   *
   * @internal
   */
  public componentVersions = new Map<string, Map<Entity, number>>();
  /** Current simulation tick. */
  private _tick = 0;

  /**
   * Current structural version of the world.
   *
   * @remarks
   * Increments when entities are created/destroyed or components are added/removed.
   * Inferences: Used for cache invalidation in queries.
   */
  public get structureVersion(): number { return this._structureVersion; }

  /**
   * Current data state version of the world.
   *
   * @remarks
   * Increments on data mutations within components.
   * Crucial for the Delta Replication system to detect modified state since a known tick.
   */
  public get stateVersion(): number { return this._stateVersion; }

  /**
   * Current authoritative simulation tick.
   *
   * @remarks
   * Represents the number of fixed-step updates that have occurred.
   */
  public get tick(): number { return this._tick; }

  /**
   * Manually advances the simulation tick.
   *
   * @remarks
   * Used by external orchestrators (e.g., room handlers) that manage simulation timing.
   * Does not trigger a system update; use {@link update} for that.
   */
  public advanceTick(): void {
    this._tick++;
  }

  private _renderDirty = false;
  private commandBuffer = new WorldCommandBuffer();

  /**
   * Sorted list of all active entities in the world.
   *
   * @remarks
   * Employs a reactive caching mechanism based on {@link structureVersion} to avoid
   * expensive re-sorting. In development, the returned array is frozen.
   *
   * @returns A read-only array of {@link Entity} IDs.
   */
  public get entities(): ReadonlyArray<Entity> {
    if (this._entitiesCacheVersion !== this._structureVersion) {
      this._entitiesCache = Array.from(this.activeEntities).sort((a, b) => a - b);
      if (__DEV__) {
        Object.freeze(this._entitiesCache);
      }
      this._entitiesCacheVersion = this._structureVersion;
    }
    return this._entitiesCache;
  }

  /**
   * Registered systems sorted by phase and priority.
   *
   * @remarks
   * Internal cache invalidated when system registration or phase order changes.
   *
   * @returns A read-only array of {@link System} instances.
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
   *
   * @remarks
   * Captures active entities, serializable component data, ID counters, world versions,
   * and the current gameplay random seed. Entities are sorted for deterministic reconstruction.
   *
   * @returns A plain object containing the captured serializable state.
   *
   * @warning Serialization is limited to POJO-compatible properties. Functions, Symbols,
   * and non-serializable objects (Maps, Sets) are omitted or may lose fidelity.
   *
   * @precondition Recommended to call outside of an active system update to ensure logical consistency.
   * @postcondition Returns a deep copy (via `structuredClone`) of serializable component data.
   *
   * @conceptualRisk [JSON_DETERMINISM][MEDIUM] Property order is not guaranteed across all environments.
   * @conceptualRisk [GC_PRESSURE][MEDIUM] Frequent snapshots in large worlds increase GC overhead.
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
          const juiceComp = serializedComp as any;
          if (Array.isArray(juiceComp.animations)) {
            juiceComp.animations = juiceComp.animations.map((anim: any) => {
              const { onComplete, ...rest } = anim;
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
   *
   * @remarks
   * Rebuilds component maps, indices, and syncs existing queries to maintain consistency
   * without breaking references to {@link Query} objects.
   *
   * @param state - The state object obtained from {@link World.snapshot}.
   *
   * @precondition The state must be compatible with the engine version.
   * @postcondition Versions (state and structure) are synchronized with the restored values.
   * @sideEffect Clears current world state, resources remain untouched unless they depend on entities.
   * @sideEffect Re-seeds `RandomService("gameplay")`.
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
   * Requests the creation of a new entity, recycling IDs from the free pool when available.
   *
   * @remarks
   * Employs ID recycling to mitigate GC pressure during high-frequency spawn/despawn cycles.
   * Increments {@link structureVersion} to signal topological changes.
   *
   * If called during {@link update}, creation is deferred via {@link WorldCommandBuffer}
   * until the simulation phase completes.
   *
   * @param id - Optional manual Entity ID. Primary use is state restoration or internal orchestration.
   * @returns A unique {@link Entity} identifier.
   *
   * @postcondition Entity is registered as active or queued for activation.
   * @sideEffect Increments {@link World.structureVersion}.
   */
  public createEntity(id?: Entity): Entity {
    const entityId = id ?? (this.freeEntities.length > 0 ? this.freeEntities.pop()! : this.nextEntityId++);

    if (this.isUpdating) {
      this.commandBuffer.createEntity(entityId);
      return entityId;
    }

    this.activeEntities.add(entityId);

    // If an ID was provided manually, ensure nextEntityId stays ahead
    if (id !== undefined && id >= this.nextEntityId) {
      this.nextEntityId = id + 1;
    }

    this._structureVersion++;
    return entityId;
  }

  /**
   * Unregisters all systems from all execution phases.
   *
   * @postcondition The system execution list is empty.
   * @sideEffect Increments {@link structureVersion}.
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
   *
   * @remarks
   * Validates hierarchical integrity if the component is a 'Transform'.
   * Triggers incremental query index updates via {@link notifyQueries}.
   *
   * If called during {@link update}, the operation is buffered to prevent iterator invalidation.
   *
   * @param entity - Target Entity ID.
   * @param component - Component instance (must have a `type` discriminator).
   * @returns The added component.
   *
   * @precondition Entity must exist in the world.
   * @postcondition Component is accessible via {@link getComponent} or {@link query}.
   * @throws {Error} If assigning an entity as its own parent in a Transform.
   * @sideEffect Increments {@link stateVersion}.
   * @sideEffect Increments {@link structureVersion} if the component type is new for this entity.
   */
  addComponent<T extends Component>(entity: Entity, component: T): Readonly<T> {
    if (this.isUpdating) {
      this.commandBuffer.addComponent(entity, component);
      return component;
    }

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
   * @remarks
   * Direct mutations of the returned object bypass engine state tracking unless
   * manually notified via {@link notifyStateChange}.
   * Prefer {@link mutateComponent} for controlled mutations that update versioning automatically.
   *
   * @param entity - The entity to query.
   * @param type - The discriminator name of the component.
   * @returns The component instance or `undefined` if it doesn't exist.
   */
  public getComponent<TType extends AnyCoreComponent["type"]>(entity: Entity, type: TType): ComponentOf<TType> | undefined;
  public getComponent<T extends Component>(entity: Entity, type: string): T | undefined;
  public getComponent<T extends Component>(entity: Entity, type: string): T | undefined {
    return this.componentMaps.get(type)?.get(entity) as T | undefined;
  }

  /**
   * Performs an immediate mutation on a component.
   *
   * @remarks
   * Recommended pattern for component state changes.
   * Updates {@link stateVersion}, component-specific versions, and marks {@link isRenderDirty}.
   *
   * @param entity - The owner entity.
   * @param type - The component type discriminator.
   * @param updater - Callback receiving the mutable component instance.
   * @returns `true` if the component exists and was mutated, `false` otherwise.
   *
   * @example
   * ```ts
   * world.mutateComponent(player, 'Transform', t => {
   *   t.x += 10;
   * });
   * ```
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
   *
   * @param entity - The Entity ID to verify.
   * @returns `true` if the entity is currently active.
   */
  public hasEntity(entity: Entity): boolean {
    return this.activeEntities.has(entity);
  }

  /**
   * Checks if an entity possesses a specific component.
   *
   * @param entity - Target entity.
   * @param type - Component type discriminator.
   * @returns `true` if the entity has the component.
   */
  hasComponent(entity: Entity, type: string): boolean {
    return this.componentIndex.get(type)?.has(entity) ?? false;
  }

  /**
   * Removes a component from an entity.
   *
   * @remarks
   * Notifies reactive queries to update their indices.
   * If called during {@link update}, removal is buffered.
   *
   * @param entity - Target entity.
   * @param type - Component type to remove.
   *
   * @precondition Entity should exist in the world.
   * @postcondition Queries depending on this component will no longer include this entity.
   * @sideEffect Increments {@link structureVersion}.
   */
  removeComponent(entity: Entity, type: string): void {
    if (this.isUpdating) {
      this.commandBuffer.removeComponent(entity, type);
      return;
    }

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
   *
   * @remarks
   * Utilizes reactive caching. If a query for the signature already exists,
   * the cached result is returned. Updates are incremental and triggered by
   * structural changes.
   *
   * @param componentTypes - Component types defining the query signature.
   * @returns A read-only array of matching {@link Entity} IDs, sorted.
   *
   * @warning **Dynamic Queries**: Avoid dynamic signatures inside update loops.
   * Signature sorting and key generation have O(N log N) cost.
   *
   * @example
   * ```ts
   * const dynamicEntities = world.query('Transform', 'Velocity');
   * for (const id of dynamicEntities) { ... }
   * ```
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
   *
   * @remarks
   * Releases the ID for future recycling. Clears all component indices and
   * query associations.
   *
   * If called during {@link update}, destruction is deferred.
   *
   * @param entity - Entity ID to destroy.
   * @postcondition Entity is inaccessible and its components are deleted.
   * @sideEffect Increments {@link structureVersion}.
   */
  public removeEntity(entity: Entity): void {
    if (this.isUpdating) {
      this.commandBuffer.removeEntity(entity);
      return;
    }

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
   *
   * @remarks
   * Essential for making changes safely during system updates to avoid
   * iterator invalidation.
   *
   * @returns The {@link WorldCommandBuffer} instance.
   */
  public getCommandBuffer(): WorldCommandBuffer {
    return this.commandBuffer;
  }

  /**
   * Consolidates all buffered structural mutations.
   *
   * @remarks
   * Automatically called at the end of {@link update}. Should be called
   * manually if using the command buffer outside the standard loop.
   *
   * @sideEffect Executes deferred creations, additions, and removals.
   */
  public flush(): void {
    this.commandBuffer.flush(this);
  }

  /**
   * Generates a partial snapshot containing modified components since a version.
   *
   * @remarks
   * Foundation for the authoritative delta synchronization system.
   * Compares stored component versions with `sinceVersion`.
   *
   * @param sinceVersion - Last acknowledged state version.
   * @param filterEntities - Optional set for Interest Management (spatial culling).
   * @returns Partial {@link WorldSnapshot} with changed data.
   *
   * @conceptualRisk [PERFORMANCE][HIGH] Cost is proportional to the total number of components.
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
   *
   * @remarks
   * Clears entities, components, resources, and command buffers.
   * Systems registration remains intact.
   *
   * @postcondition World is empty.
   * @sideEffect Increments {@link structureVersion}.
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
   *
   * @remarks
   * Resources are shared services or configurations not attached to entities
   * (e.g., EventBus, AssetLoader).
   *
   * @param name - Resource identifier.
   * @param resource - Instance or data object.
   *
   * @postcondition Resource is accessible via {@link getResource}.
   * @sideEffect Overwrites any existing resource with the same name.
   */
  setResource<T>(name: string, resource: T): void {
    this.resources.set(name, resource);
  }

  /**
   * Retrieves a registered global resource.
   *
   * @param name - Resource identifier.
   * @returns The resource (Readonly) or `undefined`.
   */
  getResource<T>(name: string): Readonly<T> | undefined {
    return this.resources.get(name) as T;
  }

  /**
   * Performs a controlled mutation on a global resource.
   *
   * @remarks
   * Automatically notifies the engine of state changes by incrementing {@link stateVersion}.
   *
   * @param name - Resource to mutate.
   * @param mutator - Callback receiving the mutable resource.
   *
   * @postcondition {@link stateVersion} is incremented.
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
   *
   * @remarks
   * Systems are sorted by phase and priority during the next {@link update}.
   *
   * @param system - System instance.
   * @param config - Execution configuration (phase, priority).
   *
   * @precondition System must not be already registered.
   * @sideEffect Triggers re-sorting of systems in the next update cycle.
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
   *
   * @remarks
   * Execution Flow:
   * 1. Re-sort systems if needed.
   * 2. Sequential execution by phase (Input -> Simulation -> Collision -> GameRules -> Presentation).
   * 3. Consolidate structural changes via {@link flush}.
   *
   * @param deltaTime - Elapsed time since last tick in milliseconds.
   *
   * @postcondition Simulation state advances and deferred mutations are applied.
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
   *
   * @remarks
   * Requires {@link debugMode} to be enabled.
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
   *
   * @remarks
   * Increments {@link stateVersion} and marks {@link isRenderDirty}.
   * Use this when mutating component data directly without using {@link mutateComponent}.
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
   *
   * @remarks
   * Convenient for unique components (e.g., GlobalGameState, Config).
   * Use {@link mutateSingleton} for controlled updates.
   *
   * @param type - Component discriminator.
   * @returns Found instance or `undefined`.
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
   * @remarks
   * Preferred way to update unique state components. Automatically notifies
   * changes by updating versions and {@link isRenderDirty}.
   *
   * @param type - Component type discriminator.
   * @param updater - Callback for modification.
   * @returns `true` if mutated, `false` otherwise.
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
   * @deprecated Use {@link structureVersion} or {@link stateVersion} instead.
   */
  public get version(): number {
    return this._structureVersion + this._stateVersion;
  }

  /**
   * Alias of {@link query} for entities with a specific signature.
   * @deprecated Use {@link query} directly.
   */
  public getEntitiesWith(...componentTypes: string[]): ReadonlyArray<Entity> {
    return this.query(...componentTypes);
  }

  /** @deprecated Use {@link entities} getter. */
  public getAllEntities(): ReadonlyArray<Entity> {
    return this.entities;
  }
}

const __DEV__ = process.env.NODE_ENV !== "production";
