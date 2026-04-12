import { System } from "../core/System";
import { World } from "../core/World";
import {
  UIElementComponent,
  UIButtonStateComponent
} from "./UITypes";
import { Entity } from "../core/Entity";

export class UIInputSystem extends System {
  private pointerX: number = 0;
  private pointerY: number = 0;
  private pointerDown: boolean = false;
  private pointerJustPressed: boolean = false;
  private pointerJustReleased: boolean = false;

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

  public update(world: World, _deltaTime: number): void {
    const buttons = world.query("UIElement", "UIButtonState");

    for (const entity of buttons) {
        const element = world.getComponent<UIElementComponent>(entity, "UIElement")!;
        const btnState = world.getComponent<UIButtonStateComponent>(entity, "UIButtonState")!;

        if (!element.visible || !element.interactive || btnState.state === "disabled") {
            btnState.clicked = false;
            continue;
        }

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
                if (btnState.state === "pressed" && this.pointerJustReleased) {
                    btnState.clicked = true;
                }
                btnState.state = "hovered";
            }
        } else {
            btnState.state = "idle";
        }
    }

    this.pointerJustPressed = false;
    this.pointerJustReleased = false;
  }

  private isPointInside(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
    return px >= x && px <= x + w && py >= y && py <= y + h;
  }
}
