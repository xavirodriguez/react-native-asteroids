import { World, Renderer, CoreComponentRegistry, ShapeType, Entity, ShapeDrawer } from "@tiny-aster/core";

/**
 * Basic 2D Canvas renderer.
 *
 * @remarks
 * This is a reference implementation of the {@link Renderer} interface using
 * the standard HTML5 Canvas API. It is designed for simple 2D rendering;
 * however, performance is expected to degrade with large numbers of entities
 * due to direct draw calls and lack of automatic batching.
 *
 * @warning
 * **Visual State Only**: The renderer only processes visual components and transforms.
 * It does not maintain logical simulation state.
 */
export class CanvasRenderer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements Renderer<TRegistry, CanvasRenderingContext2D> {
  private sortedEntities: Entity[] = [];

  constructor(
    private readonly shapeDrawers: Map<string, ShapeDrawer<CanvasRenderingContext2D, TRegistry>>
  ) {}

  public render(world: World<TRegistry>, ctx: CanvasRenderingContext2D): void {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Use core components for rendering
    // We cast to a world that definitely has core components to avoid 'as any'
    const w = world as World<CoreComponentRegistry>;
    const entities = w.query("Transform", "Render");

    // Maintain a stable sorted list to reduce allocations if count hasn't changed (simplistic optimization)
    if (this.sortedEntities.length !== entities.length) {
      this.sortedEntities = [...entities];
    } else {
      for (let i = 0; i < entities.length; i++) {
        this.sortedEntities[i] = entities[i];
      }
    }

    this.sortedEntities.sort((a, b) => {
      const renderA = w.getComponent(a, "Render")!;
      const renderB = w.getComponent(b, "Render")!;
      return (renderA.order || 0) - (renderB.order || 0);
    });

    for (const entity of this.sortedEntities) {
      const render = w.getComponent(entity, "Render")!;
      const transform = w.getComponent(entity, "Transform")!;

      if (!render.visible || render.opacity === 0) continue;

      ctx.save();

      const x = transform.worldX ?? transform.x;
      const y = transform.worldY ?? transform.y;
      const rotation = (transform.worldRotation ?? transform.rotation ?? 0) + (render.rotation ?? 0);
      const scaleX = transform.worldScaleX ?? transform.scaleX ?? 1;
      const scaleY = transform.worldScaleY ?? transform.scaleY ?? 1;

      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(scaleX, scaleY);
      ctx.globalAlpha = render.opacity;

      if (render.color) {
        ctx.fillStyle = render.color;
      }

      const collider = w.getComponent(entity, "Collider");
      if (collider && collider.enabled) {
        const shapeTypeStr = ShapeType[collider.shape.type];
        const drawer = this.shapeDrawers.get(shapeTypeStr);
        if (drawer) {
          // Draw using the original world and entity to maintain generic safety
          drawer.draw(ctx, world, entity);
        }
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
