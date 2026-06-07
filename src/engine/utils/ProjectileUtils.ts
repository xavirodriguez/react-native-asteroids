import { World } from "@tiny-aster/core";
import { Entity, Component } from "../types/EngineTypes";
import { PrefabPool } from "./PrefabPool";

/**
 * Standardized utility to create a projectile from a PrefabPool.
 *
 * @param world - The ECS world.
 * @param pool - The PrefabPool instance for the projectile.
 * @param params - Initialization parameters.
 * @returns The created entity ID.
 *
 * API status: Public
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
 *
 * @param world - The ECS world.
 * @param pool - The PrefabPool instance.
 * @param entity - The entity to release.
 *
 * API status: Public
 */
export function releaseProjectile<T extends Record<string, Component>, I>(
  world: World,
  pool: PrefabPool<T, I>,
  entity: Entity
): void {
  // Return components to the pool
  pool.release(world, entity);

  // Defer entity removal
  world.getCommandBuffer().removeEntity(entity);
}
