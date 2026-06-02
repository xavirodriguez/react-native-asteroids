
/**
 * Represents the geometric result of a collision between two shapes.
 *
 * @public
 */
export interface CollisionManifold {
  /**
   * Indicates if the two shapes are currently overlapping.
   */
  colliding: boolean;
  /**
   * X component of the collision normal vector.
   * @remarks
   * The normal points from entity A to entity B.
   */
  normalX: number;
  /**
   * Y component of the collision normal vector.
   * @remarks
   * The normal points from entity A to entity B.
   */
  normalY: number;
  /**
   * [px] Penetration depth of the collision.
   * @remarks
   * Represents the minimum distance intended to separate the overlapping shapes.
   */
  depth: number;
  /**
   * [px] Points where the two shapes are in contact.
   * @remarks
   * For the NarrowPhase implementation, these points are often provided from
   * an internal pool and are intended for immediate consumption during the
   * collision response phase.
   */
  contactPoints: ReadonlyArray<{ readonly x: number; readonly y: number }>;
}
