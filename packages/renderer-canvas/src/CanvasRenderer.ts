import { World, Renderer, CoreComponentRegistry, ShapeType, Entity, ShapeDrawer, TransformComponent, RenderComponent, ColliderComponent } from "@tiny-aster/core";

/**
 * Basic 2D Canvas renderer.
 */
export class CanvasRenderer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements Renderer<TRegistry, CanvasRenderingContext2D> {
  private sortedEntities: Entity[] = [];

  constructor(
    private readonly shapeDrawers: Map<string, ShapeDrawer<CanvasRenderingContext2D, TRegistry>>
  ) {}

  public render(world: World<TRegistry>, ctx: CanvasRenderingContext2D): void {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const transformType = "Transform" as Extract<keyof TRegistry, string>;
    const renderType = "Render" as Extract<keyof TRegistry, string>;
    const colliderType = "Collider" as Extract<keyof TRegistry, string>;

    const entities = world.query(transformType, renderType);

    if (this.sortedEntities.length !== entities.length) {
      this.sortedEntities = [...entities];
    } else {
      for (let i = 0; i < entities.length; i++) {
        this.sortedEntities[i] = entities[i];
      }
    }

    this.sortedEntities.sort((a, b) => {
      const renderA = world.getComponent(a, renderType) as unknown as RenderComponent | undefined;
      const renderB = world.getComponent(b, renderType) as unknown as RenderComponent | undefined;
      return (renderA?.order || 0) - (renderB?.order || 0);
    });

    for (const entity of this.sortedEntities) {
      const render = world.getComponent(entity, renderType) as unknown as RenderComponent | undefined;
      const transform = world.getComponent(entity, transformType) as unknown as TransformComponent | undefined;

      if (!render || !render.visible || render.opacity === 0) continue;
      if (!transform) continue;

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

      const collider = world.getComponent(entity, colliderType) as unknown as ColliderComponent | undefined;
      if (collider && collider.enabled) {
        const shapeTypeStr = ShapeType[collider.shape.type];
        const drawer = this.shapeDrawers.get(shapeTypeStr);
        if (drawer) {
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
