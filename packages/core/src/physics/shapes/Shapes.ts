/** @public */
export enum ShapeType {
  Circle,
  Box,
  Polygon
}

/** @public */
export interface BaseShape {
  type: ShapeType;
}

/** @public */
export interface CircleShape extends BaseShape {
  type: ShapeType.Circle;
  radius: number;
}

/** @public */
export interface BoxShape extends BaseShape {
  type: ShapeType.Box;
  width: number;
  height: number;
}

/** @public */
export type Shape = CircleShape | BoxShape;
