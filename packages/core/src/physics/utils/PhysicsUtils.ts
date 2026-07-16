/**
 * Collection of generic physics and collision utility functions.
 * @public
 */
export class PhysicsUtils {
  /**
   * Checks if two circles are overlapping.
   */
  public static circleOverlap(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const distanceSq = dx * dx + dy * dy;
    const radiusSum = r1 + r2;
    return distanceSq <= radiusSum * radiusSum;
  }

  /**
   * Clamps a value between a minimum and maximum.
   */
  public static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Linearly interpolates between two values.
   */
  public static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}
