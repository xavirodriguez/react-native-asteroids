import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { Entity } from "../ecs/Entity";

/**
 * Viewport boundaries.
 */
export interface Viewport {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * System that calculates the viewport area based on Camera2D and ScreenConfig,
 * and sets it as a world resource to enable spatial culling.
 */
export class SpatialCullingSystem extends System<CoreComponentRegistry> {
  private margin: number;

  constructor(margin: number = 100) {
    super();
    this.margin = margin;
  }

  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const viewport = SpatialCullingSystem.getViewport(world);
    world.setResource("Viewport", viewport);
    world.setResource("SpatialCullingMargin", this.margin);
  }

  /**
   * Calculates the current viewport area based on Camera2D components or ScreenConfig resource.
   */
  public static getViewport(world: World<any>): Viewport {
    const screenConfig = world.getResource<{ width: number; height: number }>("ScreenConfig");
    const width = screenConfig?.width ?? 800;
    const height = screenConfig?.height ?? 600;

    const cameras = world.query("Camera2D");
    let mainCam: any = null;
    for (const camEntity of cameras) {
      const cam = world.getComponent(camEntity, "Camera2D");
      if (cam?.isMain) {
        mainCam = cam;
        break;
      }
    }

    if (mainCam) {
      const zoom = mainCam.zoom || 1;
      return {
        minX: mainCam.x,
        minY: mainCam.y,
        maxX: mainCam.x + width / zoom,
        maxY: mainCam.y + height / zoom,
        width,
        height,
      };
    }

    return {
      minX: 0,
      minY: 0,
      maxX: width,
      maxY: height,
      width,
      height,
    };
  }

  /**
   * Checks if an entity's transform falls within the current viewport (with margin).
   */
  public static isEntityInViewport(
    world: World<any>,
    entity: Entity,
    margin: number = 100
  ): boolean {
    const transform = world.getComponent(entity, "Transform");
    if (!transform) return false;

    const viewport = world.getResource<Viewport>("Viewport") || this.getViewport(world);
    const x = transform.worldX ?? transform.x;
    const y = transform.worldY ?? transform.y;

    return (
      x >= viewport.minX - margin &&
      x <= viewport.maxX + margin &&
      y >= viewport.minY - margin &&
      y <= viewport.maxY + margin
    );
  }

  /**
   * Filters a list of entities, returning only those that are inside the current viewport (with margin).
   */
  public static filterInViewport(
    world: World<any>,
    entities: Entity[],
    margin: number = 100
  ): Entity[] {
    const viewport = world.getResource<Viewport>("Viewport") || this.getViewport(world);
    const filtered: Entity[] = [];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const transform = world.getComponent(entity, "Transform");
      if (!transform) continue;

      const x = transform.worldX ?? transform.x;
      const y = transform.worldY ?? transform.y;

      if (
        x >= viewport.minX - margin &&
        x <= viewport.maxX + margin &&
        y >= viewport.minY - margin &&
        y <= viewport.maxY + margin
      ) {
        filtered.push(entity);
      }
    }

    return filtered;
  }
}
