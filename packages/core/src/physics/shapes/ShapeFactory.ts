import { CircleShape, AABBShape } from "./ShapeTypes";

export class ShapeFactory {
  static circle(radius: number): CircleShape {
    return { type: "circle", radius };
  }
  static aabb(width: number, height: number): AABBShape {
    return { type: "aabb", width, height };
  }
}
