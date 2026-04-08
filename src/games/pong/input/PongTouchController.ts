import { InputController } from "../../../engine/input/InputController";
import { PongInput, PONG_CONFIG } from "../types";

/**
 * Mobile-friendly touch controller for Pong.
 * Splits the screen vertically to control P1 (left) and P2 (right).
 */
export class PongTouchController extends InputController<PongInput> {
  private activeTouches = new Map<number, { x: number; y: number }>();

  setup(): void {
    if (typeof window === "undefined" || !window.addEventListener) return;

    window.addEventListener("touchstart", this.handleTouchStart);
    window.addEventListener("touchmove", this.handleTouchMove);
    window.addEventListener("touchend", this.handleTouchEnd);
    window.addEventListener("touchcancel", this.handleTouchEnd);
  }

  cleanup(): void {
    if (typeof window === "undefined" || !window.removeEventListener) return;

    window.removeEventListener("touchstart", this.handleTouchStart);
    window.removeEventListener("touchmove", this.handleTouchMove);
    window.removeEventListener("touchend", this.handleTouchEnd);
    window.removeEventListener("touchcancel", this.handleTouchEnd);
  }

  private handleTouchStart = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }
    this.updateInputs();
  };

  private handleTouchMove = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }
    this.updateInputs();
  };

  private handleTouchEnd = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.activeTouches.delete(touch.identifier);
    }
    this.updateInputs();
  };

  private updateInputs(): void {
    const newState: PongInput = { p1Up: false, p1Down: false, p2Up: false, p2Down: false };
    const screenWidth = typeof window !== "undefined" ? window.innerWidth : PONG_CONFIG.WIDTH;
    const screenHeight = typeof window !== "undefined" ? window.innerHeight : PONG_CONFIG.HEIGHT;

    this.activeTouches.forEach(touch => {
      const isLeft = touch.x < screenWidth / 2;
      const isTop = touch.y < screenHeight / 2;

      if (isLeft) {
        if (isTop) newState.p1Up = true;
        else newState.p1Down = true;
      } else {
        if (isTop) newState.p2Up = true;
        else newState.p2Down = true;
      }
    });

    this.setInputs(newState);
  }
}
