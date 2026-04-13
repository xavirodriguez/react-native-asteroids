import { System } from "../core/System";
import { World } from "../core/World";
import { TilemapComponent } from "../types/EngineTypes";
/**
 * System that renders tilemaps with view culling based on the active camera.
 */
export declare class TilemapRenderSystem extends System {
    update(world: World, _deltaTime: number): void;
}
/**
 * Factory function to create a TilemapComponent.
 */
export declare function createTilemapComponent(data: any): TilemapComponent;
