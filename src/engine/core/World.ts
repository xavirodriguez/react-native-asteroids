import { Component, IHierarchicalComponent } from "./CoreComponents";
import { Entity } from "./Entity";
import { WorldSnapshot, ComponentDataSnapshot, SerializedComponent } from "../types/EngineTypes";
import {
  ComponentRegistry,
  ComponentType,
  ComponentOf,
  DeepReadonly,
  BlueprintRegistryMap
} from "./Component";
import { EventRegistry, EventBus } from "./EventBus";
import { System, SystemConfig, SystemPhase } from "./System";
import { RandomService } from "../utils/RandomService";
import { ComponentCloner } from "./ComponentCloner";
import { Query } from "./Query";
import { SystemProfiler } from "../debug/SystemProfiler";
import { WorldCommandBuffer } from "./WorldCommandBuffer";
import { BlueprintRegistry, BlueprintArgs } from "./BlueprintRegistry";

interface RegisteredSystem<TComponents extends ComponentRegistry, TEvents extends EventRegistry, TBlueprints extends BlueprintRegistryMap<TComponents>> {
  system: System<TComponents, TEvents, TBlueprints>;
  phase: string;
  priority: number;
}

/**
 * ECS World - Central registry managing the lifecycle of entities, components, and systems.
 *
 * @remarks
 * The World acts as the central hub for the ECS architecture. It is designed to coordinate
 * entity lifecycle, component storage, and system orchestration. While it attempts to
 * reduce overhead in common execution paths, performance and consistency are
 * influenced by the JavaScript environment, execution context, and adherence
 * to the engine's recommended mutation patterns (e.g., using {@link World.mutateComponent}).
 *
 * @public
 */
const __DEV__ = process.env.NODE_ENV !== "production";
const RAW_DATA = Symbol("RAW_DATA");

export { Entity } from "./Entity";

