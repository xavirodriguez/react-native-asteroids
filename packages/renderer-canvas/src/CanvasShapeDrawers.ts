import { World, ShapeDrawer, CoreComponentRegistry, ShapeType, CircleShape, BoxShape, ColliderComponent } from "@tiny-aster/core";

/**
 * Drawer for circle shapes in HTML5 Canvas.
 */
export class CanvasCircleDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<CanvasRenderingContext2D, TRegistry> {
  public draw(ctx: CanvasRenderingContext2D, world: World<TRegistry>, entity: number): void {
    const colliderType = "Collider" as Extract<keyof TRegistry, string>;
    const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;
    if (!collider || !collider.enabled || collider.shape.type !== ShapeType.Circle) return;

    const shape = collider.shape as CircleShape;
    const offsetX = collider.offsetX ?? 0;
    const offsetY = collider.offsetY ?? 0;

    ctx.beginPath();
    ctx.arc(offsetX, offsetY, shape.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Drawer for box shapes in HTML5 Canvas.
 */
export class CanvasBoxDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<CanvasRenderingContext2D, TRegistry> {
  public draw(ctx: CanvasRenderingContext2D, world: World<TRegistry>, entity: number): void {
    const colliderType = "Collider" as Extract<keyof TRegistry, string>;
    const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;
    if (!collider || !collider.enabled || collider.shape.type !== ShapeType.Box) return;

    const shape = collider.shape as BoxShape;
    const offsetX = collider.offsetX ?? 0;
    const offsetY = collider.offsetY ?? 0;

    ctx.fillRect(
      offsetX - shape.width / 2,
      offsetY - shape.height / 2,
      shape.width,
      shape.height
    );
  }
}
