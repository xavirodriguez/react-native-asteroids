/**
 * @packageDocumentation
 * Core ECS World implementation.
 */

import { ComponentRegistry, ComponentType, DeepReadonly } from "./Component";
import { Entity } from "./Entity";
import { EventRegistry } from "../events/EventBus";
import { Query } from "./Query";
import { System, SystemPhase, SystemConfig } from "./System";
import { RandomService } from "../utils/RandomService";
import { WorldSnapshot, ComponentDataSnapshot, SerializedComponent } from "./SnapshotTypes";
import { ComponentCloner } from "./ComponentCloner";
import { WorldCommandBuffer } from "./WorldCommandBuffer";

/**
 * Interface for entity blueprints.
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
  private commandBuffer = new WorldCommandBuffer<TComponents>();

  public renderRandom = new RandomService();

  private _structureVersion = 0;
  private _stateVersion = 0;
  private componentVersions = new Map<string, Map<Entity, number>>();
  private _gameplayRandom = new RandomService();

  public debugMode = false;

  public get tick(): number { return this._tick; }
  public get structureVersion(): number { return this._structureVersion; }
  public get stateVersion(): number { return this._stateVersion; }
  public get gameplayRandom(): RandomService { return this._gameplayRandom; }
  public getCommandBuffer(): WorldCommandBuffer<TComponents> { return this.commandBuffer; }

  public get entities(): ReadonlyArray<Entity> {
    return Array.from(this.activeEntities).sort((a, b) => a - b);
  }

  createEntity(): Entity {
    const id = this.freeEntities.length > 0 ? this.freeEntities.pop()! : this.nextEntityId++;
    this.activeEntities.add(id);
    this._structureVersion++;
    return id;
  }

  reserveEntityId(): Entity {
    return this.nextEntityId++;
  }

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
    const type = (component as any).type;
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

  public hasComponent(entity: Entity, type: string): boolean {
    return this.componentIndex.get(type)?.has(entity) ?? false;
  }

  getComponent<T extends TComponents[keyof TComponents]>(entity: Entity, type: string): DeepReadonly<T> | undefined {
    return this.componentMaps.get(type)?.get(entity) as DeepReadonly<T> | undefined;
  }

  getMutableComponent<T extends TComponents[keyof TComponents]>(entity: Entity, type: string): T | undefined {
    const component = this.componentMaps.get(type)?.get(entity) as T | undefined;
    if (component) {
      this._stateVersion++;
      this.updateComponentVersion(entity, type);
    }
    return component;
  }

  removeComponent(entity: Entity, type: string): void {
    const map = this.componentMaps.get(type);
    if (map && map.delete(entity)) {
      this.componentIndex.get(type)?.delete(entity);
      this.componentVersions.get(type)?.delete(entity);
      const set = this.entityComponentSets.get(entity);
      if (set) {
        set.delete(type);
        this.notifyQueries(entity, set, type);
      }
      this._structureVersion++;
    }
  }

  mutateComponent<T extends TComponents[keyof TComponents]>(
    entity: Entity,
    type: string,
    updater: (component: T) => void
  ): boolean {
    const component = this.getMutableComponent<T>(entity, type);
    if (!component) return false;
    updater(component);
    return true;
  }

  getQuery(...componentTypes: string[]): Query<TComponents> {
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

  query(...componentTypes: string[]): ReadonlyArray<Entity> {
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
      phase: config.phase ?? SystemPhase.Simulation,
      priority: config.priority ?? 0
    });
    system.onRegister(this);
  }

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

  getSingleton<T extends TComponents[keyof TComponents]>(type: string): DeepReadonly<T> | undefined {
    const entities = this.query(type);
    if (entities.length === 0) return undefined;
    return this.getComponent<T>(entities[0], type);
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

  public snapshot(target?: WorldSnapshot): WorldSnapshot {
    const componentData: ComponentDataSnapshot = target?.componentData ?? {};

    this.activeEntities.forEach(entity => {
      const componentSet = this.entityComponentSets.get(entity);
      if (!componentSet) return;

      for (const type of componentSet) {
        const map = this.componentMaps.get(type);
        if (!map) continue;
        const component = map.get(entity);
        if (!component) continue;

        if (!componentData[type]) componentData[type] = {};

        let serializedComp = componentData[type][entity];
        if (!serializedComp) {
          serializedComp = {};
          componentData[type][entity] = serializedComp;
        }

        const compAsRecord = component as Record<string, unknown>;
        for (const key in compAsRecord) {
          const val = compAsRecord[key];
          if (typeof val !== "function") {
            serializedComp[key] = ComponentCloner.cloneComponent(val);
          }
        }
      }
    });

    return {
      entities: Array.from(this.activeEntities).sort((a, b) => a - b),
      componentData,
      nextEntityId: this.nextEntityId,
      freeEntities: [...this.freeEntities],
      structureVersion: this._structureVersion,
      stateVersion: this._stateVersion,
      seed: this._gameplayRandom.getSeed(),
      rngState: this._gameplayRandom.getSeed(),
      tick: this._tick
    };
  }

  public restore(state: WorldSnapshot): void {
    this.activeEntities = new Set(state.entities);
    this.nextEntityId = state.nextEntityId;
    this.freeEntities = [...state.freeEntities];
    this._structureVersion = state.structureVersion;
    this._stateVersion = state.stateVersion;
    this._tick = state.tick;

    if (state.rngState !== undefined) {
      this._gameplayRandom.setSeed(state.rngState);
    } else if (state.seed !== undefined) {
      this._gameplayRandom.setSeed(state.seed);
    }

    this.entityComponentSets.clear();
    this.componentMaps.clear();
    this.componentIndex.clear();
    this.componentVersions.clear();

    for (const type in state.componentData) {
      const storage = new Map<Entity, unknown>();
      const index = new Set<Entity>();
      const versions = new Map<Entity, number>();

      this.componentMaps.set(type, storage);
      this.componentIndex.set(type, index);
      this.componentVersions.set(type, versions);

      const snapshotEntities = state.componentData[type];
      for (const entityIdStr in snapshotEntities) {
        const entityId = parseInt(entityIdStr);
        const sourceComp = snapshotEntities[entityId];
        const component = ComponentCloner.cloneComponent(sourceComp);

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

    this.queries.forEach(query => {
      query.rebuild(this.activeEntities, this.entityComponentSets);
    });
  }

  public deltaSnapshot(sinceVersion: number): Partial<WorldSnapshot> {
    const componentData: ComponentDataSnapshot = {};

    this.componentMaps.forEach((map, type) => {
      const typeVersions = this.componentVersions.get(type);
      if (!typeVersions) return;

      const typeData: Record<number, SerializedComponent> = {};
      let hasData = false;

      map.forEach((component, entity) => {
        const version = typeVersions.get(entity) ?? 0;
        if (version > sinceVersion) {
          const serializedComp: SerializedComponent = {};
          const compAsRecord = component as Record<string, unknown>;

          for (const key in compAsRecord) {
            if (typeof compAsRecord[key] !== "function") {
              serializedComp[key] = ComponentCloner.cloneComponent(compAsRecord[key]);
            }
          }
          typeData[entity] = serializedComp;
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
}
