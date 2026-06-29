"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovementSystem = void 0;
const System_1 = require("../../ecs/System");
/**
 * System that applies velocity to entity transforms.
 *
 * @remarks
 * This system performs basic semi-implicit Euler integration. It is designed for arcade-style
 * movement and is intended to be used with a fixed timestep to support
 * reproducible behavior under consistent conditions.
 *
 * @warning
 * **Floating-Point Drift**: As this system relies on standard floating-point arithmetic,
 * small precision errors will accumulate over time. The exact trajectory may vary slightly
 * across different JavaScript engines, WASM runtimes, or platforms.
 */
class MovementSystem extends System_1.System {
    update(world, deltaTime) {
        const entities = world.query("Transform", "Velocity");
        for (const entity of entities) {
            const v = world.getComponent(entity, "Velocity");
            world.mutateComponent(entity, "Transform", (t) => {
                t.x += v.vx * deltaTime;
                t.y += v.vy * deltaTime;
                if (v.angularVelocity) {
                    t.rotation += v.angularVelocity * deltaTime;
                }
            });
        }
    }
}
exports.MovementSystem = MovementSystem;
