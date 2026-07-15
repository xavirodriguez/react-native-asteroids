import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { Entity } from "../ecs/Entity";

/**
 * System that optimizes performance in high entity density scenarios
 * by culling entities outside of the active viewport.
 *
 * @remarks
 * This system filters entities with a `Transform` component to determine if they reside
 * within the active viewport bounds (defined by the main `Camera2D` if available, or the
 * `ScreenConfig` world resource), plus a configurable buffer margin.
 *
 * The filtered candidate list of active entity IDs is stored in the world resource
 * `"SpatialCullingCandidates"`. Downstream systems like `MovementSystem`, `FrictionSystem`,
 * and `CollisionSystem2D` can then use this pre-filtered list to bypass checking/updating
 * entities that are far off-screen.
 *
 * To prevent crucial gameplay objects from being culled (e.g., player ships), entities
 * with components like `"LocalPlayer"` or `"Player"` are always preserved as candidates regardless
 * of their screen coordinates.
 */
export class SpatialCullingSystem extends System<CoreComponentRegistry> {
  private margin: number;
  private enabled: boolean;

  /**
   * Returns the viewport bounding box based on Camera2D or screen configuration.
   */
  public static getViewport(world: World<any>): { minX: number; minY: number; maxX: number; maxY: number } {
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig");
    const screenWidth = screen?.width ?? 800;
    const screenHeight = screen?.height ?? 600;

    const cameras = world.query("Camera2D");
    let viewX = 0;
    let viewY = 0;
    let zoom = 1;
    for (const camEntity of cameras) {
      const cam = world.getComponent(camEntity, "Camera2D");
      if (cam?.isMain) {
        viewX = cam.x;
        viewY = cam.y;
        zoom = cam.zoom ?? 1;
        break;
      }
    }

    return {
      minX: viewX,
      minY: viewY,
      maxX: viewX + screenWidth / zoom,
      maxY: viewY + screenHeight / zoom,
    };
  }

  /**
   * Checks if an entity is within the active viewport bounds plus a margin.
   */
  public static isEntityInViewport(world: World<any>, entity: Entity, margin: number = 100): boolean {
    const viewport = this.getViewport(world);
    const minX = viewport.minX - margin;
    const minY = viewport.minY - margin;
    const maxX = viewport.maxX + margin;
    const maxY = viewport.maxY + margin;

    // Exclude check for players/important tags to ensure they are never culled
    const isLocalPlayer = world.hasComponent(entity, "LocalPlayer") || world.hasComponent(entity, "Player");

    const tagComponent = world.getComponent(entity, "Tag");
    const isTagPlayer = tagComponent && (
      (tagComponent.tags as string[] | undefined)?.includes("LocalPlayer") ||
      (tagComponent.tags as string[] | undefined)?.includes("Player")
    );

    if (isLocalPlayer || isTagPlayer) {
      return true;
    }

    const trans = world.getComponent(entity, "Transform");
    if (!trans) return false;
    const x = trans.worldX ?? trans.x;
    const y = trans.worldY ?? trans.y;

    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }

  /**
   * Filters a list of entity IDs, returning only those that reside within the active viewport bounds plus a margin.
   */
  public static filterInViewport(world: World<any>, entities: Entity[], margin: number = 100): Entity[] {
    return entities.filter((entity) => this.isEntityInViewport(world, entity, margin));
  }

  /**
   * Creates a new SpatialCullingSystem.
   *
   * @param config - Configuration options for the culling system.
   */
  constructor(config: { margin?: number; enabled?: boolean } = {}) {
    super();
    this.margin = config.margin ?? 100;
    this.enabled = config.enabled ?? true;
  }

  /**
   * Sets the buffer margin in pixels.
   */
  public setMargin(margin: number): void {
    this.margin = margin;
  }

  /**
   * Enables or disables spatial culling.
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Returns whether the culling system is currently enabled.
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    // 1. If disabled or during rollback resimulation, bypass culling to guarantee absolute determinism!
    if (!this.enabled || world.isReSimulating) {
      world.deleteResource("SpatialCullingCandidates");
      return;
    }

    // 2. Retrieve screen config/dimensions
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig");
    const screenWidth = screen?.width ?? 800;
    const screenHeight = screen?.height ?? 600;

    // 3. Retrieve viewport coordinate from main camera if available
    const cameras = world.query("Camera2D");
    let viewX = 0;
    let viewY = 0;
    for (const camEntity of cameras) {
      const cam = world.getComponent(camEntity, "Camera2D");
      if (cam?.isMain) {
        viewX = cam.x;
        viewY = cam.y;
        break;
      }
    }

    // 4. Compute active culling bounding box
    const minX = viewX - this.margin;
    const minY = viewY - this.margin;
    const maxX = viewX + screenWidth + this.margin;
    const maxY = viewY + screenHeight + this.margin;

    // 5. Filter entities
    const allEntities = world.query("Transform");
    const candidates: Entity[] = [];

    for (const entity of allEntities) {
      // Exclude check for players/important tags to ensure they are never culled
      const isLocalPlayer = world.hasComponent(entity, "LocalPlayer") || world.hasComponent(entity, "Player");

      const tagComponent = world.getComponent(entity, "Tag");
      const isTagPlayer = tagComponent && (
        (tagComponent.tags as string[] | undefined)?.includes("LocalPlayer") ||
        (tagComponent.tags as string[] | undefined)?.includes("Player")
      );

      if (isLocalPlayer || isTagPlayer) {
        candidates.push(entity);
        continue;
      }

      const trans = world.getComponent(entity, "Transform")!;
      const x = trans.worldX ?? trans.x;
      const y = trans.worldY ?? trans.y;

      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        candidates.push(entity);
      }
    }

    // 6. Save the list of active simulation candidate entities
    // SpatialCullingSystem verified and consolidated
    world.setResource("SpatialCullingCandidates", candidates);
  }
}