export class World<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private activeEntities = new Set<Entity>();
  public isUpdating = false;
  public isReSimulating = false;
  private componentMaps = new Map<string, Map<Entity, any>>();
  private componentIndex = new Map<string, Set<Entity>>();
  private entityComponentSets = new Map<Entity, Set<string>>();
  private queries = new Map<string, Query<TComponents>>();
  private queriesByComponent = new Map<string, Set<Query<TComponents>>>();
  private systems: RegisteredSystem<TComponents, TEvents, TBlueprints>[] = [];
  private sortedSystems: System<TComponents, TEvents, TBlueprints>[] = [];
  private systemsNeedSorting = false;
  private _systemsVersion = 0;
  private _sortedComponentTypes: string[] = [];
  private _componentTypesDirty = true;
  private profilers: Map<System<TComponents, TEvents, TBlueprints>, SystemProfiler> = new Map();
  private componentPool = new Map<string, any[]>();
  public debugMode = false;
  private nextEntityId = 1;
  private freeEntities: Entity[] = [];
  private _freeEntitiesSorted = true;
  private resources = new Map<string, unknown>();
  private _structureVersion = 0;
  private _entitiesCache: Entity[] = [];
  private _entitiesCacheVersion = -1;
  private _entitiesSorted = true;
  private _stateVersion = 0;
  public componentVersions = new Map<string, Map<Entity, number>>();
  private _tick = 0;

  public get structureVersion(): number { return this._structureVersion; }
  public get stateVersion(): number { return this._stateVersion; }
  public get tick(): number { return this._tick; }

  private _gameplayRandom = new RandomService();
  private _renderRandom = new RandomService();

  public get gameplayRandom(): RandomService {
    return this._gameplayRandom;
  }

  public get renderRandom(): RandomService {
    if (RandomService.lockGameplayContext) {
      throw new Error(
        `Deterministic violation: 'render' random accessed via world.renderRandom during simulation.`
      );
    }
    return this._renderRandom;
  }

  public emitSimulationEvent<K extends keyof TEvents & string>(event: K, payload: TEvents[K]): void {
    if (this.isReSimulating) return;
    const busEntry = this.getSingleton("EventBus" as any);
    if (busEntry && (busEntry as any).bus) {
      (busEntry as any).bus.emitDeferred(event, payload);
    }
  }

  /**
   * Increments the internal simulation tick counter.
   */
  public advanceTick(): void {
    this._tick++;
  }

  private _renderDirty = false;
  private commandBuffer = new WorldCommandBuffer<TComponents, TEvents, TBlueprints>();

  public get entities(): ReadonlyArray<Entity> {
    if (this._entitiesCacheVersion !== this._structureVersion) {
      if (!this._entitiesSorted || this._entitiesCache.length !== this.activeEntities.size) {
        this._entitiesCache = Array.from(this.activeEntities).sort((a, b) => a - b);
        this._entitiesSorted = true;
      }
      if (__DEV__ && !Object.isFrozen(this._entitiesCache)) {
        Object.freeze(this._entitiesCache);
      }
      this._entitiesCacheVersion = this._structureVersion;
    }
    return this._entitiesCache;
  }

  private assertCanMutateStructure(operationName: string): void {
    if (this.isUpdating) {
      throw new Error(
        `Structural mutation "${operationName}" during update is forbidden. Use WorldCommandBuffer.`
      );
    }
  }

  public get systemsList(): ReadonlyArray<System<TComponents, TEvents, TBlueprints>> {
    if (this.systemsNeedSorting) {
      this.sortSystems();
    }
    if (__DEV__ && !Object.isFrozen(this.sortedSystems)) {
      Object.freeze(this.sortedSystems);
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

  public snapshot(target?: WorldSnapshot): WorldSnapshot {
    const gameplayRandom = this.gameplayRandom;
    const componentData: ComponentDataSnapshot = target?.componentData ?? {};

    if (this._componentTypesDirty) {
      this._sortedComponentTypes = Array.from(this.componentMaps.keys()).sort();
      this._componentTypesDirty = false;
    }

    for (const type of this._sortedComponentTypes) {
      if (!componentData[type]) {
          componentData[type] = {};
      }
    }

    const allEntities = this.entities;

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
        for (const key in serializedComp) {
            if (!(key in compAsRecord)) {
                delete serializedComp[key];
            }
        }

        for (const key in compAsRecord) {
          const val = compAsRecord[key];
          if (typeof val !== "function") {
            serializedComp[key] = ComponentCloner.cloneComponent(val);
          }
        }
      }
    }

    if (!this._freeEntitiesSorted) {
      this.freeEntities.sort((a, b) => b - a);
      this._freeEntitiesSorted = true;
    }

    for (const type in componentData) {
        const snapshotEntities = componentData[type];
        for (const entityId in snapshotEntities) {
            if (!this.hasComponent(parseInt(entityId), type as any)) {
                delete snapshotEntities[entityId];
            }
        }
    }

    const result = target ?? ({} as WorldSnapshot);
    result.entities = [...allEntities];
    result.componentData = componentData;
    result.nextEntityId = this.nextEntityId;
    result.freeEntities = [...this.freeEntities];
    result.structureVersion = this._structureVersion;
    result.stateVersion = this._stateVersion;
    result.seed = gameplayRandom.getSeed();
    result.rngState = gameplayRandom.getSeed();
    result.accumulator = this.getResource<import("./GameLoop").GameLoop>("GameLoop")?.getAccumulator();
    result.tick = this._tick;
    return result;
  }

  public restore(state: WorldSnapshot): void {
    this.assertCanMutateStructure("restore");
    this.activeEntities = new Set(state.entities);

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
    this._freeEntitiesSorted = false;
    this._structureVersion = state.structureVersion;
    this._stateVersion = state.stateVersion;
    this._tick = state.tick ?? 0;

    if (state.rngState !== undefined) {
        this.gameplayRandom.setSeed(state.rngState);
    } else if (state.seed !== undefined) {
        this.gameplayRandom.setSeed(state.seed);
    }

    if (state.accumulator !== undefined) {
        this.getResource<import("./GameLoop").GameLoop>("GameLoop")?.setAccumulator(state.accumulator);
    }

    this.entityComponentSets.clear();

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
        storage = new Map<Entity, any>();
        index = new Set<Entity>();
        versions = new Map<Entity, number>();
        this.componentMaps.set(type, storage);
        this.componentIndex.set(type, index);
        this.componentVersions.set(type, versions);
      }

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

        let component = storage.get(entityId) as unknown as Record<string, unknown>;
        if (!component) {
          component = {} as Record<string, unknown>;
          storage.set(entityId, component);
        }

        for (const key in component) {
          if (!(key in sourceComp)) {
             (component as Record<string, unknown>)[key] = undefined;
          }
        }

        for (const key in sourceComp) {
          const val = sourceComp[key];
          if (__DEV__) {
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
   *
   * @remarks
   * Intended to be safe for use during the `update()` cycle as it does not
   * immediately modify active entity indices.
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

  public createEntity(id?: Entity): Entity {
    this.assertCanMutateStructure("createEntity");

    const entityId = id ?? this.reserveEntityId();
    this.activeEntities.add(entityId);
    this._entitiesSorted = false;

    if (id !== undefined && id >= this.nextEntityId) {
      this.nextEntityId = id + 1;
    }
    if (id !== undefined) this._structureVersion++;

    return entityId;
  }

  public clearSystems(): void {
    this.assertCanMutateStructure("clearSystems");
    this.systems.forEach((reg) => {
      if (reg.system.onUnregister) reg.system.onUnregister(this);
      if (reg.system.dispose) reg.system.dispose();
    });
    this.systems = [];
    this.sortedSystems = [];
    this.systemsNeedSorting = false;
    this._systemsVersion++;
    this._structureVersion++;
  }

  public addComponent<K extends ComponentType<TComponents>>(entity: Entity, component: TComponents[K]): void {
    this.assertCanMutateStructure("addComponent");
    const type = component.type;

    this.ensureComponentStorage(type);

    let rawComponent = component as any;
    if (__DEV__ && component && (component as any)[RAW_DATA]) {
      rawComponent = (component as any)[RAW_DATA];
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
  }

  public getComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): DeepReadonly<TComponents[K]> | undefined {
    const component = this.componentMaps.get(type as string)?.get(entity) as TComponents[K] | undefined;
    if (__DEV__ && component) {
      return this.createMutationProxy(component as object, type as string, entity) as DeepReadonly<TComponents[K]>;
    }
    return component as DeepReadonly<TComponents[K]> | undefined;
  }

  private createMutationProxy<T extends object>(target: T, type: string, entity: Entity): T {
    return new Proxy(target, {
      get: (obj, prop) => {
        if (prop === RAW_DATA) return obj;
        return (obj as any)[prop];
      },
      set: (obj, prop, value) => {
        console.error(
          `[World] ILLEGAL MUTATION DETECTED: Direct write to "${String(prop)}" on component "${type}" (Entity ${entity}).`
        );
        (obj as any)[prop] = value;
        return true;
      }
    });
  }

  public mutateComponent<K extends ComponentType<TComponents>>(
    entity: Entity,
    type: K,
    updater: (component: TComponents[K]) => void
  ): boolean {
    const component = this.componentMaps.get(type as string)?.get(entity) as TComponents[K] | undefined;
    if (component === undefined) return false;

    updater(component);
    this._stateVersion++;
    this.updateComponentVersion(entity, type as string);
    this._renderDirty = true;
    return true;
  }

  /**
   * Checks for entity existence.
   *
   * @remarks
   * Performance is typically O(1) via internal Set lookup.
   */
  public hasEntity(entity: Entity): boolean {
    return this.activeEntities.has(entity);
  }

  public hasComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): boolean {
    return this.componentIndex.get(type as string)?.has(entity) ?? false;
  }

  public removeComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): void {
    this.assertCanMutateStructure("removeComponent");

    const componentMap = this.componentMaps.get(type as string);
    if (componentMap && componentMap.delete(entity)) {
      this.componentIndex.get(type as string)?.delete(entity);
      this.componentVersions.get(type as string)?.delete(entity);
      const componentSet = this.entityComponentSets.get(entity);
      if (componentSet) {
        componentSet.delete(type as string);
        this.notifyQueries(entity, componentSet, type as string);
      }
      this._structureVersion++;
    }
  }

  public getQuery(...componentTypes: ComponentType<TComponents>[]): Query<TComponents> {
    if (componentTypes.length === 0) throw new Error("World.getQuery requires at least one component type.");
    const key = componentTypes.length === 1 ? (componentTypes[0] as string) : [...componentTypes].sort().join(",");
    let query = this.queries.get(key);

    if (!query) {
      query = new Query(componentTypes as string[]);
      this.queries.set(key, query);
      for (const type of componentTypes) {
        let set = this.queriesByComponent.get(type as string);
        if (!set) {
          set = new Set();
          this.queriesByComponent.set(type as string, set);
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

  public query(...componentTypes: ComponentType<TComponents>[]): ReadonlyArray<Entity> {
    if (componentTypes.length === 0) return [];
    return this.getQuery(...componentTypes).getEntities();
  }

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

  public spawnFromBlueprint<TId extends keyof TBlueprints & string>(
    blueprintId: TId,
    args: BlueprintArgs<TBlueprints, TId>
  ): Entity {
    const blueprintRegistry = this.getResource<BlueprintRegistry<TComponents, TBlueprints>>("BlueprintRegistry");
    if (!blueprintRegistry) {
        throw new Error("BlueprintRegistry resource not found in world.");
    }
    const blueprint = blueprintRegistry.get(blueprintId);
    if (!blueprint) {
        throw new Error(`Blueprint ${blueprintId} not found in registry.`);
    }
    const entity = this.createEntity();
    blueprint.spawn(this, entity, args);
    return entity;
  }

  public getCommandBuffer(): WorldCommandBuffer<TComponents, TEvents, TBlueprints> {
    return this.commandBuffer;
  }

  public flush(): void {
    this.commandBuffer.flush(this);
  }

  public deltaSnapshot(sinceVersion: number, filterEntities?: Set<Entity>): Partial<WorldSnapshot> {
    const componentData: ComponentDataSnapshot = {};

    this.componentMaps.forEach((map, type) => {
      const typeVersions = this.componentVersions.get(type);
      if (!typeVersions) return;

      const typeData: Record<Entity, SerializedComponent> = {};
      let hasData = false;

      map.forEach((component, entity) => {
        if (filterEntities && !filterEntities.has(entity)) return;

        const version = typeVersions.get(entity) ?? 0;
        if (version > sinceVersion) {
          const serializedComp: SerializedComponent = {};
          const compAsRecord = component as unknown as Record<string, unknown>;

          for (const key in compAsRecord) {
            if (typeof compAsRecord[key] !== "function") {
              serializedComp[key] = compAsRecord[key] as unknown;
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

  public acquireComponent<K extends ComponentType<TComponents>>(type: K): TComponents[K] | undefined {
    return this.componentPool.get(type as string)?.pop() as TComponents[K] | undefined;
  }

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

  public setResource<T>(name: string, resource: T): void {
    this.resources.set(name, resource);
  }

  public getResource<T>(name: string): T | undefined {
    if (name === "gameplay") return this.gameplayRandom as unknown as T;
    if (name === "render") return this.renderRandom as unknown as T;
    return this.resources.get(name) as T;
  }

  public mutateResource<T>(name: string, mutator: (resource: T) => void): void {
    const resource = this.resources.get(name) as T;
    if (resource) {
      mutator(resource);
      this.notifyStateChange();
    }
  }

  public hasResource(name: string): boolean {
    return this.resources.has(name);
  }

  public removeResource(name: string): void {
    this.resources.delete(name);
  }

  public addSystem(system: System<TComponents, TEvents, TBlueprints>, config: SystemConfig = {}): void {
    this.assertCanMutateStructure("addSystem");

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

  public update(deltaTime: number): void {
    this._tick++;
    if (this.systemsNeedSorting) this.sortSystems();

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
        const systemsInPhase = this.systems.filter(s => s.phase === phase);
        systemsInPhase.sort((a, b) => b.priority - a.priority);

        for (const reg of systemsInPhase) {
          if (this.debugMode) {
            let profiler = this.profilers.get(reg.system);
            if (!profiler) {
              profiler = new SystemProfiler(reg.system as any);
              this.profilers.set(reg.system, profiler);
            }
            profiler.update(this as any, deltaTime);
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

  public getSystemTiming(system: System<TComponents, TEvents, TBlueprints>): number {
    return this.profilers.get(system)?.getAverageTime() ?? 0;
  }

  public getAllSystemTimings(): Record<string, number> {
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

  public getEntityComponentTypes(entity: Entity): string[] {
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
        let pool = this.componentPool.get(type);
        if (!pool) {
          pool = [];
          this.componentPool.set(type, pool);
        }
        pool.push(component);
      }
    });
  }

  public notifyStateChange(): void {
    this._stateVersion++;
    this._renderDirty = true;
  }

  public setRenderDirty(dirty: boolean): void {
    this._renderDirty = dirty;
  }

  public isRenderDirty(): boolean {
    return this._renderDirty;
  }

  public getSingleton<K extends ComponentType<TComponents>>(type: K): DeepReadonly<TComponents[K]> | undefined {
    const [entity] = this.query(type);
    if (entity === undefined) return undefined;
    return this.getComponent(entity, type);
  }

  public getMutableComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): TComponents[K] | undefined {
    const component = this.componentMaps.get(type as string)?.get(entity) as TComponents[K] | undefined;
    if (component) {
      this._stateVersion++;
      this.updateComponentVersion(entity, type as string);
      this._renderDirty = true;
    }
    return component;
  }

  public mutateSingleton<K extends ComponentType<TComponents>>(
    type: K,
    updater: (component: TComponents[K]) => void
  ): boolean {
    const [entity] = this.query(type);
    if (entity !== undefined) {
      return this.mutateComponent(entity, type, updater);
    }
    return false;
  }

  private runTransformPhase(deltaTime: number): void {
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

  public getAllEntities(): ReadonlyArray<Entity> {
    return this.entities;
  }
}
