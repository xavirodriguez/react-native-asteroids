import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

export class RenderUpdateSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.isReSimulating) return;

    const dtSeconds = deltaTime / 1000;

    // Update Trail points
    const trailQuery = world.getQuery("Transform", "Trail");
    trailQuery.forEach(entity => {
        const transform = world.getComponent(entity, "Transform")!;

        world.mutateComponent(entity, "Trail", trail => {
            trail.currentIndex = (trail.currentIndex + 1) % trail.maxLength;
            const point = trail.points[trail.currentIndex];
            if (point) {
                (point as any).x = transform.worldX ?? transform.x;
                (point as any).y = transform.worldY ?? transform.y;
            }
            if (trail.count < trail.maxLength) {
                trail.count++;
            }
        });
    });

    // Update procedural rotation for Render component
    const renderQuery = world.getQuery("Render");
    renderQuery.forEach(entity => {
        const render = world.getComponent(entity, "Render")!;
        if (render.angularVelocity && render.angularVelocity !== 0) {
            world.mutateComponent(entity, "Render", r => {
                r.rotation += (r.angularVelocity || 0) * dtSeconds;
            });
        }

        if (render.hitFlashFrames && render.hitFlashFrames > 0) {
            world.mutateComponent(entity, "Render", r => {
                r.hitFlashFrames = (r.hitFlashFrames || 0) - 1;
            });
        }
    });
  }
}
