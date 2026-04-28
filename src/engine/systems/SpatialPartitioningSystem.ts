import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent, SpatialNodeComponent, Camera2DComponent, Collider2DComponent } from "../core/CoreComponents";
import { SpatialGrid } from "../physics/utils/SpatialGrid";
import { BroadPhase } from "../physics/collision/BroadPhase";

/**
 * System that synchronizes entities with the global SpatialGrid.
 *
 * @responsibility Update SpatialNodeComponent and SpatialGrid occupancy based on Transform.
 * @responsibility Update the 'active' status of SpatialNodes based on camera proximity.
 */
export class SpatialPartitioningSystem extends System {
  public update(world: World, _deltaTime: number): void {
    const grid = world.getResource<SpatialGrid>("SpatialGrid");
    if (!grid) return;

    // Incremental updates: instead of grid.clear(), we rebuild based on current frame data.
    // For now, grid.clear() is O(ActiveCells) but if we want truly incremental,
    // we need to track entity positions. Let's keep it simple but ensure it's called.
    grid.clear();

    const entities = world.query("Transform", "SpatialNode");

    // 2. Identify active area (Camera + padding)
    const cameras = world.query("Camera2D");
    let mainCam: Camera2DComponent | null = null;
    for (const camEntity of cameras) {
        const cam = world.getComponent<Camera2DComponent>(camEntity, "Camera2D");
        if (cam?.isMain) {
            mainCam = cam;
            break;
        }
    }

    // Default viewport if no camera (e.g. 800x600 centered at 0,0)
    const viewX = mainCam?.x ?? -400;
    const viewY = mainCam?.y ?? -300;
    const viewW = 800 / (mainCam?.zoom ?? 1);
    const viewH = 600 / (mainCam?.zoom ?? 1);
    const padding = grid.cellSize * 2;

    const activeAABB = {
        minX: viewX - padding,
        minY: viewY - padding,
        maxX: viewX + viewW + padding,
        maxY: viewY + viewH + padding
    };

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const transform = world.getComponent<TransformComponent>(entity, "Transform")!;
      const node = world.getComponent<SpatialNodeComponent>(entity, "SpatialNode")!;
      const collider = world.getComponent<Collider2DComponent>(entity, "Collider2D");

      let aabb;
      if (collider) {
          aabb = BroadPhase.getShapeBounds(transform, collider);
      } else {
          // Assume a default size if no collider (used for culling non-collidable entities like particles/trails)
          const size = 32;
          aabb = {
              minX: (transform.worldX ?? transform.x) - size/2,
              minY: (transform.worldY ?? transform.y) - size/2,
              maxX: (transform.worldX ?? transform.x) + size/2,
              maxY: (transform.worldY ?? transform.y) + size/2
          };
      }

      // Update grid
      grid.insert(entity, aabb);

      // Update activation status (Culling)
      const isCurrentlyActive = !(aabb.maxX < activeAABB.minX || aabb.minX > activeAABB.maxX ||
                                  aabb.maxY < activeAABB.minY || aabb.minY > activeAABB.maxY);

      if (node.active !== isCurrentlyActive) {
          world.mutateComponent(entity, "SpatialNode", n => {
              n.active = isCurrentlyActive;
          });
      }

      // Update last known cells
      node.lastCellKeys = grid.getIntersectingCells(aabb);
    }
  }
}
