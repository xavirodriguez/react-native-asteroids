import { Component } from "../core/Component";
import { Entity } from "../core/Entity";
import { Shape } from "./shapes/ShapeTypes";
import { CollisionManifold } from "./collision/CollisionTypes";

/**
 * Componente de colisión moderno.
 */
export interface Collider2DComponent extends Component {
  type: "Collider2D";
  shape: Shape;
  offsetX: number;
  offsetY: number;
  layer: number;
  mask: number;
  isTrigger: boolean;
  enabled: boolean;
}

/**
 * Component that tracks collision events.
 */
export interface CollisionEvent {
  otherEntity: Entity;
  manifold?: CollisionManifold;
  normalX?: number;
  normalY?: number;
  depth?: number;
  contactPoints?: Array<{ x: number; y: number }>;
}

export interface CollisionEventsComponent extends Component {
  type: "CollisionEvents";
  collisions: CollisionEvent[];
  activeTriggers: Entity[];
  triggersEntered: Entity[];
  triggersExited: Entity[];
}

/**
 * Habilita la detección de colisiones continuas (CCD).
 */
export interface ContinuousColliderComponent extends Component {
  type: "ContinuousCollider";
  enabled: boolean;
  velocityThreshold?: number;
}

/**
 * Componente de cuerpo rígido.
 */
export interface PhysicsBody2DComponent extends Component {
  type: "PhysicsBody2D";
  [key: string]: unknown;
  bodyType: "static" | "dynamic" | "kinematic";
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  forceX: number;
  forceY: number;
  torque: number;
  mass: number;
  readonly inverseMass: number;
  inertia: number;
  readonly inverseInertia: number;
  restitution: number;
  staticFriction: number;
  dynamicFriction: number;
  gravityScale: number;
  fixedRotation: boolean;
}
