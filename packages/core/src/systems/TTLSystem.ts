import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { TTLComponent, ReclaimableComponent, IEntityPool, CoreComponentRegistry } from "../ecs/CoreComponents";
import { EventBus } from "../events/EventBus";

/**
 * System responsible for managing the lifetime (Time To Live) of entities.
 */
export class TTLSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const query = world.getQuery("TTL");

    query.forEach((entity) => {
      let expired = false;

      world.mutateComponent(entity, "TTL", (ttl) => {
        ttl.remaining -= deltaTime;
        expired = ttl.remaining <= 0;
      });

      if (expired) {
        const ttl = world.getComponent(entity, "TTL");
        const reclaimable = world.getComponent(entity, "Reclaimable");

        if (ttl?.onCompleteEvent) {
          const bus = world.getResource<EventBus>("EventBus");
          if (bus) bus.emitDeferred(ttl.onCompleteEvent as any, { entity });
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
