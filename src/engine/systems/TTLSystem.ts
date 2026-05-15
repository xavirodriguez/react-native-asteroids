import { System } from "../core/System";
import { World } from "../core/World";
import { TTLComponent, ReclaimableComponent } from "../types/EngineTypes";

/**
 * System responsible for managing the lifetime (Time To Live) of entities.
 * Automates the destruction of projectiles, particles, or temporary effects.
 *
 * API status: Public
 *
 * Responsibility: Decrement the remaining time in {@link TTLComponent}.
 *
 * Responsibility: Destroy the entity when time reaches zero.
 *
 * Responsibility: Notify recycling pools via {@link ReclaimableComponent}.
 *
 * @remarks
 * The system attempts to invoke the `onComplete` callback defined in the component before
 * requesting the entity's removal from the world.
 *
 * Queries: TTL
 *
 * Mutates: TTL.remaining, World (entity removal)
 *
 * Emits: onComplete
 *
 * Execution Order: Simulation Phase. Usually at the end of the physics phase.
 */
export class TTLSystem extends System {
  /**
   * Updates the lifetime of entities.
   *
   * @param world - The ECS world.
   * @param deltaTime - Elapsed time in milliseconds [ms].
   *
   * Precondition: Entities must possess a {@link TTLComponent}.
   *
   * Postcondition: `remaining` is reduced. If it reaches \<= 0, the entity is removed.
   */
  public update(world: World, deltaTime: number): void {
    const ttlEntities = world.query("TTL");

    for (let i = 0; i < ttlEntities.length; i++) {
      const entity = ttlEntities[i];
      const ttl = world.getComponent<TTLComponent>(entity, "TTL");
      if (ttl) {
        ttl.remaining -= deltaTime;
        if (ttl.remaining <= 0) {
          // Trigger onComplete callback if present
          if (ttl.onComplete) {
            ttl.onComplete();
          }

          // Notify pool before removal if reclaimable
          const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");
          if (reclaimable) {
            reclaimable.onReclaim(world, entity);
          }

          world.removeEntity(entity);
        }
      }
    }
  }
}
