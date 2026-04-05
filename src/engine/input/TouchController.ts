import { InputController } from "./InputController";

/**
 * Controller implementation for touch-based inputs, primarily for mobile.
 * Detects complex gestures: Tap, Swipe, Hold.
 */
interface TouchState {
  readonly startPos: { readonly x: number; readonly y: number };
  readonly startTime: number;
}

export class TouchController<TInputState extends Record<string, boolean>>
  extends InputController<TInputState> {

  private touchState: TouchState | null = null;
  private isHolding: boolean = false;
  private holdThreshold: number = 500; // ms
  private swipeThreshold: number = 30; // pixels

  /**
   * No specific DOM setup needed for this controller.
   */
  setup(): void {
    // No DOM setup needed for touch
  }

  /**
   * No specific cleanup needed for this controller.
   */
  cleanup(): void {
    // No cleanup needed
  }

  /**
   * Handles touch start event.
   */
  public onTouchStart(x: number, y: number): void {
    this.touchState = {
      startPos: { x, y },
      startTime: Date.now(),
    };
    this.isHolding = false;
  }

  /**
   * Handles touch move event.
   */
  public onTouchMove(x: number, y: number): void {
    if (!this.touchState) return;

    if (!this.isHolding && Date.now() - this.touchState.startTime > this.holdThreshold) {
      const dx = x - this.touchState.startPos.x;
      const dy = y - this.touchState.startPos.y;
      if (Math.sqrt(dx * dx + dy * dy) < this.swipeThreshold) {
        this.isHolding = true;
        this.setInputs({ hold: true } as unknown as Partial<TInputState>);
      }
    }
  }

  /**
   * Handles touch end event.
   */
  public onTouchEnd(x: number, y: number): void {
    if (!this.touchState) return;

    const duration = Date.now() - this.touchState.startTime;
    const dx = x - this.touchState.startPos.x;
    const dy = y - this.touchState.startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (this.isHolding) {
      this.setInputs({ hold: false } as unknown as Partial<TInputState>);
      this.isHolding = false;
      return;
    }

    if (distance > this.swipeThreshold) {
      // Detected swipe
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) this.emitGesture("swipeRight");
        else this.emitGesture("swipeLeft");
      } else {
        if (dy > 0) this.emitGesture("swipeDown");
        else this.emitGesture("swipeUp");
      }
    } else if (duration < this.holdThreshold) {
      // Detected tap
      this.emitGesture("tap");
    }
  }

  private emitGesture(gesture: string): void {
    // Briefly activate gesture input
    this.setInputs({ [gesture]: true } as unknown as Partial<TInputState>);
    setTimeout(() => {
      this.setInputs({ [gesture]: false } as unknown as Partial<TInputState>);
    }, 50);
  }
}
