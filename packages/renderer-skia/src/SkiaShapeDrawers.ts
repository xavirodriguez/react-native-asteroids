import { World, ShapeDrawer, CoreComponentRegistry, ShapeType, CircleShape, BoxShape } from "@tiny-aster/core";
import { SkCanvas, SkPaint, Skia } from "@shopify/react-native-skia";

/**
 * Drawer for circle shapes using React Native Skia.
 */
export class SkiaCircleDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<SkCanvas, TRegistry> {
  constructor(private readonly paint: SkPaint) {}

  public draw(canvas: SkCanvas, world: World<TRegistry>, entity: number): void {
    const collider = (world as World<CoreComponentRegistry>).getComponent(entity, "Collider");
    if (!collider || !collider.enabled || collider.shape.type !== ShapeType.Circle) return;

    const shape = collider.shape as CircleShape;
    const offsetX = collider.offsetX ?? 0;
    const offsetY = collider.offsetY ?? 0;

    canvas.drawCircle(offsetX, offsetY, shape.radius, this.paint);
  }
}

/**
 * Drawer for box shapes using React Native Skia.
 */
export class SkiaBoxDrawer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements ShapeDrawer<SkCanvas, TRegistry> {
  constructor(private readonly paint: SkPaint) {}

  public draw(canvas: SkCanvas, world: World<TRegistry>, entity: number): void {
    const collider = (world as World<CoreComponentRegistry>).getComponent(entity, "Collider");
    if (!collider || !collider.enabled || collider.shape.type !== ShapeType.Box) return;

    const shape = collider.shape as BoxShape;
    const offsetX = collider.offsetX ?? 0;
    const offsetY = collider.offsetY ?? 0;

    canvas.drawRect(
      Skia.XYWHRect(offsetX - shape.width / 2, offsetY - shape.height / 2, shape.width, shape.height),
      this.paint
    );
  }
}
