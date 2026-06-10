import { World } from "../index";
import { Entity, Component } from "../ecs/CoreComponents";
import { PrefabPool } from "./PrefabPool";

/**
 * Standardized utility to create a projectile from a PrefabPool.
 */
export function createProjectile<T extends Record<string, Component>, I>(
  world: World,
  pool: PrefabPool<T, I>,
  params: I
): Entity {
  return pool.acquire(world, params);
}

/**
 * Standardized utility to release a projectile back to its pool and remove it from the world.
 */
export function releaseProjectile<T extends Record<string, Component>, I>(
  world: World,
  pool: PrefabPool<T, I>,
  entity: Entity
): void {
  pool.release(world, entity);
  world.getCommandBuffer().removeEntity(entity);
}
