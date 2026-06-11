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
 * Global screen/viewport configuration.
 */
export interface ScreenConfig {
  width: number;
  height: number;
}
