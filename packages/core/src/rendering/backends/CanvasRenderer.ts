import { World } from "../../ecs/World";
import { Renderer } from "../Renderer";
import { ComponentRegistry } from "../../ecs/Component";

export class CanvasRenderer<TRegistry extends ComponentRegistry = any> implements Renderer<TRegistry> {
  public render(world: World<TRegistry>, ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Basic implementation: render all entities with a Render component
    // In a real scenario, this would use the Camera, sorting, etc.
    const renderables = world.query("Render" as any);
    for (const entity of renderables) {
        const render = world.getComponent(entity, "Render" as any) as any;
        const transform = world.getComponent(entity, "Transform" as any) as any;

        if (!render || !render.visible || !transform) continue;

        ctx.save();
        ctx.globalAlpha = render.opacity;
        ctx.translate(transform.x, transform.y);
        ctx.rotate(transform.rotation + render.rotation);

        if (render.color) {
            ctx.fillStyle = render.color;
            ctx.fillRect(-10, -10, 20, 20); // Placeholder
        }

        ctx.restore();
    }
  }
}
