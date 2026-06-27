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
    // Cast to core world to access standard components safely in generics context
    const w = world as unknown as World<CoreComponentRegistry>;

    // Handle Camera
    const cameras = w.query("Camera2D");
    const mainCameraEntity = Array.from(cameras).find(c => w.getComponent(c, "Camera2D")?.isMain);

    canvas.save();

    if (mainCameraEntity !== undefined) {
      const cam = w.getComponent(mainCameraEntity, "Camera2D")!;
      canvas.translate(-cam.x, -cam.y);
      canvas.scale(cam.zoom, cam.zoom);
    }

    const entities = w.query("Transform", "Render");

    // Sort by order to handle layering
    const sortedEntities = Array.from(entities).sort((a, b) => {
      const renderA = w.getComponent(a, "Render")!;
      const renderB = w.getComponent(b, "Render")!;
      return (renderA.order || 0) - (renderB.order || 0);
    });

    for (const entity of sortedEntities) {
      const transform = w.getComponent(entity, "Transform")!;
      const render = w.getComponent(entity, "Render")!;

      if (!render.visible || render.opacity === 0) continue;

      canvas.save();

      const visualOffset = w.getComponent(entity, "VisualOffset");
      const offsetX = visualOffset?.offsetX ?? 0;
      const offsetY = visualOffset?.offsetY ?? 0;

      const x = (transform.worldX ?? transform.x) ?? 0;
      const y = (transform.worldY ?? transform.y) ?? 0;
      const rotation = (transform.worldRotation ?? transform.rotation ?? 0) + (render.rotation ?? 0);
      const scaleX = (transform.worldScaleX ?? transform.scaleX ?? 1);
      const scaleY = (transform.worldScaleY ?? transform.scaleY ?? 1);

      canvas.translate(x + offsetX, y + offsetY);
      canvas.rotate((rotation * 180) / Math.PI, 0, 0);
      canvas.scale(scaleX, scaleY);

      this.paint.setColor(Skia.Color(render.color || "white"));
      this.paint.setAlphaf(render.opacity ?? 1);

      const collider = w.getComponent(entity, "Collider");
      if (collider && collider.enabled) {
        const shape = collider.shape;
        const colOffsetX = collider.offsetX ?? 0;
        const colOffsetY = collider.offsetY ?? 0;

        if (shape.type === ShapeType.Circle) {
          canvas.drawCircle(colOffsetX, colOffsetY, shape.radius, this.paint);
        } else if (shape.type === ShapeType.Box) {
          canvas.drawRect(
            Skia.XYWHRect(colOffsetX - shape.width / 2, colOffsetY - shape.height / 2, shape.width, shape.height),
            this.paint
          );
        }
      } else {
        canvas.drawCircle(0, 0, 5, this.paint);
      }

      canvas.restore();
    }

    canvas.restore();
  }
}
