import { Entity } from "../../ecs/Entity";

/**
 * Generic collision layer and mask types.
 */
export type CollisionLayer = number;
export type CollisionMask = number;

/**
 * Creates a collision layer from a bit position.
 * @param bit - The bit position (0-31).
 * @returns The collision layer bitmask.
 */
export function layer(bit: number): number {
  return 1 << bit;
}

/**
 * Combines multiple collision layers into a single mask.
 * @param layers - The layers to combine.
 * @returns The combined collision mask.
 */
export function maskOf(...layers: number[]): number {
  return layers.reduce((acc, value) => acc | value, 0);
}

/**
 * Information about a collision between two entities.
 */
export interface CollisionManifold {
  colliding: boolean;
  normalX: number;
  normalY: number;
  depth: number;
  contactPoints: Array<{ x: number, y: number }>;
}

/**
 * Axis-Aligned Bounding Box.
 */
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Collision {
  otherEntity: Entity;
  normalX: number;
  normalY: number;
  depth: number;
  contactPoints: Array<{ x: number, y: number }>;
}
