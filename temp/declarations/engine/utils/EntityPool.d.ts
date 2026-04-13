import { World } from "../core/World";
import { Entity, Component } from "../types/EngineTypes";
/**
 * Generic EntityPool that manages a pool of component sets.
 * Reduces GC pressure by reusing component objects across entities.
 *
 * @template T - A record of component types that form the pooled entity.
 */
export declare class EntityPool<T extends Record<string, Component>> {
    private pool;
    private keyToType;
    /**
     * @param factory - Creates a new set of component objects.
     * @param reset - Resets component data before an entity is returned to the pool.
     * @param initialSize - Number of entities to pre-allocate.
     */
    constructor(factory: () => T, reset: (data: T) => void, initialSize?: number);
    /**
     * Acquires an entity and attaches the pooled components.
     * Returns both the entity ID and the component set for custom initialization.
     *
     * @param world - The ECS world.
     * @returns An object containing the new entity ID and the component set.
     */
    acquire(world: World): {
        entity: Entity;
        components: T;
    };
    /**
     * Releases an entity's components back to the pool.
     * NOTE: This does NOT remove the entity from the world. The caller is responsible
     * for calling world.removeEntity(entity) after notifying the pool.
     *
     * @param world - The ECS world.
     * @param entity - The entity to reclaim.
     */
    release(world: World, entity: Entity): void;
    /**
     * Returns the number of available entity component sets in the pool.
     */
    get size(): number;
}
