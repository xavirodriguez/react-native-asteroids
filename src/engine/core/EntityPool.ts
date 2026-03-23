import { Entity } from "./Entity";
import { World } from "./World";

/**
 * Manages a pool of entity IDs for reuse to reduce garbage collection pressure.
 *
 * @remarks
 * In an ECS, "deleting" an entity and "creating" a new one can be expensive if done
 * frequently (e.g., for bullets or particles). This pool keeps track of inactive
 * entity IDs and provides them when a new entity is requested.
 */
export class EntityPool {
  private inactiveEntities: Entity[] = [];

  constructor(private world: World) {}

  /**
   * Acquires an entity from the pool or creates a new one if the pool is empty.
   *
   * @returns A valid {@link Entity} ID.
   */
  public acquire(): Entity {
    return this.inactiveEntities.pop() ?? this.world.createEntity();
  }

  /**
   * Returns an entity to the pool and removes all its components from the world.
   *
   * @param entity - The entity to release.
   */
  public release(entity: Entity): void {
    // We don't remove the entity from the world's entity set,
    // but we strip it of all components so it's effectively "blank".
    this.world.removeEntityComponents(entity);
    this.inactiveEntities.push(entity);
  }

  /**
   * Clears the pool of inactive entities.
   */
  public clear(): void {
    this.inactiveEntities = [];
  }

  /**
   * Returns the number of inactive entities currently in the pool.
   */
  public get size(): number {
    return this.inactiveEntities.length;
  }
}
