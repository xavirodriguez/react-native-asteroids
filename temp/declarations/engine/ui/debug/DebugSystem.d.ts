import { System } from "../../core/System";
import { World } from "../../core/World";
export declare class DebugSystem extends System {
    private fps;
    private frameCount;
    private lastTime;
    update(world: World, deltaTime: number): void;
    renderDebug(ctx: CanvasRenderingContext2D, world: World): void;
}
