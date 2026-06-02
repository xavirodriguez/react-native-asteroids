import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { RenderComponent, TransformComponent, TrailComponent } from "../ecs/CoreComponents";

/**
 * System that performs miscellaneous visual updates.
 */
export class RenderUpdateSystem extends System {
  public update(world: World, deltaTime: number): void {
    if (world.isReSimulating) return;

    const dtSeconds = deltaTime / 1000;

    // Update Trail points
    const trailQuery = world.getQuery("Transform", "Trail");
    trailQuery.forEach(entity => {
        const transform = world.getComponent<TransformComponent>(entity, "Transform")!;

        world.mutateComponent<TrailComponent>(entity, "Trail", trail => {
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
    });

    // Update procedural rotation for Render component (separate from physics rotation)
    const renderQuery = world.getQuery("Render");
    renderQuery.forEach(entity => {
        const render = world.getComponent<RenderComponent>(entity, "Render")!;
        if (render.angularVelocity && render.angularVelocity !== 0) {
            world.mutateComponent<RenderComponent>(entity, "Render", r => {
                r.rotation += (r.angularVelocity || 0) * dtSeconds;
            });
        }

        // Update hit flash
        if (render.hitFlashFrames && render.hitFlashFrames > 0) {
            world.mutateComponent<RenderComponent>(entity, "Render", r => {
                r.hitFlashFrames = (r.hitFlashFrames || 0) - 1;
            });
        }
    });
  }
}
