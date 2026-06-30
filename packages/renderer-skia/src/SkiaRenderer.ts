import { World, Renderer, CoreComponentRegistry, ShapeType, ShapeDrawer, Entity, Camera2DComponent, RenderComponent, TransformComponent, VisualOffsetComponent, ColliderComponent } from "@tiny-aster/core";
import { SkCanvas, SkPaint, Skia } from "@shopify/react-native-skia";

/**
 * Skia renderer implementation for TinyAster using @shopify/react-native-skia.
 */
export class SkiaRenderer<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> implements Renderer<TRegistry, SkCanvas> {
  private paint: SkPaint;

  constructor(
    private readonly shapeDrawers: Map<string, ShapeDrawer<SkCanvas, TRegistry>>
  ) {
    this.paint = Skia.Paint();
  }

  public render(world: World<TRegistry>, canvas: SkCanvas, _interpolation?: number): void {
    const cameraType = "Camera2D" as Extract<keyof TRegistry, string>;
    const transformType = "Transform" as Extract<keyof TRegistry, string>;
    const renderType = "Render" as Extract<keyof TRegistry, string>;
    const visualOffsetType = "VisualOffset" as Extract<keyof TRegistry, string>;
    const colliderType = "Collider" as Extract<keyof TRegistry, string>;

    // Handle Camera
    const cameras = world.query(cameraType);
    let mainCameraEntity: Entity | undefined;

    for (let i = 0; i < cameras.length; i++) {
      const cam = world.getComponent(cameras[i], cameraType) as unknown as Camera2DComponent | undefined;
      if (cam?.isMain) {
        mainCameraEntity = cameras[i];
        break;
      }
    }

    canvas.save();

    if (mainCameraEntity !== undefined) {
      const cam = world.getComponent(mainCameraEntity, cameraType) as unknown as Camera2DComponent | undefined;
      if (cam) {
        // Center camera and apply zoom
        canvas.translate(-cam.x, -cam.y);
        canvas.scale(cam.zoom, cam.zoom);
      }
    }

    const entities = world.query(transformType, renderType);

    // Sort by order to handle layering
    const sortedEntities = [...entities].sort((a, b) => {
      const renderA = world.getComponent(a, renderType) as unknown as RenderComponent | undefined;
      const renderB = world.getComponent(b, renderType) as unknown as RenderComponent | undefined;
      return (renderA?.order || 0) - (renderB?.order || 0);
    });

    for (let i = 0; i < sortedEntities.length; i++) {
      const entity = sortedEntities[i];
      const transform = world.getComponent(entity, transformType) as unknown as TransformComponent | undefined;
      const render = world.getComponent(entity, renderType) as unknown as RenderComponent | undefined;

      if (!render || !transform || !render.visible || render.opacity === 0) continue;

      canvas.save();

      const visualOffset = world.getComponent(entity, visualOffsetType) as unknown as VisualOffsetComponent | undefined;
      const offsetX = visualOffset?.offsetX ?? 0;
      const offsetY = visualOffset?.offsetY ?? 0;

      const x = transform.worldX ?? transform.x;
      const y = transform.worldY ?? transform.y;
      const rotation = (transform.worldRotation ?? transform.rotation ?? 0) + (render.rotation ?? 0);
      const scaleX = transform.worldScaleX ?? transform.scaleX ?? 1;
      const scaleY = transform.worldScaleY ?? transform.scaleY ?? 1;

      canvas.translate(x + offsetX, y + offsetY);
      canvas.rotate((rotation * 180) / Math.PI, 0, 0);
      canvas.scale(scaleX, scaleY);

      this.paint.setColor(Skia.Color(render.color || "white"));
      this.paint.setAlphaf(render.opacity ?? 1);

      const collider = world.getComponent(entity, colliderType) as unknown as ColliderComponent | undefined;
      if (collider && collider.enabled) {
        const shapeTypeStr = ShapeType[collider.shape.type];
        const drawer = this.shapeDrawers.get(shapeTypeStr);
        if (drawer) {
          drawer.draw(canvas, world, entity);
        }
      } else {
        canvas.drawCircle(0, 0, 5, this.paint);
      }

      canvas.restore();
    }

    canvas.restore();
  }
}
