import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * System that updates visual properties of entities before rendering.
 *
 * @remarks
 * This system handles:
 * - Trail point updates based on entity position.
 * - Procedural rotation for components with angular velocity.
 * - Visual effects like hit flash duration.
 *
 * Note: This system skips updates during re-simulation (e.g., network rollback)
 * to avoid visual glitches in transient states.
 */
export class RenderUpdateSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.isReSimulating) return;

    // Update Trail points
    const trailEntities = world.query("Transform", "Trail");
    for (const entity of trailEntities) {
        const transform = world.getComponent(entity, "Transform")!;

        world.mutateComponent(entity, "Trail", trail => {
            trail.currentIndex = (trail.currentIndex + 1) % trail.maxLength;
            const point = trail.points[trail.currentIndex];
            if (point) {
                point.x = transform.worldX ?? transform.x;
                point.y = transform.worldY ?? transform.y;
            }
            if (trail.count < trail.maxLength) {
                trail.count++;
            }
        });
    }

    // Update procedural rotation for Render component
    const renderEntities = world.query("Render");
    for (const entity of renderEntities) {
        const render = world.getComponent(entity, "Render")!;
        if (render.angularVelocity && render.angularVelocity !== 0) {
            world.mutateComponent(entity, "Render", r => {
                r.rotation += r.angularVelocity * deltaTime;
            });
        }

        if (render.hitFlashFrames && render.hitFlashFrames > 0) {
            world.mutateComponent(entity, "Render", r => {
                r.hitFlashFrames = r.hitFlashFrames - 1;
            });
        }
    }
  }
}
