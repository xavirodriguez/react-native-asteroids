/**
 * Supported geometric shape types for collision and rendering.
 *
 * @public
 */
export type ShapeType = "circle" | "aabb" | "capsule" | "polygon";

/**
 * Circle geometry defined by a radius.
 *
 * @public
 */
export interface CircleShape {
  type: "circle";
  /** [px] Radius of the circle. */
  radius: number;
}

/**
 * Axis-Aligned Bounding Box (AABB) geometry.
 *
 * @remarks
 * Uses half-extents (distance from center to edge) for calculation efficiency.
 *
 * @public
 */
export interface AABBShape {
  type: "aabb";
  /** [px] Half of the total width. */
  halfWidth: number;
  /** [px] Half of the total height. */
  halfHeight: number;
}

/**
 * Capsule geometry (a rectangle with semi-circle caps).
 *
 * @public
 */
export interface CapsuleShape {
  type: "capsule";
  /** [px] Radius of the semi-circle caps. */
  radius: number;
  /** [px] Half of the total height of the straight section. */
  halfHeight: number;
  /**
   * Orientation in radians.
   * @remarks
   * Standard: 0 = vertical (Y-axis aligned), PI/2 = horizontal (X-axis aligned).
   */
  orientation: number;
}

/**
 * Convex polygon geometry.
 *
 * @remarks
 * For correct orientation, vertices are expected to be defined in
 * counter-clockwise (CCW) order and should be
 * convex for the SAT (Separating Axis Theorem) collision resolver to work correctly.
 *
 * @public
 */
export interface PolygonShape {
  type: "polygon";
  /**
   * Vertices in local space, centered at (0,0).
   * @remarks
   * Must be in CCW order.
   */
  vertices: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  /**
   * Pre-calculated edge normals used for SAT collision detection.
   * @remarks
   * Inferred from vertices during creation.
   */
  normals: ReadonlyArray<{ readonly x: number; readonly y: number }>;
}

/**
 * Union of all supported geometric shapes.
 *
 * @public
 */
export type Shape = CircleShape | AABBShape | CapsuleShape | PolygonShape;
