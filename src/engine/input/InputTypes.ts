/**
 * Standard phases for a touch interaction.
 *
 * @public
 */
export type TouchPhase = 'began' | 'moved' | 'ended' | 'cancelled';

/**
 * Low-level touch point data.
 *
 * @public
 */
export interface TouchPoint {
  /** Unique touch identifier. */
  id: number;
  /** [px] Viewport X coordinate. */
  x: number;
  /** [px] Viewport Y coordinate. */
  y: number;
  /** Current interaction phase. */
  phase: TouchPhase;
  /** [ms] Timestamp of the event. */
  timestamp: number;
}

/**
 * Semantic touch interaction types.
 *
 * @public
 */
export type GestureType = 'tap' | 'swipe' | 'pinch' | 'hold';

/**
 * High-level gesture event details.
 *
 * @public
 */
export interface GestureEvent {
  type: GestureType;
  /** [px] Viewport position where the gesture occurred. */
  position: { x: number; y: number };
  /** Normalized direction vector (for swipes). */
  direction?: { x: number; y: number };
  /** Scale factor (for pinch-to-zoom). */
  scale?: number;
  /** [ms] Duration of the interaction (for hold/long-press). */
  duration?: number;
}
