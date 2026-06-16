import { World, Renderer, ComponentRegistry } from "@tiny-aster/core";

export class CanvasRenderer<TRegistry extends ComponentRegistry = any> implements Renderer<TRegistry> {
  public render(world: World<TRegistry>, ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

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
            ctx.fillRect(-10, -10, 20, 20);
        }

        ctx.restore();
    }
  }
}
