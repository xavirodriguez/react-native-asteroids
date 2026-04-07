import { System } from "../core/System";
import { World } from "../core/World";
import { TilemapComponent, Camera2DComponent } from "../types/EngineTypes";

/**
 * System that renders tilemaps with view culling based on the active camera.
 */
export class TilemapRenderSystem extends System {
  public update(world: World, _deltaTime: number): void {
    const tilemaps = world.query("Tilemap");
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    const viewport = { width: 800, height: 600 };

    tilemaps.forEach((entity) => {
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
      (tilemap as any)._visibleRange = { startX, startY, endX, endY };
    });
  }
}

/**
 * Factory function to create a TilemapComponent with the isSolid helper.
 */
export function createTilemapComponent(data: any): TilemapComponent {
  return {
    type: "Tilemap",
    data,
    isSolid: function(tileX: number, tileY: number): boolean {
      if (tileX < 0 || tileX >= this.data.width || tileY < 0 || tileY >= this.data.height) {
        return true; // Treat out-of-bounds as solid
      }

      for (const layer of this.data.layers) {
        if (!layer.collidable) continue;
        const index = tileY * this.data.width + tileX;
        const tileId = layer.tiles[index];
        if (tileId !== 0) {
          const tileset = this.data.tilesets.find((ts: any) => ts.id === tileId);
          if (tileset && tileset.solid) return true;
          if (tileId > 0) return true; // Default to solid if ID > 0 and no specific config
        }
      }
      return false;
    }
  };
}
