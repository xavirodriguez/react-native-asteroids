/**
 * System responsible for calculating the visible portion of tilemaps.
 *
 * This system performs view culling (frustum culling) for large tilemaps,
 * identifying which range of tiles should be processed by the renderer
 * based on the current camera position and zoom.
 *
 * @packageDocumentation
 */

import { System } from "../core/System";
import { World } from "../core/World";
import { TilemapComponent, Camera2DComponent } from "../types/EngineTypes";

/**
 * Manages the visibility and culling of tile-based maps.
 *
 * @public
 */
export class TilemapRenderSystem extends System {
  /**
   * Updates the visible range for all tilemaps in the world.
   */
  public update(world: World, _deltaTime: number): void {
    const tilemaps = world.query("Tilemap");
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    const viewport = { width: 800, height: 600 };

    for (let i = 0; i < tilemaps.length; i++) {
      const entity = tilemaps[i];
      const tilemap = world.getComponent<TilemapComponent>(entity, "Tilemap")!;

      // Identify visible tile range
      let startX = 0, startY = 0, endX = tilemap.data.width, endY = tilemap.data.height;

      if (cam) {
        startX = Math.floor(cam.x / tilemap.data.tileSize);
        startY = Math.floor(cam.y / tilemap.data.tileSize);
        endX = Math.ceil((cam.x + viewport.width / cam.zoom) / tilemap.data.tileSize);
        endY = Math.ceil((cam.y + viewport.height / cam.zoom) / tilemap.data.tileSize);

        // Clamp to map bounds
        startX = Math.max(0, startX);
        startY = Math.max(0, startY);
        endX = Math.min(tilemap.data.width, endX);
        endY = Math.min(tilemap.data.height, endY);
      }

      // Store visible range in the component for the renderer to use
      tilemap._visibleRange = { startX, startY, endX, endY };
    }
  }
}

/**
 * Factory function to create a TilemapComponent.
 */
export function createTilemapComponent(data: import("../core/CoreComponents").TilemapData): TilemapComponent {
  return {
    type: "Tilemap",
    data
  } as TilemapComponent;
}
