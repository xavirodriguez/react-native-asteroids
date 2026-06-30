"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoundarySystem = void 0;
const System_1 = require("../../ecs/System");
/**
 * System that enforces world boundaries on entities.
 *
 * @remarks
 * Supports different boundary modes:
 * - `wrap`: Teleports the entity to the opposite side of the boundary.
 * - `destroy`: Schedules the entity for removal via the {@link WorldCommandBuffer}.
 * - `bounce`: Reverses velocity when hitting a boundary.
 */
class BoundarySystem extends System_1.System {
    update(world, _deltaTime) {
        const entities = world.query("Transform", "Boundary");
        for (const entity of entities) {
            const b = world.getComponent(entity, "Boundary");
            world.mutateComponent(entity, "Transform", (t) => {
                if (b.mode === "wrap") {
                    if (t.x < 0)
                        t.x = b.width;
                    if (t.x > b.width)
                        t.x = 0;
                    if (t.y < 0)
                        t.y = b.height;
                    if (t.y > b.height)
                        t.y = 0;
                }
                else if (b.mode === "destroy") {
                    if (t.x < 0 || t.x > b.width || t.y < 0 || t.y > b.height) {
                        world.getCommandBuffer().removeEntity(entity);
                    }
                }
                else if (b.mode === "bounce") {
                    if (t.x < 0) {
                        t.x = 0;
                        this.reverseVelocity(world, entity, "x");
                    }
                    else if (t.x > b.width) {
                        t.x = b.width;
                        this.reverseVelocity(world, entity, "x");
                    }
                    if (t.y < 0) {
                        t.y = 0;
                        this.reverseVelocity(world, entity, "y");
                    }
                    else if (t.y > b.height) {
                        t.y = b.height;
                        this.reverseVelocity(world, entity, "y");
                    }
                }
            });
        }
    }
    reverseVelocity(world, entity, axis) {
        world.mutateComponent(entity, "Velocity", (v) => {
            if (axis === "x")
                v.vx *= -1;
            else
                v.vy *= -1;
        });
    }
}
exports.BoundarySystem = BoundarySystem;
