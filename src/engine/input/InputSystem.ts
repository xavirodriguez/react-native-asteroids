import { TouchPoint, GestureEvent, TouchPhase } from "./InputTypes";

/**
 * Abstraction layer to manage touch inputs and gesture detection.
 *
 * @deprecated Use UnifiedInputSystem instead for semantic action-based input.
 * Converts raw React Native touches into consumable gestures for game logic.
 */
export class InputSystem {
  private activeTouches = new Map<number, TouchPoint>();
  private startPositions = new Map<number, { x: number, y: number, timestamp: number }>();
  private gestureBuffer: GestureEvent[] = [];
  private gesturePool: GestureEvent[] = [];
  private poolIndex = 0;

  // Thresholds for gesture detection
  private readonly TAP_MAX_DURATION = 200; // ms
  private readonly TAP_MAX_DISTANCE = 10; // px
  private readonly SWIPE_MIN_VELOCITY = 0.5; // px/ms
  private readonly HOLD_MIN_DURATION = 500; // ms

  /**
   * Called from React Native component to update touch states.
   */
  public onTouchEvent(points: TouchPoint[]): void {
    for (const point of points) {
      if (point.phase === 'began') {
        this.activeTouches.set(point.id, { ...point });
        this.startPositions.set(point.id, { x: point.x, y: point.y, timestamp: point.timestamp });
      } else if (point.phase === 'moved') {
        this.activeTouches.set(point.id, { ...point });
      } else if (point.phase === 'ended' || point.phase === 'cancelled') {
        this.detectGestures(point);
        this.activeTouches.delete(point.id);
        this.startPositions.delete(point.id);
      }
    }
  }

  /**
   * Returns whether a touch ID is currently pressed.
   */
  public isPressed(touchId?: number): boolean {
    if (touchId === undefined) return this.activeTouches.size > 0;
    return this.activeTouches.has(touchId);
  }

  /**
   * Gets current position of a touch.
   */
  public getPosition(touchId?: number): { x: number, y: number } | null {
    if (touchId === undefined) {
      const first = Array.from(this.activeTouches.values())[0];
      return first ? { x: first.x, y: first.y } : null;
    }
    const touch = this.activeTouches.get(touchId);
    return touch ? { x: touch.x, y: touch.y } : null;
  }

  /**
   * Consumes and empties the gesture buffer.
   */
  public consumeGestures(): GestureEvent[] {
    const result = [...this.gestureBuffer];
    this.gestureBuffer.length = 0;
    return result;
  }

  /**
   * Cleans up input states at the end of the frame.
   */
  public flush(): void {
    this.poolIndex = 0;
  }

  private detectGestures(endPoint: TouchPoint): void {
    const start = this.startPositions.get(endPoint.id);
    if (!start) return;

    const duration = endPoint.timestamp - start.timestamp;
    const dx = endPoint.x - start.x;
    const dy = endPoint.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Tap
    if (duration < this.TAP_MAX_DURATION && distance < this.TAP_MAX_DISTANCE) {
      this.emitGesture({
        type: 'tap',
        position: { x: endPoint.x, y: endPoint.y }
      });
      return;
    }

    // Swipe
    const velocity = distance / duration;
    if (velocity > this.SWIPE_MIN_VELOCITY) {
      this.emitGesture({
        type: 'swipe',
        position: { x: start.x, y: start.y },
        direction: { x: dx / distance, y: dy / distance }
      });
      return;
    }

    // Hold
    if (duration >= this.HOLD_MIN_DURATION && distance < this.TAP_MAX_DISTANCE) {
      this.emitGesture({
        type: 'hold',
        position: { x: start.x, y: start.y },
        duration
      });
    }
  }

  private emitGesture(gesture: Omit<GestureEvent, 'scale'>): void {
    const pooled = this.acquireGesture();

    // Clear stale properties from prior usage before assign
    pooled.direction = undefined;
    pooled.duration = undefined;
    pooled.scale = undefined;

    Object.assign(pooled, gesture);
    this.gestureBuffer.push(pooled);
  }

  private acquireGesture(): GestureEvent {
    if (this.poolIndex >= this.gesturePool.length) {
      this.gesturePool.push({ type: 'tap', position: { x: 0, y: 0 } });
    }
    return this.gesturePool[this.poolIndex++];
  }
}
