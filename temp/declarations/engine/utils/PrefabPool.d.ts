import { World } from "../core/World";
import { Entity, Component } from "../types/EngineTypes";
/**
 * Configuration for a PrefabPool.
 */
export interface PrefabConfig<T extends Record<string, Component>, I> {
    factory: () => T;
    reset: (data: T) => void;
    initializer: (components: T, params: I) => void;
    initialSize?: number;
}
/**
 * A PrefabPool provides a declarative way to manage pools of complex entities.
 * It combines an EntityPool with a specific initialization logic.
 */
export declare class PrefabPool<T extends Record<string, Component>, I> {
    private pool;
    private initializer;
    constructor(config: PrefabConfig<T, I>);
    /**
     * Acquires a new entity from the pool and initializes it with the provided parameters.
     */
    acquire(world: World, params: I): Entity;
    /**
     * Releases an entity back to the pool.
     */
    release(world: World, entity: Entity): void;
    /**
     * Current size of the underlying pool.
     */
    get size(): number;
}
