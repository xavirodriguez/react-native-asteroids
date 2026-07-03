"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TilemapRenderSystem = void 0;
const System_1 = require("../ecs/System");
class TilemapRenderSystem extends System_1.System {
    update(world, _deltaTime) {
        const cameras = world.query("Camera2D");
        let mainCam = null;
        for (const camEntity of cameras) {
            const cam = world.getComponent(camEntity, "Camera2D");
            if (cam?.isMain) {
                mainCam = cam;
                break;
            }
        }
        const tilemaps = world.query("Tilemap");
        for (const entity of tilemaps) {
            const tilemap = world.getComponent(entity, "Tilemap");
            if (mainCam) {
                const viewport = {
                    minX: mainCam.x,
                    minY: mainCam.y,
                    maxX: mainCam.x + 800, // Should use screen config
                    maxY: mainCam.y + 600
                };
                world.mutateComponent(entity, "Tilemap", t => {
                    t.visibleRange = {
                        minX: Math.floor(viewport.minX / tilemap.tileSize),
                        minY: Math.floor(viewport.minY / tilemap.tileSize),
                        maxX: Math.ceil(viewport.maxX / tilemap.tileSize),
                        maxY: Math.ceil(viewport.maxY / tilemap.tileSize)
                    };
                });
            }
        }
    }
}
exports.TilemapRenderSystem = TilemapRenderSystem;
