/**
 * @packageDocumentation
 * UI Pointer Input System.
 * Detects interactions (hover, click, press) between the pointer and interactive UI elements.
 */

import { System } from "../core/System";
import { World } from "../core/World";
import {
  UIElementComponent,
  UIButtonStateComponent
} from "./UITypes";

/**
 * System that processes pointer interaction (mouse/touch) with UI elements.
 *
 * @remarks
 * This system should be updated every frame before the game logic that reacts to UI events.
 * It translates raw screen coordinates and pointer state into higher-level UI events
 * like `hovered`, `pressed`, and `clicked`.
 *
 * @responsibility Update the state of {@link UIButtonStateComponent} based on pointer position and status.
 * @responsibility Track "Just Pressed" and "Just Released" transitions for reliable click detection.
 *
 * @example
 * ```ts
 * // In the platform event handler:
 * uiInputSystem.setPointerState(mouseX, mouseY, isMouseDown);
 * ```
 */
export class UIInputSystem extends System {
  /** Current X coordinate of the pointer in screen pixels. */
  private pointerX: number = 0;
  /** Current Y coordinate of the pointer in screen pixels. */
  private pointerY: number = 0;
  /** Whether the pointer is currently held down. */
  private pointerDown: boolean = false;
  /** Flag set to true on the frame the pointer was first pressed. */
  private pointerJustPressed: boolean = false;
  /** Flag set to true on the frame the pointer was released. */
  private pointerJustReleased: boolean = false;

  /**
   * Sets the external pointer state to be processed in the next update.
   *
   * @param x - X coordinate in screen pixels.
   * @param y - Y coordinate in screen pixels.
   * @param down - Current button/touch state.
   *
   * @remarks
   * Correctly identifies "just pressed" and "just released" flags by comparing
   * against the previous frame state.
   */
  public setPointerState(x: number, y: number, down: boolean): void {
    const wasDown = this.pointerDown;
    this.pointerX = x;
    this.pointerY = y;
    this.pointerDown = down;

    if (!wasDown && down) {
        this.pointerJustPressed = true;
    } else if (wasDown && !down) {
        this.pointerJustReleased = true;
    }
  }

  /**
   * Updates all interactive UI elements based on the current pointer state.
   *
   * @param world - The ECS world.
   * @param _deltaTime - Elapsed time (unused).
   *
   * @remarks
   * For each entity with `UIElement` and `UIButtonState`:
   * 1. Checks if it's visible and interactive.
   * 2. Performs a point-in-rect test using `computed` coordinates.
   * 3. Updates the `state` property (idle, hovered, pressed).
   * 4. Sets the `clicked` flag if a press-and-release occurred within the element.
   *
   * @mutates {@link UIButtonStateComponent} - state, clicked.
   */
  public update(world: World, _deltaTime: number): void {
    const buttons = world.query("UIElement", "UIButtonState");

    for (const entity of buttons) {
        const element = world.getComponent<UIElementComponent>(entity, "UIElement")!;
        const btnState = world.getComponent<UIButtonStateComponent>(entity, "UIButtonState")!;

        if (!element.visible || !element.interactive || btnState.state === "disabled") {
            btnState.clicked = false;
            continue;
        }

        // Reset click flag at start of update
        btnState.clicked = false;

        const isInside = this.isPointInside(
            this.pointerX,
            this.pointerY,
            element.computedX,
            element.computedY,
            element.computedWidth,
            element.computedHeight
        );

        if (isInside) {
            if (this.pointerDown) {
                btnState.state = "pressed";
            } else {
                // Click is registered only if the pointer was released while over the same element
                if (btnState.state === "pressed" && this.pointerJustReleased) {
                    btnState.clicked = true;
                }
                btnState.state = "hovered";
            }
        } else {
            btnState.state = "idle";
        }
    }

    // Reset transition flags for next update
    this.pointerJustPressed = false;
    this.pointerJustReleased = false;
  }

  /**
   * Internal point-in-rectangle utility.
   */
  private isPointInside(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
    return px >= x && px <= x + w && py >= y && py <= y + h;
  }
}
