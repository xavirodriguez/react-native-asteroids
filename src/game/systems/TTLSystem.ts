import { System, type World } from "../ecs-world"
import type { TTLComponent } from "../../types/GameTypes"

/**
 * System responsible for managing the "Time To Live" (TTL) of entities.
 *
 * @remarks
 * This system decrements the `remaining` time in the {@link TTLComponent} of entities.
 * Once the time reaches zero or below, the entity is removed from the world.
 * This is primarily used for short-lived entities like bullets.
 */
export class TTLSystem extends System {
  /**
   * Updates the TTL for all relevant entities and removes expired ones.
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

    // Remove entities in a separate pass to avoid mutation issues during iteration
    entitiesToRemove.forEach((entity) => {
      world.removeEntity(entity)
    })
  }
}
