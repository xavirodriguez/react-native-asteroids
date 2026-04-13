import { InputController } from "./InputController";
export declare class TouchController<TInputState extends Record<string, boolean>> extends InputController<TInputState> {
    private snapshot;
    private isHolding;
    private holdThreshold;
    private swipeThreshold;
    /**
     * No specific DOM setup needed for this controller.
     */
    setup(): void;
    /**
     * No specific cleanup needed for this controller.
     */
    cleanup(): void;
    /**
     * Handles touch start event.
     */
    onTouchStart(x: number, y: number): void;
    /**
     * Handles touch move event.
     */
    onTouchMove(x: number, y: number): void;
    /**
     * Handles touch end event.
     */
    onTouchEnd(x: number, y: number): void;
    private emitGesture;
}
