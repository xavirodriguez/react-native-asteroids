import { InputStateComponent, InputAction, TilemapComponent } from "../core/CoreComponents";
/**
 * Utility functions for interacting with components as pure data.
 */
export declare const InputUtils: {
    /**
     * Checks if a semantic action is currently pressed.
     */
    isPressed(inputState: InputStateComponent, action: InputAction): boolean;
    /**
     * Gets the value of a specific axis.
     */
    getAxis(inputState: InputStateComponent, axis: string): number;
};
export declare const TilemapUtils: {
    /**
     * Checks if a tile at the given coordinates is solid.
     */
    isSolid(tilemap: TilemapComponent, tileX: number, tileY: number): boolean;
};
