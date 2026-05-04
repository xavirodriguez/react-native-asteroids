import { Entity } from "../../core/Entity";

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
   * Represents the minimum distance required to separate the overlapping shapes.
   */
  depth: number;
  /**
   * [px] Points where the two shapes are in contact.
   * @remarks
   * Inferred: typically one or two points in 2D manifold generation.
   */
  contactPoints: Array<{ x: number; y: number }>;
  /**
   * @deprecated Use context-provided entities in systems or event components.
   */
  entityA?: Entity;
  /**
   * @deprecated Use context-provided entities in systems or event components.
   */
  entityB?: Entity;
}
