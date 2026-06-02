import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { TilemapComponent, Camera2DComponent } from "../ecs/CoreComponents";

/**
 * System that calculates which part of the tilemap is visible.
 * It doesn't render anything directly, but updates the TilemapComponent's visible range
 * based on the active camera.
 *
 * API status: Public
 */
export class TilemapRenderSystem extends System {
  public update(world: World, _deltaTime: number): void {
    if (world.isReSimulating) return;

    const cameraEntity = world.query("Camera2D")[0];
    if (cameraEntity === undefined) return;

    const camera = world.getComponent<Camera2DComponent>(cameraEntity, "Camera2D")!;
    const tilemaps = world.query("Tilemap");

    for (let i = 0; i < tilemaps.length; i++) {
      const entity = tilemaps[i];

      world.mutateComponent<TilemapComponent>(entity, "Tilemap", (tilemap) => {
        const data = tilemap.data;

        // Simple culling logic: define a visible range in tiles.
        // For a real app, this would use the viewport dimensions.
        const buffer = 2;
        const viewWidthTiles = 20;
        const viewHeightTiles = 15;

        const centerX = Math.floor(camera.x / data.tileSize);
        const centerY = Math.floor(camera.y / data.tileSize);

        tilemap.visibleRange = {
            minX: Math.max(0, centerX - Math.floor(viewWidthTiles / 2) - buffer),
            minY: Math.max(0, centerY - Math.floor(viewHeightTiles / 2) - buffer),
            maxX: Math.min(data.width - 1, centerX + Math.ceil(viewWidthTiles / 2) + buffer),
            maxY: Math.min(data.height - 1, centerY + Math.ceil(viewHeightTiles / 2) + buffer),
        };
      });
    }
  }
}
