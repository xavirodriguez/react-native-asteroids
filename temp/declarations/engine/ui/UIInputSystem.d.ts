import { System } from "../core/System";
import { World } from "../core/World";
export declare class UIInputSystem extends System {
    private pointerX;
    private pointerY;
    private pointerDown;
    private pointerJustPressed;
    private pointerJustReleased;
    setPointerState(x: number, y: number, down: boolean): void;
    update(world: World, deltaTime: number): void;
    private isPointInside;
}
