import { System } from "../core/System";
import { World } from "../core/World";
import { TTLComponent, ReclaimableComponent } from "../types/EngineTypes";

/**
 * System responsible for managing the lifetime (Time To Live) of entities.
 * Automates the destruction of projectiles, particles, or temporary effects.
 *
 * API status: Public
 */
export class TTLSystem extends System {
  /**
   * Updates the lifetime of entities.
   *
   * @param world - The ECS world.
   * @param deltaTime - Elapsed time in milliseconds [ms].
   */
  public update(world: World, deltaTime: number): void {
    const query = world.getQuery("TTL");

    query.forEach((entity) => {
      let expired = false;

      world.mutateComponent<TTLComponent>(entity, "TTL", (ttl) => {
        ttl.remaining -= deltaTime;
        expired = ttl.remaining <= 0;
      });

      if (expired) {
        // Need to fetch again because we need the most recent state
        const ttl = world.getComponent<TTLComponent>(entity, "TTL");
        
        // Notify pool before removal if reclaimable
        const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");

        // Hooks and lifecycle notifications MUST execute outside world.mutateComponent
        if (ttl?.onComplete) {
          ttl.onComplete();
        }

        if (reclaimable) {
          reclaimable.onReclaim(world, entity);
        }

        world.getCommandBuffer().removeEntity(entity);
      }
    });
  }
}
