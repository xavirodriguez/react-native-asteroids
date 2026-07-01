import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { IEntityPool, CoreComponentRegistry } from "../ecs/CoreComponents";
import { EventBus, EventRegistry } from "../events/EventBus";

/**
 * System responsible for managing the lifetime (Time To Live) of entities.
 *
 * @remarks
 * This system decrements the `TTL` component and schedules entities for removal
 * when their time expires. It can also emit events via the {@link EventBus}
 * and release entities back to designated object pools.
 *
 * Note: Entity removal is deferred through the {@link WorldCommandBuffer}.
 */
export class TTLSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const entities = world.query("TTL");

    for (const entity of entities) {
      let expired = false;

      world.mutateComponent(entity, "TTL", (ttl) => {
        ttl.remaining -= deltaTime;
        expired = ttl.remaining <= 0;
      });

      if (expired) {
        const ttl = world.getComponent(entity, "TTL");
        const reclaimable = world.getComponent(entity, "Reclaimable");

        if (ttl?.onCompleteEvent) {
          const bus = world.getEventBus();
          if (bus) {
            bus.emitDeferred(ttl.onCompleteEvent as string & keyof EventRegistry, { entity } as never);
          }
        }

        if (reclaimable) {
          const pool = world.getResource<IEntityPool>(reclaimable.poolId);
          if (pool && typeof pool.release === "function") {
            pool.release(entity);
          }
        }

        world.getCommandBuffer().removeEntity(entity);
      }
    }
  }
}
