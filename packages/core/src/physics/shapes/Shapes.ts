export enum ShapeType {
  Circle,
  Box,
  Polygon
}

export interface BaseShape {
  type: ShapeType;
}

export interface CircleShape extends BaseShape {
  type: ShapeType.Circle;
  radius: number;
}

export interface BoxShape extends BaseShape {
  type: ShapeType.Box;
  width: number;
  height: number;
}

export type Shape = CircleShape | BoxShape;
