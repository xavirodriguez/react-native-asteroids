import { Entity } from "../../core/Entity";

export interface RaycastHit {
  entity: Entity;
  pointX: number;
  pointY: number;
  normalX: number;
  normalY: number;
  distance: number;
  fraction: number;
}

export interface Ray {
  originX: number;
  originY: number;
  directionX: number;
  directionY: number;
  maxDistance: number;
}
