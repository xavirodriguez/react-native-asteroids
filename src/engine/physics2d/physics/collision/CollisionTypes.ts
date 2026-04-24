import { Entity } from "../../core/Entity";

/**
 * Represents the geometric data of a collision between two entities.
 */
export interface CollisionManifold {
  /** Whether the two shapes are currently overlapping. */
  colliding: boolean;
  /** Normal vector X component pointing from entity A to entity B. */
  normalX: number;
  /** Normal vector Y component pointing from entity A to entity B. */
  normalY: number;
  /** Penetration depth of the collision. */
  depth: number;
  /** Points where the two shapes are in contact. */
  contactPoints: Array<{ x: number; y: number }>;
  /** @deprecated Reference to entity A. Prefer using system-provided context. */
  entityA?: Entity;
  /** @deprecated Reference to entity B. Prefer using system-provided context. */
  entityB?: Entity;
}
