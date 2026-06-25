import { World, Renderer, CoreComponentRegistry, ShapeType } from "@tiny-aster/core";
import { SkCanvas, SkPaint, Skia } from "@shopify/react-native-skia";

/**
 * Skia renderer implementation for TinyAster using @shopify/react-native-skia.
 */
export class SkiaRenderer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements Renderer<TRegistry, SkCanvas> {
  private paint: SkPaint;

  constructor() {
    this.paint = Skia.Paint();
  }

  public render(world: World<TRegistry>, canvas: SkCanvas, _interpolation?: number): void {
    // 1. Get all renderable entities
    // Cast to any to avoid strict TRegistry key indexing issues when we know they exist in CoreComponentRegistry
    const w = world as World<CoreComponentRegistry>;
    const entities = w.query("Transform", "Render");

    // 2. Sort by order
    const sortedEntities = Array.from(entities).sort((a, b) => {
      const renderA = w.getComponent(a, "Render")!;
      const renderB = w.getComponent(b, "Render")!;
      return (renderA.order || 0) - (renderB.order || 0);
    });

    // 3. Render each entity
    for (const entity of sortedEntities) {
      const transform = w.getComponent(entity, "Transform")!;
      const render = w.getComponent(entity, "Render")!;

      if (!render.visible || render.opacity === 0) continue;

      canvas.save();

      // Apply transforms
      const x = transform.worldX ?? transform.x;
      const y = transform.worldY ?? transform.y;
      const rotation = (transform.worldRotation ?? transform.rotation ?? 0) + (render.rotation ?? 0);
      const scaleX = transform.worldScaleX ?? transform.scaleX ?? 1;
      const scaleY = transform.worldScaleY ?? transform.scaleY ?? 1;

      canvas.translate(x, y);
      canvas.rotate((rotation * 180) / Math.PI, 0, 0);
      canvas.scale(scaleX, scaleY);

      this.paint.setColor(Skia.Color(render.color || "white"));
      this.paint.setAlphaf(render.opacity ?? 1);

      // Check for collider to determine shape, else default to a small rectangle or circle
      const collider = w.getComponent(entity, "Collider");
      if (collider && collider.enabled) {
        const shape = collider.shape;
        const offsetX = collider.offsetX ?? 0;
        const offsetY = collider.offsetY ?? 0;

        if (shape.type === ShapeType.Circle) {
          canvas.drawCircle(offsetX, offsetY, shape.radius, this.paint);
        } else if (shape.type === ShapeType.Box) {
          canvas.drawRect(
            Skia.XYWHRect(offsetX - shape.width / 2, offsetY - shape.height / 2, shape.width, shape.height),
            this.paint
          );
        }
      } else {
          // Default fallback if no collider
          canvas.drawCircle(0, 0, 5, this.paint);
      }

      canvas.restore();
    }
  }
}
