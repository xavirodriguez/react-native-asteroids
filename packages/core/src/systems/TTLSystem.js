"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTLSystem = void 0;
const System_1 = require("../ecs/System");
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
class TTLSystem extends System_1.System {
    update(world, deltaTime) {
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
                        bus.emitDeferred(ttl.onCompleteEvent, { entity });
                    }
                }
                if (reclaimable) {
                    const pool = world.getResource(reclaimable.poolId);
                    if (pool && typeof pool.release === "function") {
                        pool.release(entity);
                    }
                }
                world.getCommandBuffer().removeEntity(entity);
            }
        }
    }
}
exports.TTLSystem = TTLSystem;
