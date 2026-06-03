import { Entity } from "../../core/Entity";

/**
 * Geometric result of a raycast test.
 *
 * @public
 */
export interface RaycastHit {
  /** The entity that was hit by the ray. */
  entity: Entity;
  /** [px] X coordinate of the intersection point. */
  pointX: number;
  /** [px] Y coordinate of the intersection point. */
  pointY: number;
  /** X component of the surface normal at the hit point. */
  normalX: number;
  /** Y component of the surface normal at the hit point. */
  normalY: number;
  /** [px] Distance from the ray origin to the hit point. */
  distance: number;
  /**
   * Normalized distance [0, 1].
   * 0 = origin, 1 = maxDistance.
   */
  fraction: number;
}

/**
 * Mathematical representation of a ray in 2D space.
 *
 * @public
 */
export interface Ray {
  /** [px] Origin X coordinate. */
  originX: number;
  /** [px] Origin Y coordinate. */
  originY: number;
  /** Normalized direction X component. */
  directionX: number;
  /** Normalized direction Y component. */
  directionY: number;
  /** [px] Maximum length of the ray. */
  maxDistance: number;
}
