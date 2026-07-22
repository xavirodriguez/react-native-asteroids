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
import { SnapshotSerializerSoA } from "../snapshots/SnapshotSerializerSoA";
import { SnapshotRestoreSoA } from "../snapshots/SnapshotRestoreSoA";
import { WorldCommandBuffer } from "./WorldCommandBuffer";
import { BlueprintDefinition } from "./BlueprintRegistry";
import { ComponentCloner } from "./ComponentCloner";

declare const __DEV__: boolean;

if (typeof (globalThis as any).__DEV__ === "undefined") {
  (globalThis as any).__DEV__ = process.env.NODE_ENV !== "production";
}

const isDev = typeof (globalThis as any).__DEV__ !== "undefined"
  ? (globalThis as any).__DEV__
  : (process.env.NODE_ENV !== "production");

/**
 * Map type for blueprint definitions.
 * @public
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
 * @public
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
  private defaultSchedule: Schedule<TComponents, TEvents, TBlueprints>;

  constructor(schedule?: Schedule<TComponents, TEvents, TBlueprints>) {
    this.defaultSchedule = schedule ?? new Schedule<TComponents, TEvents, TBlueprints>();
    this._gameplayRandom.lock();
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
   * Access the structural CommandBuffer for deferred entity and component mutations.
   */
  public get commands(): WorldCommandBuffer<TComponents, TEvents, TBlueprints> {
    return this.commandBuffer;
  }

  /** Returns the world schedule instance. */
  public get schedule(): Schedule<TComponents, TEvents, TBlueprints> {
    return this.defaultSchedule;
  }

  /**
   * Devuelve una lista ordenada de todas las entidades activas en el World.
   *
   * @remarks
   * Diseñado para mitigar allocations en caliente mediante una caché interna (`cachedEntities`)
   * que se invalida únicamente ante cambios estructurales reales. El ordenamiento estable
   * ayuda a mantener la reproducibilidad de la simulación.
   *
   * @precondition Ninguna.
   * @postcondition Retorna un array de solo lectura con las entidades activas ordenadas de menor a mayor.
   * @invariant El array resultante tiene una correspondencia de 1 a 1 con las entidades activas en el World.
   * @throws Ninguno.
   * @sideEffect Puede regenerar y ordenar la caché si esta se encontraba invalidada.
   * @conceptualRisk [GC_PRESSURE] Aunque se implementó caché, la invalidación frecuente (por creación/remoción constante) forzará nuevas asignaciones y ordenamientos O(N log N) en el loop.
   *
   * @returns Lista de entidades de solo lectura.
   */
  public get entities(): ReadonlyArray<Entity> {
    if (!this.cachedEntities) {
      this.cachedEntities = Array.from(this.activeEntities).sort((a, b) => a - b);
    }
    return this.cachedEntities;
  }

  /**
   * Alias de conveniencia para obtener la lista ordenada de entidades activas.
   *
   * @remarks
   * Delegación directa al getter `entities`.
   *
   * @see {@link World.entities}
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
  private checkUpdatingMutation(opName: string, type?: string): void {
    if (isDev && this.isUpdating) {
      if (type === "Juice" || type === "VisualOffset") {
        return;
      }
      throw new Error(`Direct structural mutation (${opName}${type ? " of " + type : ""}) during World update is forbidden. Use world.commands instead.`);
    }
  }

  /**
   * Crea una nueva entidad o recicla un identificador previamente liberado.
   *
   * @remarks
   * Diseñado para minimizar allocations reutilizando IDs de entidades eliminadas.
   *
   * @precondition Ninguna.
   * @postcondition Devuelve un ID de entidad único y activo. `_structureVersion` se incrementa.
   * @invariant Los IDs de entidad activos son siempre enteros positivos únicos en el World.
   * @throws {Error} Si se intenta invocar directamente durante la ejecución del update de sistemas (en desarrollo).
   * @sideEffect Invalida `cachedEntities` e incrementa `_structureVersion`.
   * @conceptualRisk [MEMORY] Si las entidades se crean de forma descontrolada sin liberar, el array de entidades libres o activas puede crecer ilimitadamente.
   *
   * @returns El identificador de la entidad creada o reciclada.
   */
  createEntity(): Entity {
    this.checkUpdatingMutation("createEntity");
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
   * Elimina una entidad y remueve de forma automática todos sus componentes asociados del World.
   *
   * @remarks
   * El ID de la entidad se guarda en la cola de entidades libres para su posterior reciclaje, ayudando a controlar la fragmentación de memoria.
   *
   * @precondition La entidad `entity` debe estar actualmente activa en el World.
   * @postcondition Todos los componentes asociados son destruidos y removidos de los índices. `_structureVersion` se incrementa.
   * @invariant Una entidad destruida no puede contener ningún componente ni figurar en consultas activas.
   * @throws {Error} Si se intenta invocar directamente durante la actualización del World (en desarrollo).
   * @sideEffect Invalida `cachedEntities`, incrementa `_structureVersion`, limpia colecciones de la entidad y notifica a consultas.
   * @conceptualRisk [LIFECYCLE] Destruir una entidad directamente en mitad del frame puede causar excepciones en sistemas que aún no se han ejecutado si tenían referencias guardadas.
   *
   * @param entity - El identificador de la entidad a remover.
   */
  removeEntity(entity: Entity): void {
    this.checkUpdatingMutation("removeEntity");
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
   * Adjunta un componente a una entidad activa.
   *
   * @remarks
   * Registra el componente internamente, actualiza los índices de consultas e invalida las cachés
   * estructurales y de estado para reflejar el cambio en los sistemas correspondientes.
   *
   * @precondition La entidad `entity` debe estar activa en el World.
   * @postcondition El componente queda registrado para la entidad. `_structureVersion` y `_stateVersion` se incrementan.
   * @invariant Cada entidad solo puede poseer una instancia de componente por cada tipo.
   * @throws {Error} Si se intenta realizar una mutación estructural directa durante la actualización del World (en desarrollo).
   * @sideEffect Incrementa `_structureVersion`, `_stateVersion`, actualiza cachés de consultas y asigna versión del componente.
   * @conceptualRisk [LIFECYCLE] Adjuntar componentes directamente en el update loop puede invalidar iteradores activos si no se usa el Command Buffer.
   *
   * @param entity - ID de la entidad a la que se adjunta el componente.
   * @param component - Instancia del componente, incluyendo su campo `type`.
   */
  addComponent<K extends ComponentType<TComponents>>(entity: Entity, component: TComponents[K] & { type: K }): void {
    this.checkUpdatingMutation("addComponent", component.type as string);
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

  /**
   * Devuelve el componente del tipo especificado asociado a una entidad.
   *
   * @remarks
   * Diseñado para minimizar allocations en producción. En modo desarrollo (`__DEV__` es true),
   * se aplica `Object.freeze` de forma superficial para prevenir mutaciones silenciosas accidentales.
   *
   * @precondition La entidad `entity` debe ser válida y estar activa en el World.
   * @postcondition Devuelve el componente correspondiente o `undefined` si no existe. El componente devuelto en desarrollo es de solo lectura superficial.
   * @invariant El componente devuelto nunca debe ser mutado de forma directa sin usar `mutateComponent`.
   * @throws Ninguno.
   * @sideEffect Ninguno.
   * @conceptualRisk [MEMORY] Devolver la referencia directa en producción permite mutación silenciosa externa sin actualizar `stateVersion`.
   * @conceptualRisk [GC_PRESSURE] El congelamiento en desarrollo se hace de forma superficial para no penalizar el rendimiento con deep freezing.
   *
   * @param entity - El ID de la entidad de la que se obtendrá el componente.
   * @param type - El tipo o clave identificadora del componente.
   * @returns La referencia del componente (congelada superficialmente en desarrollo) o `undefined`.
   */
  getComponent<K extends ComponentType<TComponents>>(
    entity: Entity,
    type: K
  ): TComponents[K] | undefined {
    const component = this.componentMaps
      .get(type as string)
      ?.get(entity) as TComponents[K] | undefined;

    if (isDev && component !== undefined) {
      return Object.freeze(component) as TComponents[K];
    }
    return component;
  }

  /**
   * Lee un componente de forma estrictamente de solo lectura.
   *
   * @remarks
   * Es un alias de solo lectura para {@link getComponent}. En modo desarrollo, retorna un componente
   * congelado superficialmente para prevenir mutaciones en tiempo de ejecución.
   *
   * @param entity - La entidad para la que se lee el componente.
   * @param type - El tipo del componente.
   * @returns El componente de solo lectura o `undefined`.
   */
  public readComponent<K extends ComponentType<TComponents>>(
    entity: Entity,
    type: K
  ): TComponents[K] | undefined {
    const component = this.getComponent(entity, type);
    if (isDev && component !== undefined) {
      return Object.freeze(component) as TComponents[K];
    }
    return component;
  }

  /**
   * Obtiene una referencia mutable de un componente, clonándolo si está congelado en desarrollo.
   *
   * @remarks
   * Incrementa automáticamente `_stateVersion` si se encuentra el componente.
   *
   * @precondition La entidad `entity` debe existir en el World y poseer el componente `type`.
   * @postcondition Si el componente estaba congelado, se clona usando `ComponentCloner`. `_stateVersion` se incrementa.
   * @invariant El componente devuelto es seguro para mutación directa.
   * @throws Ninguno.
   * @sideEffect Incrementa `_stateVersion` y actualiza la versión de componente para la entidad.
   * @conceptualRisk [GC_PRESSURE] Clonar componentes congelados en desarrollo añade allocations en el hot path.
   *
   * @param entity - La entidad destino.
   * @param type - El tipo del componente.
   * @returns La referencia mutable del componente o `undefined`.
   */
  getMutableComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): TComponents[K] | undefined {
    let component = this.componentMaps.get(type as string)?.get(entity) as TComponents[K] | undefined;
    if (component) {
      if (Object.isFrozen(component)) {
        component = ComponentCloner.cloneComponent(component);
        this.componentMaps.get(type as string)!.set(entity, component);
      }
      this._stateVersion++;
      this.updateComponentVersion(entity, type as string);
    }
    return component;
  }

  /**
   * Elimina un componente de una entidad activa.
   *
   * @remarks
   * Remueve el componente de las colecciones internas del World y notifica a las consultas activas.
   *
   * @precondition La entidad `entity` debe estar activa y poseer el componente del tipo especificado.
   * @postcondition El componente es eliminado, liberando sus recursos internos. `_structureVersion` se incrementa.
   * @invariant La entidad deja de coincidir con cualquier consulta que exija dicho componente.
   * @throws {Error} Si se intenta realizar una mutación estructural directa durante la actualización del World (en desarrollo).
   * @sideEffect Incrementa `_structureVersion` y actualiza índices de consultas.
   * @conceptualRisk [LIFECYCLE] La remoción directa durante la ejecución de sistemas puede causar fallos de puntero nulo o alterar iteradores en caliente.
   *
   * @param entity - ID de la entidad destino.
   * @param type - El tipo del componente a eliminar.
   */
  removeComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): void {
    this.checkUpdatingMutation("removeComponent", type as string);
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

  /**
   * Muta de manera segura un componente aplicando una función actualizadora.
   *
   * @remarks
   * Asegura que el estado interno del componente sea clonado si estaba congelado y
   * actualiza la versión de estado del World (`_stateVersion`) para invalidar cachés de red o serialización.
   *
   * @precondition El componente debe existir para la entidad especificada.
   * @postcondition El componente es modificado según la función `updater`, `_stateVersion` se incrementa en 1, y la versión del componente se actualiza.
   * @invariant La estructura del componente mutado se mantiene coherente con su tipo.
   * @throws {TypeError} Si la función `updater` intenta modificar una propiedad de solo lectura y el componente no fue clonado correctamente.
   * @sideEffect Incrementa `_stateVersion` e invalida cachés de sincronización de red/snapshots.
   * @conceptualRisk [OWNERSHIP] Múltiples mutaciones en el mismo frame desde sistemas distintos pueden provocar inconsistencia temporal si no se sigue un orden estricto.
   *
   * @param entity - El ID de la entidad dueña del componente.
   * @param type - El tipo del componente a mutar.
   * @param updater - Callback síncrono encargado de aplicar los cambios en el componente mutable.
   * @returns `true` si la mutación fue exitosa; `false` si el componente no existe.
   */
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

  deleteResource(name: string): void {
    this.resources.delete(name);
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
   * Captura el estado actual serializable del World.
   *
   * @remarks
   * Diseñado para dar soporte a simulaciones reproducibles y mecánicas de rollback en red.
   * Captura componentes, entidades activas e internos de servicios RNG.
   *
   * @precondition Ninguna.
   * @postcondition Retorna una instancia de `WorldSnapshot` con el estado lógico serializado.
   * @invariant El estado capturado no muta el World activo durante la clonación.
   * @throws Ninguno.
   * @sideEffect Llama a `SnapshotSerializer` o `SnapshotSerializerSoA` delegando la clonación.
   * @conceptualRisk [GC_PRESSURE] El snapshot de tipo AoS (Array of Structures) tradicional realiza deep cloning extensivo, generando alta presión de GC si se usa a cada frame. Se recomienda usar snapshots SoA (Structure of Arrays) en su lugar.
   * @conceptualRisk [MEMORY] No se serializan funciones, instancias complejas de clases sin clonadores, ni referencias circulares.
   *
   * @param target - Snapshot opcional a reutilizar para reducir allocations.
   * @returns Estructura con la captura del estado.
   */
  public snapshot(target?: WorldSnapshot): WorldSnapshot {
    if (this.getResource("UseSoASnapshots") === true) {
      return SnapshotSerializerSoA.snapshot(this);
    }
    return SnapshotSerializer.snapshot(this, target);
  }

  /**
   * Restaura por completo el estado del World a partir de un Snapshot guardado.
   *
   * @remarks
   * Reconstruye índices, entidades activas, componentes y el RNG. Es un método central
   * para la sincronización y la reconciliación por rollback.
   *
   * @precondition El `state` proporcionado debe ser un `WorldSnapshot` válido de la misma familia de simulación.
   * @postcondition El estado del World se reemplaza por el del snapshot. `_structureVersion` y `_stateVersion` se incrementan.
   * @invariant Todas las queries del World se actualizan automáticamente para coincidir con la nueva composición de entidades.
   * @throws {Error} Si el formato del snapshot es incompatible o corrupto.
   * @sideEffect Elimina entidades y componentes existentes, recrea la jerarquía de simulación.
   * @conceptualRisk [LIFECYCLE] Los recursos no serializables como texturas, buffers de audio o listeners externos no se restauran y deben ser gestionados de forma manual.
   *
   * @param state - Snapshot origen del cual se obtendrán los datos.
   */
  public restore(state: WorldSnapshot): void {
    if (state.isSoA) {
      SnapshotRestoreSoA.restore(this, state);
      return;
    }
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
