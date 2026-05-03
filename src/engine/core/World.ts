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
  /** Whether system profiling is enabled. */
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
  /** @internal */
  public componentVersions = new Map<string, Map<Entity, number>>();
  /** Current simulation tick. */
  private _tick = 0;

  /**
   * Obtiene la versión actual de la estructura del mundo.
   * @remarks Se incrementa al crear/destruir entidades o añadir/quitar componentes.
   */
  public get structureVersion(): number { return this._structureVersion; }

  /**
   * Obtiene la versión actual de los datos del mundo.
   * @remarks Se incrementa en cada mutación de datos interna de los componentes.
   * Es fundamental para la replicación delta en red.
   */
  public get stateVersion(): number { return this._stateVersion; }

  /** Obtiene el tick actual de simulación autoritativo. */
  public get tick(): number { return this._tick; }

  /**
   * Manually advances the simulation tick.
   * Used by external orchestrators that manage the timing loop.
   */
  public advanceTick(): void {
    this._tick++;
  }

  private _renderDirty = false;
  private commandBuffer = new WorldCommandBuffer();

  /**
   * Obtiene una lista ordenada de todas las entidades activas.
   *
   * @remarks
   * Utiliza un sistema de caché reactivo basado en {@link World.structureVersion} para
   * evitar re-ordenaciones costosas. En entornos de desarrollo, el array devuelto
   * está congelado para prevenir mutaciones accidentales.
   *
   * @returns Un array de solo lectura de {@link Entity}.
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
   * Obtiene la lista de sistemas registrados ordenados por fase y prioridad.
   *
   * @remarks
   * Utiliza un caché interno que se invalida cuando cambia la composición o el
   * orden de los sistemas. En __DEV__, el array está congelado.
   *
   * @returns Un array de solo lectura de {@link System}.
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
   * Captura entidades activas, datos serializables de componentes, contadores de IDs, versión del mundo
   * y la semilla actual del generador de números aleatorios de gameplay.
   * Las entidades se devuelven ordenadas por ID para favorecer la consistencia en la reconstrucción.
   *
   * @returns Un objeto plano que contiene el estado serializable capturado del mundo.
   *
   * @warning La serialización se limita a propiedades que no sean funciones ni símbolos. Referencias a objetos complejos
   * (clases, mapas, sets) no se restaurarán fielmente si no son POJOs serializables.
   *
   * @precondition Se espera que el estado actual sea consistente; se recomienda evitar llamar durante un update de sistema
   * para favorecer una captura coherente del estado lógico.
   * @postcondition Devuelve una copia profunda (vía `structuredClone`) de los datos serializables de cada componente
   * compatibles con dicho algoritmo.
   *
   * @conceptualRisk [JSON_DETERMINISM][MEDIUM] La serialización no garantiza un orden determinista de las
   * propiedades de los objetos en todos los entornos, lo que puede afectar a la generación de hashes de estado.
   * @conceptualRisk [GC_PRESSURE][MEDIUM] Las snapshots frecuentes, especialmente en mundos con alta densidad
   * de entidades, aumentarán la presión sobre el recolector de basura.
   * @returns El estado serializado del mundo.
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
   * Este método reconstruye los mapas de componentes e índices basándose en los datos serializados restaurables.
   * Intenta sincronizar las queries existentes para mantener la consistencia sin romper las referencias
   * a los objetos Query.
   *
   * @param state - El objeto de estado obtenido de {@link World.snapshot}.
   *
   * @precondition Se espera que el estado proporcionado sea una estructura válida y compatible con la versión del motor.
   * @postcondition El mundo refleja el estado serializable contenido en la instantánea.
   * @postcondition Las versiones de estructura y estado se sincronizan con los valores restaurados.
   * @sideEffect Limpia el estado actual del mundo antes de la restauración.
   * @sideEffect Re-inicializa la semilla de `RandomService("gameplay")`.
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
   * Solicita la creación de una nueva entidad en el mundo, intentando reutilizar IDs de entidades previamente eliminadas.
   *
   * @remarks
   * Utiliza un pool de IDs reciclados con el fin de reducir la presión sobre el GC durante ciclos de vida frecuentes.
   * Incrementa la versión de estructura del mundo para señalizar cambios topológicos.
   *
   * Si se llama durante {@link World.update}, la creación efectiva en los mapas de componentes se difiere
   * mediante un buffer de comandos hasta el final de la fase de simulación.
   *
   * @param id - ID opcional de la entidad. Reservado principalmente para restauraciones de estado o uso interno.
   * @returns Un identificador de {@link Entity}.
   * @postcondition La entidad se registra como activa o queda encolada para su activación.
   * @sideEffect Incrementa {@link World.structureVersion}.
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
   * Elimina todos los sistemas registrados de todas las fases.
   *
   * @postcondition La lista de sistemas queda vacía.
   * @sideEffect Incrementa {@link World.structureVersion}.
   */
  clearSystems(): void {
    this.systems = [];
    this.sortedSystems = [];
    this.systemsNeedSorting = false;
    this._systemsVersion++;
    this._structureVersion++;
  }

  /**
   * Registra o actualiza un componente en una entidad específica.
   *
   * @remarks
   * Si la entidad ya posee un componente del mismo tipo, se reemplaza.
   * Intenta validar la integridad jerárquica si el componente es de tipo 'Transform'.
   * Notifica a las queries reactivas para apoyar la actualización de sus índices de forma incremental.
   *
   * Si se llama durante {@link World.update}, la operación se difiere mediante un buffer.
   *
   * @param entity - El ID de la entidad destino.
   * @param component - La instancia del componente (POJO).
   * @returns El componente añadido.
   *
   * @precondition Se espera que la entidad sea válida en el contexto del mundo actual.
   * @postcondition El componente es accesible a través de las APIs de consulta del mundo.
   * @postcondition Si el tipo es 'Transform', se intenta mantener la validez de la jerarquía.
   * @throws {Error} Si se intenta asignar una entidad como su propio padre en un Transform.
   * @sideEffect Incrementa {@link World.version}.
   * @mutates componentMaps, componentIndex, entityComponentSets
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
   * @remarks
   * Returns the live mutable component reference stored in the World.
   * Direct mutations bypass state tracking.
   * Use {@link World.mutateComponent} for controlled mutations that update versioning.
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
   * Official way for controlled mutations.
   * Updates {@link World.stateVersion} and marks {@link World.isRenderDirty}.
   *
   * @param entity - The entity that owns the component.
   * @param type - The type discriminator of the component.
   * @param updater - Callback that receives the component instance for modification.
   * @returns `true` if the component exists and was mutated, `false` otherwise.
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
   * Comprueba la existencia de una entidad en el mundo de forma eficiente (O(1)).
   *
   * @param entity - El ID de la entidad a consultar.
   * @returns `true` si la entidad está activa en el mundo.
   */
  public hasEntity(entity: Entity): boolean {
    return this.activeEntities.has(entity);
  }

  /**
   * Comprueba la existencia de un componente en una entidad de forma eficiente.
   *
   * @param entity - La entidad a consultar.
   * @param type - El tipo de componente.
   * @returns `true` si la entidad posee el componente.
   * @queries componentIndex
   */
  hasComponent(entity: Entity, type: string): boolean {
    return this.componentIndex.get(type)?.has(entity) ?? false;
  }

  /**
   * Elimina un componente de una entidad.
   *
   * @remarks
   * Notifica a las queries reactivas para que actualicen sus índices.
   * Si se llama durante {@link World.update}, la eliminación se difiere al final del frame.
   *
   * @param entity - La entidad destino.
   * @param type - El tipo de componente a eliminar.
   *
   * @precondition Se espera que la entidad exista en el mundo.
   * @postcondition La entidad ya no posee el componente especificado.
   * @postcondition Las queries que dependían de este componente ya no incluirán a la entidad.
   * @sideEffect Incrementa {@link World.version}.
   * @mutates componentMaps, componentIndex, entityComponentSets
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
   * Proporciona acceso a un conjunto de entidades que poseen la firma de componentes indicada.
   *
   * @remarks
   * Emplea un sistema de caché reactivo para reducir el coste de las consultas recurrentes. Si la firma
   * ya tiene una consulta asociada, el resultado se sirve desde el caché. Los resultados se actualizan
   * de forma incremental ante cambios estructurales (añadir/quitar componentes).
   *
   * @param componentTypes - Lista de tipos que definen la firma de la consulta.
   * @returns Un array de solo lectura con los IDs de las entidades coincidentes.
   *
   * @warning Evite crear queries dinámicas (e.g. usando `world.query(...types)`) dentro de bucles de
   * actualización, ya que la generación de la clave de caché tiene un coste O(N log N) respecto al
   * número de tipos.
   *
   * @precondition Se recomienda proporcionar al menos un tipo de componente para evitar consultas universales.
   * @postcondition El array devuelto se mantiene ordenado por ID de entidad con el fin de favorecer la reproducibilidad.
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
   * Elimina completamente una entidad y todos sus componentes asociados del mundo.
   *
   * @remarks
   * Libera el ID de la entidad para que pueda ser reutilizado por el {@link EntityPool}.
   * Limpia todas las referencias en los índices de componentes y queries.
   *
   * Si se llama durante {@link World.update}, la eliminación se difiere al final del frame.
   *
   * @param entity - La entidad a destruir.
   * @postcondition La entidad ya no existe en el mundo y sus componentes son inaccesibles.
   * @sideEffect Incrementa {@link World.structureVersion}.
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
   * Proporciona acceso al buffer de comandos para diferir mutaciones estructurales.
   *
   * @remarks
   * Se recomienda encarecidamente utilizar este buffer durante la actualización de sistemas
   * para evitar problemas de invalidación de iteradores en las Queries.
   *
   * @returns La instancia de WorldCommandBuffer del mundo.
   */
  public getCommandBuffer(): WorldCommandBuffer {
    return this.commandBuffer;
  }

  /**
   * Aplica todas las mutaciones estructurales grabadas en el buffer de comandos.
   *
   * @remarks
   * Debe llamarse al final de cada tick de simulación (Fixed Update).
   *
   * @sideEffect Ejecuta operaciones de creación/eliminación diferidas.
   */
  public flush(): void {
    this.commandBuffer.flush(this);
  }

  /**
   * Generates a partial snapshot containing only data that changed since a specific version.
   *
   * @remarks
   * This is the foundation of the Delta Synchronization system. It iterates through all
   * components and compares their stored version with `sinceVersion`.
   *
   * @param sinceVersion - The state version to compare against.
   * @param filterEntities - Optional. A set of entities to restrict the snapshot to (Interest Management).
   * @returns A partial {@link WorldSnapshot} containing modified component data.
   *
   * @conceptualRisk [PERFORMANCE][HIGH] In worlds with many entities, this method can be
   * expensive as it performs a nested iteration over component types and entities.
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
   * Limpia el estado completo del mundo, incluyendo entidades, componentes y queries.
   *
   * @remarks
   * No elimina los sistemas registrados, pero sí todos los recursos y datos de simulación.
   * Útil para reinicios completos de nivel o cambios de escena drásticos.
   *
   * @postcondition El mundo queda en un estado inicial vacío.
   * @sideEffect Incrementa {@link World.structureVersion}.
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
   * Registra un recurso global en el mundo.
   * Los recursos son singletons que no están asociados a ninguna entidad.
   *
   * @remarks
   * Útil para servicios compartidos como `EventBus`, `AssetLoader` o configuraciones globales.
   *
   * @param name - Identificador único del recurso.
   * @param resource - La instancia u objeto del recurso.
   *
   * @precondition Se recomienda que el nombre del recurso sea único para evitar sobrescritura accidental.
   * @postcondition El recurso es accesible mediante {@link World.getResource}.
   * @sideEffect Sobrescribe cualquier recurso previo con el mismo nombre.
   */
  setResource<T>(name: string, resource: T): void {
    this.resources.set(name, resource);
  }

  /**
   * Recupera un recurso global previamente registrado.
   *
   * @param name - Nombre del recurso.
   * @returns El recurso (Readonly) o `undefined` si no existe.
   * @queries resources
   */
  getResource<T>(name: string): Readonly<T> | undefined {
    return this.resources.get(name) as T;
  }

  /**
   * Ejecuta una mutación controlada sobre un recurso global.
   *
   * @remarks
   * Es la vía recomendada para modificar el estado de un recurso singleton.
   * Notifica automáticamente los cambios incrementando {@link World.stateVersion}.
   *
   * @param name - Nombre del recurso a mutar.
   * @param mutator - Callback que recibe la instancia del recurso.
   *
   * @postcondition Se incrementa {@link World.stateVersion}.
   */
  mutateResource<T>(name: string, mutator: (resource: T) => void): void {
    const resource = this.resources.get(name) as T;
    if (resource) {
      mutator(resource);
      this.notifyStateChange();
    }
  }

  /**
   * Comprueba si un recurso específico está registrado.
   */
  hasResource(name: string): boolean {
    return this.resources.has(name);
  }

  /**
   * Elimina un recurso del mundo.
   */
  removeResource(name: string): void {
    this.resources.delete(name);
  }

  /**
   * Registra un nuevo sistema en el mundo para que participe en el ciclo de actualización.
   *
   * @remarks
   * El sistema se ejecutará en la fase indicada con la prioridad especificada.
   * Los cambios en la lista de sistemas fuerzan una re-ordenación en el siguiente {@link World.update}.
   *
   * @param system - Instancia del sistema que extiende {@link System}.
   * @param config - Configuración de fase y prioridad.
   *
   * @precondition Se espera que el sistema sea una instancia válida de {@link System}.
   * @postcondition El sistema se añade a la cola de ejecución en la fase correspondiente.
   * @sideEffect Activa {@link World.systemsNeedSorting} para la siguiente actualización.
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
   * Orquesta un ciclo de actualización ejecutando los sistemas registrados por fases.
   *
   * @remarks
   * El ciclo sigue este orden:
   * 1. Re-ordenación de sistemas si la lista ha cambiado.
   * 2. Ejecución secuencial por fase (Input, Simulation, Collision, GameRules, Presentation).
   * 3. Procesamiento de mutaciones diferidas a través del buffer de comandos.
   *
   * @warning Se recomienda encarecidamente utilizar el {@link WorldCommandBuffer} para realizar
   * mutaciones estructurales (crear/eliminar entidades) durante el update para evitar
   * efectos secundarios en los iteradores de las queries.
   *
   * @param deltaTime - Tiempo transcurrido para este paso de simulación (ms).
   *
   * @postcondition El estado del mundo avanza y las mutaciones diferidas se consolidan al final.
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

  getSystemTiming(system: System): number {
    return this.profilers.get(system)?.getAverageTime() ?? 0;
  }

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
   * Notifica que el estado interno de algún componente ha cambiado.
   *
   * @remarks
   * Debe llamarse cuando se mutan propiedades de componentes existentes de forma directa
   * para que los sistemas que observan `stateVersion` (como el Renderer) puedan reaccionar.
   */
  public notifyStateChange(): void {
    this._stateVersion++;
    this._renderDirty = true;
  }

  /**
   * Marca el mundo como sucio para el renderizado.
   */
  public setRenderDirty(dirty: boolean): void {
    this._renderDirty = dirty;
  }

  /**
   * Comprueba si el mundo tiene cambios pendientes de renderizar.
   */
  public isRenderDirty(): boolean {
    return this._renderDirty;
  }

  /**
   * Tries to locate the first component of a given type, treating it as a Singleton.
   *
   * @remarks
   * Convenient for single-instance components (e.g., global state, config).
   * Use {@link World.mutateSingleton} for controlled mutations.
   *
   * @param type - The component type.
   * @returns The found instance or `undefined`.
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
   * This is the official and recommended way for controlled mutations of unique components.
   * It automatically notifies state changes by incrementing {@link World.stateVersion}
   * and marking the world as dirty for rendering ({@link World.isRenderDirty}).
   *
   * @param type - The component type.
   * @param updater - Callback that receives the component instance for modification.
   * @returns `true` if the component existed and was mutated, `false` otherwise.
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
   * @deprecated Use structureVersion or stateVersion instead.
   * Combined version for backward compatibility.
   */
  public get version(): number {
    return this._structureVersion + this._stateVersion;
  }

  /**
   * Alias de {@link World.query} para obtener entidades con una firma específica.
   * @deprecated Usar {@link World.query} directamente.
   */
  public getEntitiesWith(...componentTypes: string[]): ReadonlyArray<Entity> {
    return this.query(...componentTypes);
  }

  /** @deprecated Usar el getter `entities`. */
  public getAllEntities(): ReadonlyArray<Entity> {
    return this.entities;
  }
}

const __DEV__ = process.env.NODE_ENV !== "production";
