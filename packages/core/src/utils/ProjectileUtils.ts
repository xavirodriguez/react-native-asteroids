<<<<<<< HEAD:packages/core/src/utils/ProjectileUtils.ts
import { World } from "../ecs/World";
=======
import { World } from "../index";
>>>>>>> 93349d556c08ba34cd14983bf284c3a8e1459376:packages/core/src/utils/ProjectileUtils.ts
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
