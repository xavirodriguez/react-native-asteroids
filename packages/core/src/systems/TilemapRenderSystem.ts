import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { TilemapComponent, Camera2DComponent, CoreComponentRegistry } from "../ecs/CoreComponents";

export class TilemapRenderSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const cameras = world.query("Camera2D");
    let mainCam: import("../index").DeepReadonly<Camera2DComponent> | null = null;
    for (const camEntity of cameras) {
        const cam = world.getComponent(camEntity, "Camera2D");
        if (cam?.isMain) {
            mainCam = cam;
            break;
        }
    }

    const tilemaps = world.query("Tilemap");
    for (const entity of tilemaps) {
        const tilemap = world.getComponent(entity, "Tilemap")!;
        
        if (mainCam) {
            const viewport = {
                minX: mainCam.x,
                minY: mainCam.y,
                maxX: mainCam.x + 800, // Should use screen config
                maxY: mainCam.y + 600
            };

            world.mutateComponent(entity, "Tilemap", t => {
                t.visibleRange = {
                    minX: Math.floor(viewport.minX / tilemap.data.tileSize),
                    minY: Math.floor(viewport.minY / tilemap.data.tileSize),
                    maxX: Math.ceil(viewport.maxX / tilemap.data.tileSize),
                    maxY: Math.ceil(viewport.maxY / tilemap.data.tileSize)
                };
            });
        }
    }
  }
}
