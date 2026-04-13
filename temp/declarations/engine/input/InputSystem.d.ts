import { TouchPoint, GestureEvent } from "./InputTypes";
/**
 * Abstraction layer to manage touch inputs and gesture detection.
 *
 * @deprecated Use UnifiedInputSystem instead for semantic action-based input.
 * Converts raw React Native touches into consumable gestures for game logic.
 */
export declare class InputSystem {
    private activeTouches;
    private startPositions;
    private gestureBuffer;
    private gesturePool;
    private poolIndex;
    private readonly TAP_MAX_DURATION;
    private readonly TAP_MAX_DISTANCE;
    private readonly SWIPE_MIN_VELOCITY;
    private readonly HOLD_MIN_DURATION;
    /**
     * Called from React Native component to update touch states.
     */
    onTouchEvent(points: TouchPoint[]): void;
    /**
     * Returns whether a touch ID is currently pressed.
     */
    isPressed(touchId?: number): boolean;
    /**
     * Gets current position of a touch.
     */
    getPosition(touchId?: number): {
        x: number;
        y: number;
    } | null;
    /**
     * Consumes and empties the gesture buffer.
     */
    consumeGestures(): GestureEvent[];
    /**
     * Cleans up input states at the end of the frame.
     */
    flush(): void;
    private detectGestures;
    private emitGesture;
    private acquireGesture;
    /**
     * Principle 6: Explicit reset before reuse.
     */
    private resetGesture;
}
