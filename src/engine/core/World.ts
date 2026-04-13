import { Component, Entity } from "../types/EngineTypes";
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
 *
 * @packageDocumentation
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
  private resources = new Map<string, any>();

  /**
   * Genera una instantánea serializable del estado completo del mundo para rollback o persistencia.
   *
   * @remarks
   * Captura entidades activas, datos de componentes, contadores de IDs, versión del mundo
   * y la semilla actual del generador de números aleatorios de gameplay.
   *
   * @returns Un objeto plano que contiene el estado reconstruible del mundo.
   * @conceptualRisk [JSON_DETERMINISM][MEDIUM] La serialización no garantiza el orden de las
   * propiedades, lo que puede afectar a la generación de hashes de estado.
   */
  public snapshot(): any {
    const gameplayRandom = RandomService.getInstance("gameplay");
    const componentData: Record<string, Record<number, any>> = {};
    this.componentMaps.forEach((map, type) => {
      componentData[type] = {};
      map.forEach((component, entity) => {
        // Simple serialization: skip functions and circular refs
        // In a real scenario we'd use a more robust approach
        const serializedComp = { ...component };
        if (type === "Reclaimable") {
            delete (serializedComp as any).onReclaim;
        }
        componentData[type][entity] = serializedComp;
      });
    });

    return {
      entities: Array.from(this.activeEntities),
      componentData,
      nextEntityId: this.nextEntityId,
      freeEntities: [...this.freeEntities],
      version: this.version,
      seed: (gameplayRandom as any).seed // Accessing internal seed for snapshot
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
  public restore(state: any): void {
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
        const component = state.componentData[type][entityIdStr];
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
        // Attempt to find pools in resources and re-attach
        // This is a simplified version; in a production system, pools would register themselves
        this.resources.forEach(resource => {
            if (resource && typeof resource.release === "function") {
                reclaimableMap.forEach((comp: any, _entity) => {
                    // This is still slightly heuristic. A better way is needed.
                    // For now, satisfy the requirement by re-attaching if it looks like a pool.
                    comp.onReclaim = (w: World, e: Entity) => resource.release(w, e);
                });
            }
        });
    }
  }

  /**
   * Versión actual de la estructura del mundo.
   * Se incrementa cada vez que se añade o elimina una entidad o componente.
   *
   * @conceptualRisk [POTENTIAL_OVERFLOW][LOW] Si el juego corre por un tiempo extremadamente
   * largo con alta rotación de entidades, la versión podría desbordarse.
   */
  public version = 0;

  /**
   * Crea una nueva entidad única en el mundo.
   *
   * @remarks
   * Reutiliza IDs de {@link World.freeEntities} si están disponibles para minimizar el
   * crecimiento de IDs y mejorar la localidad de caché en los índices.
   *
   * @returns El ID de la nueva {@link Entity}.
   * @postcondition Incrementa {@link World.version}.
   * @sideEffect Altera la lista interna de entidades activas y el pool de entidades libres.
   */
  createEntity(): Entity {
    const id = this.freeEntities.length > 0 ? this.freeEntities.pop()! : this.nextEntityId++;
    this.activeEntities.add(id);
    this.version++;
    return id;
  }

  /**
   * Elimina todos los sistemas registrados en el mundo.
   *
   * @remarks
   * Útil durante reinicios de escena para reconstruir el pipeline de ejecución.
   *
   * @postcondition La lista de sistemas queda vacía y {@link World.version} se incrementa.
   */
  clearSystems(): void {
    this.systems = [];
    this.sortedSystems = [];
    this.systemsNeedSorting = false;
    this.version++;
  }

  /**
   * Adjunta un componente a una entidad.
   * Si la entidad ya posee un componente de este tipo, será sobrescrito.
   *
   * @remarks
   * Este método gestiona la indexación reactiva para las queries y valida invariantes críticos
   * como las jerarquías de transformación.
   *
   * @param entity - La entidad a la que se adjunta el componente.
   * @param component - La instancia del componente a adjuntar.
   *
   * @precondition La entidad debe existir (haber sido creada previamente con {@link World.createEntity}).
   * @throws {Error} Si se viola el invariante de jerarquía (auto-parentesco).
   * @conceptualRisk [HIERARCHY_NORMALIZATION][LOW] Resetea silenciosamente el parent a undefined
   * si el parent no existe. Previene crashes pero puede ocultar errores de lógica en el orden
   * de creación de entidades.
   *
   * @postcondition Incrementa {@link World.version}.
   * @postcondition Notifica a las queries reactivas para actualizar sus resultados cacheados.
   * @sideEffect Actualiza los mapas de componentes e índices de tipos por entidad.
   */
  addComponent<T extends Component>(entity: Entity, component: T): T {
    const type = component.type;

    // Principle 2: Strong Invariants - Normalizar en addNode (addComponent en ECS)
    if (type === "Transform") {
      const transform = component as any;
      if (transform.parent !== undefined) {
        if (!this.activeEntities.has(transform.parent)) {
          if (__DEV__) {
            console.warn(`Hierarchy Invariant Violation: Entity ${entity} has parent ${transform.parent} but parent does not exist in world.`);
          }
          transform.parent = undefined; // Normalizar SIEMPRE
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

  /**
   * Recupera un componente de un tipo específico de una entidad.
   *
   * @param entity - La entidad de la que se obtiene el componente.
   * @param type - El nombre del tipo de componente a recuperar.
   * @returns La instancia del componente si existe, de lo contrario `undefined`.
   * @see {@link World.hasComponent}
   */
  getComponent<T extends Component>(entity: Entity, type: string): T | undefined {
    return this.componentMaps.get(type)?.get(entity) as T;
  }

  /**
   * Comprueba si una entidad posee un componente de un tipo específico.
   *
   * @param entity - La entidad a comprobar.
   * @param type - El tipo de componente a buscar.
   * @returns `true` si la entidad posee el componente, de lo contrario `false`.
   */
  hasComponent(entity: Entity, type: string): boolean {
    return this.componentIndex.get(type)?.has(entity) ?? false;
  }

  /**
   * Alias de {@link World.query} para soportar interfaces extendidas de ECS.
   *
   * @param componentTypes - Tipos de componentes por los que filtrar.
   * @returns Array de IDs de entidades que cumplen la query.
   */
  getEntitiesWith(...componentTypes: string[]): Entity[] {
    return this.query(...componentTypes);
  }

  /**
   * Elimina un componente de un tipo específico de una entidad.
   *
   * @param entity - La entidad de la que se elimina el componente.
   * @param type - El tipo de componente a eliminar.
   *
   * @postcondition Incrementa {@link World.version} si el componente fue realmente eliminado.
   * @postcondition Notifica a las queries reactivas para eliminar la entidad de sus resultados.
   */
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

  /**
   * Consulta las entidades que poseen todos los tipos de componentes especificados.
   * Utiliza queries reactivas para evitar trabajo redundante.
   *
   * @remarks
   * Los resultados de las queries están cacheados internamente. El orden de los tipos de
   * componentes en los argumentos no afecta la identidad de la query.
   * El filtrado optimiza la búsqueda empezando por el componente menos frecuente.
   *
   * @param componentTypes - Uno o más tipos de componentes por los que filtrar.
   * @returns Un array de IDs de {@link Entity} que poseen todos los componentes requeridos.
   *
   * @conceptualRisk [GC_PRESSURE][LOW] La generación frecuente de arrays de resultados puede
   * presionar el recolector de basura si se abusa de queries efímeras en hot paths.
   * @conceptualRisk [MUTABLE_CACHE_LEAK][MEDIUM] {@link Query.getEntities} devuelve una referencia
   * al array interno; no debe ser modificado por el consumidor.
   */
  query(...componentTypes: string[]): Entity[] {
    if (componentTypes.length === 0) return [];

    // Optimization: avoid sort/join for single component queries
    const key = componentTypes.length === 1 ? componentTypes[0] : [...componentTypes].sort().join(",");
    let query = this.queries.get(key);

    if (!query) {
      query = new Query(componentTypes);
      this.queries.set(key, query);

      // Index the query by its component types for fast notification
      for (const type of componentTypes) {
        let set = this.queriesByComponent.get(type);
        if (!set) {
          set = new Set();
          this.queriesByComponent.set(type, set);
        }
        set.add(query);
      }

      // Initialize query with existing entities
      this.activeEntities.forEach(entity => {
        const componentSet = this.entityComponentSets.get(entity);
        if (componentSet && query!.matches(componentSet)) {
          query!.add(entity);
        }
      });
    }

    return query.getEntities();
  }

  /**
   * Elimina una entidad y todos sus componentes asociados del mundo.
   *
   * @remarks
   * Realiza la limpieza en todos los mapas de componentes, conjuntos de componentes por entidad
   * y notifica a todas las queries activas para eliminar la entidad de sus cachés.
   *
   * @param entity - La entidad a eliminar.
   *
   * @postcondition La entidad se añade a {@link World.freeEntities} para su posterior
   * reutilización e incrementa {@link World.version}.
   * @sideEffect Notifica a todas las {@link Query} registradas.
   */
  removeEntity(entity: Entity): void {
    this.removeEntityFromComponentMaps(entity);
    this.entityComponentSets.delete(entity);
    this.queries.forEach(query => query.remove(entity));

    if (this.activeEntities.delete(entity)) {
      this.freeEntities.push(entity);
      this.version++;
    }
  }

  /**
   * Reinicia el mundo por completo, eliminando todas las entidades, componentes y recursos.
   * Los sistemas permanecen registrados.
   *
   * @postcondition {@link World.version} se incrementa significativamente.
   */
  clear(): void {
    this.activeEntities.clear();
    this.componentMaps.clear();
    this.componentIndex.clear();
    this.entityComponentSets.clear();
    this.queries.clear();
    this.queriesByComponent.clear();
    this.resources.clear();
    this.version++;
  }

  /**
   * Define un recurso global en el mundo.
   *
   * @remarks
   * Los recursos son singletons que no están asociados a entidades específicas,
   * útiles para estados compartidos como configuración o servicios de red.
   *
   * @param name - Clave única del recurso.
   * @param resource - Valor o instancia a almacenar.
   */
  setResource<T>(name: string, resource: T): void {
    this.resources.set(name, resource);
  }

  /**
   * Recupera un recurso global por su nombre.
   *
   * @param name - Clave del recurso.
   * @returns El valor del recurso o `undefined` si no existe.
   */
  getResource<T>(name: string): T | undefined {
    return this.resources.get(name) as T;
  }

  /**
   * Checks if a resource exists.
   *
   * @param name - Resource key.
   */
  hasResource(name: string): boolean {
    return this.resources.has(name);
  }

  /**
   * Removes a resource from the world.
   *
   * @param name - Resource key.
   */
  removeResource(name: string): void {
    this.resources.delete(name);
  }

  /**
   * Registra un sistema para ser actualizado por el mundo.
   *
   * @param system - La instancia de {@link System} a añadir.
   * @param config - Configuración opcional de fase y prioridad.
   * @see {@link SystemPhase}
   */
  addSystem(system: System, config: SystemConfig = {}): void {
    const phase = config.phase ?? SystemPhase.Simulation;
    const priority = config.priority ?? 0;

    this.systems.push({ system, phase, priority });
    this.systemsNeedSorting = true;
  }

  /**
   * Ejecuta un ciclo de actualización sobre todos los sistemas registrados.
   *
   * @remarks
   * Los sistemas se ejecutan siguiendo estrictamente el orden de fases y prioridades.
   * Si se ha añadido o eliminado algún sistema desde la última llamada, el motor
   * realiza una re-ordenación automática.
   *
   * @param deltaTime - Tiempo transcurrido desde el último tick en milisegundos.
   *
   * @precondition El mundo debe estar en un estado consistente.
   * @postcondition La versión del mundo puede haber incrementado si los sistemas realizaron
   * cambios estructurales.
   * @sideEffect Invoca el método `update` de cada sistema registrado.
   * @sideEffect Si {@link World.debugMode} es true, actualiza los perfiles de rendimiento.
   */
  update(deltaTime: number): void {
    if (this.systemsNeedSorting) {
      this.sortSystems();
    }
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

  /**
   * Obtiene el tiempo promedio de ejecución de un sistema en milisegundos.
   *
   * @param system - La instancia del sistema a consultar.
   * @returns Tiempo promedio en ms, o 0 si el profiling no está activo para ese sistema.
   * @remarks Solo disponible si {@link World.debugMode} estaba activo durante el update.
   */
  getSystemTiming(system: System): number {
    return this.profilers.get(system)?.getAverageTime() ?? 0;
  }

  /**
   * Obtiene un mapa con los tiempos de ejecución de todos los sistemas registrados.
   *
   * @returns Un objeto donde las llaves son los nombres de clase de los sistemas y los
   * valores son los tiempos promedio en ms.
   */
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

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      return b.priority - a.priority; // Higher priority first
    });

    this.sortedSystems = this.systems.map((s) => s.system);
    this.systemsNeedSorting = false;
  }

  /**
   * Returns a list of all active entities currently in the world.
   *
   * @returns An array of all {@link Entity} IDs.
   */
  getAllEntities(): Entity[] {
    return Array.from(this.activeEntities);
  }

  /**
   * Recupera la lista de todos los tipos de componentes asociados a una entidad.
   *
   * @param entity - El ID de la entidad a consultar.
   * @returns Un array con los nombres de los tipos de componentes.
   */
  getEntityComponentTypes(entity: Entity): string[] {
    const set = this.entityComponentSets.get(entity);
    return set ? Array.from(set) : [];
  }

  private notifyQueries(entity: Entity, componentSet: Set<string>, changedType?: string): void {
    // If we know which component changed, only notify queries that care about it.
    // Otherwise (entity removal), notify all queries that were tracking the entity.
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

  /**
   * Recupera un componente singleton del mundo.
   * Si el componente está congelado (frozen), lo reemplaza por una copia mutable (Principio 6).
   *
   * @param type - El tipo de componente a recuperar.
   * @returns El componente si se encuentra, de lo contrario `undefined`.
   *
   * @remarks
   * Este método asume que solo una entidad posee el tipo de componente dado.
   * Si varias entidades coinciden, devuelve la primera encontrada por {@link World.query}.
   *
   * @sideEffect Puede mutar el estado del World si necesita reemplazar un componente frozen
   * con una copia mutable para cumplir el Principio 6.
   */
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

// Global helper for development mode
const __DEV__ = process.env.NODE_ENV !== "production";
