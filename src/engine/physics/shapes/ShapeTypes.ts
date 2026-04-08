export type ShapeType = "circle" | "aabb" | "capsule" | "polygon";

export interface CircleShape {
  type: "circle";
  radius: number;
}

export interface AABBShape {
  type: "aabb";
  halfWidth: number;
  halfHeight: number;
}

export interface CapsuleShape {
  type: "capsule";
  radius: number;
  halfHeight: number;
  /** Orientation: 0 = vertical (0), PI/2 = horizontal */
  orientation: number;
}

export interface PolygonShape {
  type: "polygon";
  /** Vertices in local space, CCW order, centered at (0,0) */
  vertices: Array<{ x: number; y: number }>;
  /** Pre-calculated normals for each edge (for SAT) */
  normals: Array<{ x: number; y: number }>;
}

export type Shape = CircleShape | AABBShape | CapsuleShape | PolygonShape;
