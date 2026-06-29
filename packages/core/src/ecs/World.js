"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.World = void 0;
const Query_1 = require("./Query");
const System_1 = require("./System");
const RandomService_1 = require("../utils/RandomService");
const SnapshotSerializer_1 = require("../snapshots/SnapshotSerializer");
const SnapshotRestore_1 = require("../snapshots/SnapshotRestore");
const WorldCommandBuffer_1 = require("./WorldCommandBuffer");
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
class World {
    activeEntities = new Set();
    /**
     * Indicates if the world is currently executing its update loop.
     */
    isUpdating = false;
    /**
     * Indicates if the world is in a re-simulation phase (e.g., during network rollback).
     */
    isReSimulating = false;
    /**
     * Internal component storage.
     * @internal
     */
    componentMaps = new Map();
    /**
     * Internal entity index by component type.
     * @internal
     */
    componentIndex = new Map();
    /**
     * Internal set of components for each entity.
     * @internal
     */
    entityComponentSets = new Map();
    /**
     * Internal query cache.
     * @internal
     */
    queries = new Map();
    /**
     * Internal query index by component type.
     * @internal
     */
    queriesByComponent = new Map();
    /**
     * Internal systems list.
     * @internal
     */
    systems = [];
    /** @internal */
    nextEntityId = 1;
    /** @internal */
    freeEntities = [];
    /** @internal */
    resources = new Map();
    /** @internal */
    _tick = 0;
    /** @internal */
    commandBuffer = new WorldCommandBuffer_1.WorldCommandBuffer();
    /**
     * RNG service for visual-only effects.
     * @internal
     */
    renderRandom = new RandomService_1.RandomService();
    /** @internal */
    _structureVersion = 0;
    /** @internal */
    _stateVersion = 0;
    /**
     * Internal component version tracking for delta snapshots.
     * @internal
     */
    componentVersions = new Map();
    /** @internal */
    _gameplayRandom = new RandomService_1.RandomService();
    /**
     * Internal debug flag.
     * @internal
     */
    debugMode = false;
    /** Current simulation tick. */
    get tick() { return this._tick; }
    /** Incremented on structural changes (entity create/remove, component add/remove). */
    get structureVersion() { return this._structureVersion; }
    /** Incremented on any state change (structural change or component mutation). */
    get stateVersion() { return this._stateVersion; }
    /** Seeded RNG service intended for gameplay logic to support reproducibility. */
    get gameplayRandom() { return this._gameplayRandom; }
    getEventBus() { return this.getResource("EventBus"); }
    getCommandBuffer() { return this.commandBuffer; }
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
    get entities() {
        return Array.from(this.activeEntities).sort((a, b) => a - b);
    }
    /**
     * Alias for {@link World.entities}.
     *
     * @remarks
     * @warning
     * **Performance & Memory**: Frequent use in performance-critical paths is discouraged due to O(N log N) sorting
     * and high GC pressure from array allocations.
     */
    getAllEntities() {
        return this.entities;
    }
    getEntityComponentTypes(entity) {
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
    createEntity() {
        const id = this.freeEntities.length > 0 ? this.freeEntities.pop() : this.nextEntityId++;
        this.activeEntities.add(id);
        this._structureVersion++;
        return id;
    }
    /**
     * Reserves an entity ID without activating it.
     */
    reserveEntityId() {
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
    removeEntity(entity) {
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
    hasEntity(entity) {
        return this.activeEntities.has(entity);
    }
    clear() {
        this.activeEntities.forEach(e => this.removeEntity(e));
        this.freeEntities = [];
        this.nextEntityId = 1;
        this.resources.clear();
        this._tick = 0;
        this._stateVersion = 0;
        this._structureVersion = 0;
    }
    clearSystems() {
        this.systems.forEach(s => s.system.dispose());
        this.systems = [];
    }
    /**
     * Adds a component to an entity.
     *
     * @warning
     * **Structural Change**: Adding components during an update loop may disrupt
     * ongoing iterations and triggers immediate query updates. Deferring this through
     * {@link WorldCommandBuffer} is recommended to ensure consistency across all systems.
     */
    addComponent(entity, component) {
        const type = component.type;
        if (!this.componentMaps.has(type)) {
            this.componentMaps.set(type, new Map());
            this.componentIndex.set(type, new Set());
        }
        this.componentMaps.get(type).set(entity, component);
        this.componentIndex.get(type).add(entity);
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
    hasComponent(entity, type) {
        return this.componentIndex.get(type)?.has(entity) ?? false;
    }
    getComponent(entity, type) {
        return this.componentMaps.get(type)?.get(entity);
    }
    getMutableComponent(entity, type) {
        const component = this.getComponent(entity, type);
        if (component) {
            this._stateVersion++;
            this.updateComponentVersion(entity, type);
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
    removeComponent(entity, type) {
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
    mutateComponent(entity, type, updater) {
        const component = this.getMutableComponent(entity, type);
        if (!component)
            return false;
        updater(component);
        return true;
    }
    getQuery(...componentTypes) {
        const key = [...componentTypes].sort().join(",");
        let query = this.queries.get(key);
        if (!query) {
            query = new Query_1.Query(componentTypes);
            this.queries.set(key, query);
            for (const type of componentTypes) {
                if (!this.queriesByComponent.has(type))
                    this.queriesByComponent.set(type, new Set());
                this.queriesByComponent.get(type).add(query);
            }
            this.activeEntities.forEach(entity => {
                const set = this.entityComponentSets.get(entity);
                if (set && query.matches(set))
                    query.add(entity);
            });
        }
        return query;
    }
    query(...componentTypes) {
        return this.getQuery(...componentTypes).getEntities();
    }
    notifyQueries(entity, componentSet, changedType) {
        const affected = this.queriesByComponent.get(changedType);
        if (affected) {
            affected.forEach(query => {
                if (query.matches(componentSet))
                    query.add(entity);
                else
                    query.remove(entity);
            });
        }
    }
    addSystem(system, config = {}) {
        this.systems.push({
            system,
            phase: config.phase ?? System_1.SystemPhase.Simulation,
            priority: config.priority ?? 0
        });
        system.onRegister(this);
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
    update(deltaTime) {
        this._tick++;
        this.isUpdating = true;
        RandomService_1.RandomService.lockGameplayContext = true;
        try {
            const phases = [
                System_1.SystemPhase.Input,
                System_1.SystemPhase.Simulation,
                System_1.SystemPhase.Transform,
                System_1.SystemPhase.Collision,
                System_1.SystemPhase.GameRules,
                System_1.SystemPhase.Presentation
            ];
            for (const phase of phases) {
                const systems = this.systems
                    .filter(s => s.phase === phase)
                    .sort((a, b) => b.priority - a.priority);
                for (const reg of systems) {
                    reg.system.update(this, deltaTime);
                }
            }
        }
        finally {
            this.isUpdating = false;
            RandomService_1.RandomService.lockGameplayContext = false;
        }
        this.flush();
    }
    flush() {
        this.commandBuffer.flush(this);
    }
    /**
     * Manually advances the world's simulation tick.
     *
     * @remarks
     * This is typically called automatically by {@link update}, but can be used
     * manually in custom simulation loops or for re-simulation/rollback.
     */
    advanceTick() {
        this._tick++;
    }
    getSingleton(type) {
        const entities = this.query(type);
        if (entities.length === 0)
            return undefined;
        return this.getComponent(entities[0], type);
    }
    mutateSingleton(type, mutator) {
        const entities = this.query(type);
        if (entities.length > 0) {
            this.mutateComponent(entities[0], type, mutator);
        }
    }
    setResource(name, resource) {
        this.resources.set(name, resource);
    }
    getResource(name) {
        return this.resources.get(name);
    }
    updateComponentVersion(entity, type) {
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
    snapshot(target) {
        return SnapshotSerializer_1.SnapshotSerializer.snapshot(this, target);
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
    restore(state) {
        SnapshotRestore_1.SnapshotRestore.restore(this, state);
    }
    /**
     * Captures the changes in component data since a specific version.
     *
     * @param sinceVersion - The state version to compare against.
     * @returns A partial snapshot containing only the changed components.
     */
    deltaSnapshot(sinceVersion) {
        return SnapshotSerializer_1.SnapshotSerializer.deltaSnapshot(this, sinceVersion);
    }
}
exports.World = World;
