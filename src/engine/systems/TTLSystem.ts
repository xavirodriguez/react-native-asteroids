import { System } from "../core/System";
import { World } from "../core/World";
import { TTLComponent, ReclaimableComponent } from "../types/EngineTypes";
import { IEntityPool } from "../types/EngineTypes";

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
        const ttl = world.getComponent<TTLComponent>(entity, "TTL");
        const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");

        if (ttl?.onCompleteEvent) {
          const bus = world.getResource<import("../core/EventBus").EventBus>("EventBus");
          if (bus) bus.emitDeferred(ttl.onCompleteEvent, { entity });
        }

        if (reclaimable) {
          const pool = world.getResource<IEntityPool>(reclaimable.poolId);
          if (pool && typeof pool.release === "function") {
            pool.release(world, entity);
          }
        }

        world.getCommandBuffer().removeEntity(entity);
      }
    });
  }
}
