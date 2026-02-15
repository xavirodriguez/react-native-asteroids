import { System, type World } from "../ecs-world"
import type { TTLComponent } from "../../types/GameTypes"

/**
 * System responsible for managing the lifetime of entities with a {@link TTLComponent}.
 *
 * @remarks
 * This system decrements the remaining time for each entity and removes the entity
 * from the world once its time-to-live reaches zero or below. It is primarily
 * used for bullets.
 */
export class TTLSystem extends System {
  /**
   * Updates the remaining time for TTL entities and removes expired ones.
   *
   * @param world - The ECS world.
   * @param deltaTime - Time since last frame in milliseconds.
   */
  update(world: World, deltaTime: number): void {
    const ttlEntities = world.query("TTL")
    const entitiesToRemove: number[] = []

    ttlEntities.forEach((entity) => {
      const ttl = world.getComponent<TTLComponent>(entity, "TTL")!
      ttl.remaining -= deltaTime

      if (ttl.remaining <= 0) {
        entitiesToRemove.push(entity)
      }
    })

    // Remove all expired entities after the query iteration
    entitiesToRemove.forEach((entity) => {
      world.removeEntity(entity)
    })
  }
}
