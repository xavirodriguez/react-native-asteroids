import { InputController } from "./InputController";

/**
 * Controller implementation for touch-based inputs, primarily for mobile.
 *
 * @deprecated Use UnifiedInputSystem instead for semantic action-based input.
 * Detects complex gestures: Tap, Swipe, Hold.
 *
 * Principle 1: Immutable State for Snapshots
 * The start position and start time of a touch event are stored as readonly properties
 * for the duration of the gesture.
 */
interface TouchSnapshot {
  readonly startX: number;
  readonly startY: number;
  readonly startTime: number;
}

export class TouchController<TInputState extends Record<string, boolean>>
  extends InputController<TInputState> {

  private snapshot: TouchSnapshot | null = null;
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
    this.snapshot = {
      startX: x,
      startY: y,
      startTime: Date.now()
    };
    this.isHolding = false;
  }

  /**
   * Handles touch move event.
   */
  public onTouchMove(x: number, y: number): void {
    if (!this.snapshot) return;

    if (!this.isHolding && Date.now() - this.snapshot.startTime > this.holdThreshold) {
      const dx = x - this.snapshot.startX;
      const dy = y - this.snapshot.startY;
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
    if (!this.snapshot) return;

    const duration = Date.now() - this.snapshot.startTime;
    const dx = x - this.snapshot.startX;
    const dy = y - this.snapshot.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (this.isHolding) {
      this.setInputs({ hold: false } as unknown as Partial<TInputState>);
      this.isHolding = false;
      this.snapshot = null;
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

    this.snapshot = null;
  }

  private emitGesture(gesture: string): void {
    // Briefly activate gesture input
    this.setInputs({ [gesture]: true } as unknown as Partial<TInputState>);
    setTimeout(() => {
      this.setInputs({ [gesture]: false } as unknown as Partial<TInputState>);
    }, 50);
  }
}
