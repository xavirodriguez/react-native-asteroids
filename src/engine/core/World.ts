import { Component, Entity, WorldSnapshot, ComponentDataSnapshot, SerializedComponent } from "../types/EngineTypes";
import { System, SystemConfig, SystemPhase } from "./System";
import { RandomService } from "../utils/RandomService";
import { Query } from "./Query";
import { SystemProfiler } from "../debug/SystemProfiler";

interface RegisteredSystem {
  system: System;
  phase: string;
  priority: number;
}

/**
 * Mundo ECS - Registro central que gestiona el ciclo de vida de entidades, componentes y sistemas.
 *
 * @responsibility Gestionar el ciclo de vida de las entidades (creación, destrucción).
 * @responsibility Almacenar y proporcionar acceso eficiente a los componentes.
 * @responsibility Orquestar la ejecución de sistemas en fases específicas.
 * @responsibility Mantener recursos compartidos globales del juego.
 *
 * @remarks
 * El `World` actúa como el núcleo de la arquitectura ECS. Utiliza un pool de entidades para minimizar
 * la presión sobre el GC y emplea queries reactivas cacheadas para optimizar las consultas de sistemas.
 *
 * Invariantes:
 * - **Principio 2**: Las estructuras jerárquicas (Transforms) deben ser válidas; no se permite el auto-parentesco.
 * - **Principio 6**: Los componentes singleton recuperados mediante {@link World.getSingleton} están
 * garantizados como mutables (se realiza una copia si están congelados).
 *
 * @conceptualRisk [PERFORMANCE] Las consultas (queries) sin caché pueden volverse costosas
 * si se realizan múltiples veces por frame en mundos con miles de entidades.
 * @conceptualRisk [CONSISTENCY] La eliminación de componentes durante una iteración
 * de sistema puede invalidar el estado de los iteradores si no se maneja mediante buffers.
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
  /** Whether system profiling is enabled. */
  public debugMode = false;
  private nextEntityId = 1;
  private freeEntities: Entity[] = [];
  private resources = new Map<string, unknown>();
  public version = 0;

  /**
   * Genera una instantánea serializable del estado completo del mundo para rollback o persistencia.
   *
   * @remarks
   * Captura entidades activas, datos de componentes, contadores de IDs, versión del mundo
   * y la semilla actual del generador de números aleatorios de gameplay.
   * Las entidades se devuelven en orden de inserción del Set (no necesariamente ordenadas por ID).
   *
   * @returns Un objeto plano que contiene el estado reconstruible del mundo.
   *
   * @precondition El estado actual debe ser consistente; no se recomienda llamar durante un update de sistema.
   * @postcondition Devuelve una copia profunda de cada componente, omitiendo funciones.
   *
   * @conceptualRisk [JSON_DETERMINISM][MEDIUM] La serialización no garantiza el orden de las
   * propiedades, lo que puede afectar a la generación de hashes de estado.
   * @conceptualRisk [GC_PRESSURE][MEDIUM] Las snapshots frecuentes en juegos con miles de entidades
   * generarán una presión significativa en el recolector de basura.
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

        // structuredClone is much faster and safer than JSON.parse(JSON.stringify)
        componentData[type][entity] = structuredClone(serializedComp) as SerializedComponent;
      }
    }

    return {
      entities: Array.from(this.activeEntities).sort((a, b) => a - b),
      componentData,
      nextEntityId: this.nextEntityId,
      freeEntities: [...this.freeEntities].sort((a, b) => a - b),
      version: this.version,
      seed: gameplayRandom.getSeed()
    };
  }

  /**
   * Restaura el estado del mundo a partir de una instantánea previamente capturada.
   *
   * @remarks
   * Este método reconstruye todos los mapas de componentes e índices. También garantiza
   * que las queries existentes se invaliden y reconstruyan para mantener la consistencia
   * de los resultados sin romper las referencias a los objetos Query.
   *
   * @param state - El objeto de estado obtenido de {@link World.snapshot}.
   *
   * @precondition El estado proporcionado debe ser una estructura válida generada por el motor.
   * @postcondition El mundo refleja exactamente el estado contenido en la instantánea.
   * @postcondition {@link World.version} se sincroniza con el valor del estado restaurado.
   * @sideEffect Limpia todos los datos actuales del mundo antes de la restauración.
   * @sideEffect Re-inicializa la semilla de `RandomService("gameplay")`.
   */
  public restore(state: WorldSnapshot): void {
    this.activeEntities = new Set(state.entities);
    this.nextEntityId = state.nextEntityId;
    this.freeEntities = [...state.freeEntities];
    this.version = state.version;

    if (state.seed !== undefined) {
        RandomService.getInstance("gameplay").setSeed(state.seed);
    }

    // Clear and rebuild component maps
    this.componentMaps.clear();
    this.componentIndex.clear();
    this.entityComponentSets.clear();

    for (const type in state.componentData) {
      const storage = new Map<Entity, Component>();
      const index = new Set<Entity>();
      this.componentMaps.set(type, storage);
      this.componentIndex.set(type, index);

      for (const entityIdStr in state.componentData[type]) {
        const entityId = parseInt(entityIdStr);
        const component = state.componentData[type][entityId] as unknown as Component;
        storage.set(entityId, component);
        index.add(entityId);

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

    this.version++;
  }

  /**
   * Crea una nueva entidad única en el mundo.
   */
  public createEntity(): Entity {
    const id = this.freeEntities.length > 0 ? this.freeEntities.pop()! : this.nextEntityId++;
    this.activeEntities.add(id);
    this.version++;
    return id;
  }

  /**
   * Elimina todos los sistemas registrados en el mundo.
   */
  clearSystems(): void {
    this.systems = [];
    this.sortedSystems = [];
    this.systemsNeedSorting = false;
    this.version++;
  }

  /**
   * Adjunta un componente a una entidad.
   */
  addComponent<T extends Component>(entity: Entity, component: T): T {
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
    }

    this.version++;
    return component;
  }

  getComponent<T extends Component>(entity: Entity, type: string): T | undefined {
    return this.componentMaps.get(type)?.get(entity) as T;
  }

  hasComponent(entity: Entity, type: string): boolean {
    return this.componentIndex.get(type)?.has(entity) ?? false;
  }

  public getEntitiesWith(...componentTypes: string[]): ReadonlyArray<Entity> {
    return this.query(...componentTypes);
  }

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

  public removeEntity(entity: Entity): void {
    this.removeEntityFromComponentMaps(entity);
    this.entityComponentSets.delete(entity);
    this.queries.forEach(query => query.remove(entity));

    if (this.activeEntities.delete(entity)) {
      this.freeEntities.push(entity);
      this.version++;
    }
  }

  public clear(): void {
    this.activeEntities.clear();
    this.componentMaps.clear();
    this.componentIndex.clear();
    this.entityComponentSets.clear();
    this.queries.clear();
    this.queriesByComponent.clear();
    this.resources.clear();
    this.version++;
  }

  setResource<T>(name: string, resource: T): void {
    this.resources.set(name, resource);
  }

  getResource<T>(name: string): T | undefined {
    return this.resources.get(name) as T;
  }

  hasResource(name: string): boolean {
    return this.resources.has(name);
  }

  removeResource(name: string): void {
    this.resources.delete(name);
  }

  addSystem(system: System, config: SystemConfig = {}): void {
    const phase = config.phase ?? SystemPhase.Simulation;
    const priority = config.priority ?? 0;
    this.systems.push({ system, phase, priority });
    this.systemsNeedSorting = true;
  }

  update(deltaTime: number): void {
    if (this.systemsNeedSorting) this.sortSystems();
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
      [SystemPhase.Presentation]: 4,
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

  getAllEntities(): ReadonlyArray<Entity> {
    return Array.from(this.activeEntities).sort((a, b) => a - b);
  }

  getEntityComponentTypes(entity: Entity): string[] {
    const set = this.entityComponentSets.get(entity);
    return set ? Array.from(set) : [];
  }

  private notifyQueries(entity: Entity, componentSet: Set<string>, changedType?: string): void {
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

const __DEV__ = process.env.NODE_ENV !== "production";
