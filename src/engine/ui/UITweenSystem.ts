/**
 * @packageDocumentation
 * UI Animation System (Tweens).
 * Provides frame-by-frame interpolation for UI properties like opacity and offsets.
 */

import { System } from "../core/System";
import { World } from "../core/World";
import { UIElementComponent } from "./UITypes";

/**
 * Component that defines an interpolated animation for a UI element property.
 *
 * @remarks
 * Tweens allow for smooth visual transitions (e.g., fading in a panel or sliding a button).
 * They are automatically processed by the {@link UITweenSystem} and removed upon completion
 * unless the `loop` flag is set.
 *
 * @responsibility Store the state and configuration of a visual transition in the UI.
 */
export interface UITweenComponent {
    type: "UITween";
    /** The property of `UIElementComponent` to animate. */
    property: "opacity" | "offsetX" | "offsetY";
    /** Initial value at the start of the tween. */
    startValue: number;
    /** Target value at the end of the tween. */
    endValue: number;
    /** Total duration of the animation in milliseconds. */
    duration: number;
    /** Accumulated elapsed time in milliseconds. */
    currentTime: number;
    /** Easing function for the interpolation. @defaultValue "linear" */
    easing: "linear" | "easeIn" | "easeOut";
    /**
     * Optional callback executed when the animation finishes.
     * Not called if `loop` is true.
     */
    onComplete?: (world: World, entity: import("../core/Entity").Entity) => void;
    /** If true, resets `currentTime` to zero when it reaches the duration, looping indefinitely. */
    loop?: boolean;
}

/**
 * System that processes UI animations frame-by-frame.
 *
 * @remarks
 * This system iterates through all entities with both `UIElement` and `UITween`.
 * It calculates the interpolation progress and directly mutates the target
 * property in the {@link UIElementComponent}.
 *
 * @responsibility Update UI properties based on the progress of their active tweens.
 * @queries `UIElement`, `UITween`.
 * @mutates `UIElementComponent`, `UITweenComponent`.
 * @executionOrder Presentation Phase (before rendering, typically after layout if the tween affects offsets).
 *
 * @conceptualRisk [DT_UNIT_MISMATCH] The system assumes `deltaTime` is in milliseconds.
 * If the engine provides seconds, the animation will be extremely slow or imperceptible.
 */
export class UITweenSystem extends System {
    /**
     * Advances the time of all active tweens and updates associated UI components.
     *
     * @param world - The ECS world.
     * @param deltaTime - Elapsed time since the last frame in milliseconds.
     *
     * @sideEffect Modifies `UIElement.opacity/offsetX/offsetY`.
     * @sideEffect Removes the `UITweenComponent` from the entity upon completion (if `loop` is false).
     */
    public update(world: World, deltaTime: number): void {
        const entities = world.query("UIElement", "UITween");

        for (const entity of entities) {
            const tween = world.getComponent<UITweenComponent>(entity, "UITween")!;
            const element = world.getComponent<UIElementComponent>(entity, "UIElement")!;

            tween.currentTime += deltaTime;
            const progress = Math.min(1, tween.currentTime / tween.duration);
            const easedProgress = this.ease(progress, tween.easing);

            const value = tween.startValue + (tween.endValue - tween.startValue) * easedProgress;

            switch (tween.property) {
                case "opacity":
                    element.opacity = value;
                    break;
                case "offsetX":
                    element.offsetX = value;
                    break;
                case "offsetY":
                    element.offsetY = value;
                    break;
            }

            if (progress >= 1) {
                if (tween.loop) {
                    tween.currentTime = 0;
                } else {
                    if (tween.onComplete) tween.onComplete(world, entity);
                    world.removeComponent(entity, "UITween");
                }
            }
        }
    }

    /**
     * Resolves the internal easing function.
     */
    private ease(t: number, type: string): number {
        switch (type) {
            case "easeIn": return t * t;
            case "easeOut": return t * (2 - t);
            case "linear":
            default: return t;
        }
    }
}
