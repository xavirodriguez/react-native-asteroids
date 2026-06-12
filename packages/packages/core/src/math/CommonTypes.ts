/**
 * Common math types.
 */

/**
 * Axis-Aligned Bounding Box.
 */
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Common vector representation.
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Screen dimensions configuration.
 */
export interface ScreenConfig {
  width: number;
  height: number;
}
