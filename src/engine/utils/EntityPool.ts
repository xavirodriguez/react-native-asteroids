import { World } from "../core/World";
import { Entity, Component, ReclaimableComponent } from "../types/EngineTypes";
import { ObjectPool } from "./ObjectPool";

/**
 * Generic EntityPool that manages a pool of component sets.
 * Reduces GC pressure by reusing component objects across entities.
 *
 * @template T - A record of component types that form the pooled entity.
 */
export class EntityPool<T extends Record<string, Component>> {
  private pool: ObjectPool<T>;
  private keyToType: Record<string, string>;

  /**
   * @param factory - Creates a new set of component objects.
   * @param reset - Resets component data before an entity is returned to the pool.
   * @param initialSize - Number of entities to pre-allocate.
   */
  constructor(
    factory: () => T,
    reset: (data: T) => void,
    initialSize: number = 0
  ) {
    this.pool = new ObjectPool<T>(factory, reset, initialSize);

    // Capture the mapping from keys in T to ECS component types
    const template = factory();
    this.keyToType = {};
    for (const key in template) {
      this.keyToType[key] = template[key].type;
    }
  }

  /**
   * Acquires an entity and attaches the pooled components.
   * Returns both the entity ID and the component set for custom initialization.
   *
   * @param world - The ECS world.
   * @returns An object containing the new entity ID and the component set.
   */
  public acquire(world: World): { entity: Entity; components: T } {
    const components = this.pool.acquire();
    const entity = world.createEntity();

    for (const key in components) {
      const comp = components[key];

      // Automatically wire up Reclaimable components to return to this pool
      if (comp.type === "Reclaimable") {
        (comp as unknown as ReclaimableComponent).onReclaim = (w, e) => this.release(w, e);
      }

      world.addComponent(entity, comp);
    }

    return { entity, components };
  }

  /**
   * Releases an entity's components back to the pool.
   *
   * @param world - The ECS world.
   * @param entity - The entity to reclaim.
   */
  public release(world: World, entity: Entity): void {
    const components = {} as T;
    let allFound = true;

    for (const key in this.keyToType) {
      const type = this.keyToType[key];
      const comp = world.getComponent(entity, type);
      if (comp) {
        components[key as keyof T] = comp as T[keyof T];
      } else {
        allFound = false;
        break;
      }
    }

    if (allFound) {
      // IMPORTANT: Remove components from entity index to break connection before pooling
      // Actually world.removeEntity(entity) should be enough if it clears component maps.
      world.removeEntity(entity);
      this.pool.release(components);
    }
  }

  /**
   * Returns the number of available entity component sets in the pool.
   */
  public get size(): number {
    return this.pool.size;
  }
}
