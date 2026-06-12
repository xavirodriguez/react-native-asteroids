export type ShapeType = "circle" | "aabb" | "polygon";

export interface Shape {
  type: ShapeType;
}

export interface CircleShape extends Shape {
  type: "circle";
  radius: number;
}

export interface AABBShape extends Shape {
  type: "aabb";
  width: number;
  height: number;
}
