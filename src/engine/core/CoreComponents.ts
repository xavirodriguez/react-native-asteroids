import { Component } from "./Component";
import { Entity } from "./Entity";

export { Entity };

/**
 * Components provided by the engine as reusable primitives.
 */

/**
 * @deprecated Use TransformComponent instead
 */
export interface PositionComponent extends Component {
  type: "Position";
  x: number;
  y: number;
}

export interface TransformComponent extends Component {
  type: "Transform";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  parent?: Entity;
  // World space cache (managed by HierarchySystem)
  worldX?: number;
  worldY?: number;
  worldRotation?: number;
  worldScaleX?: number;
  worldScaleY?: number;
}

export interface VelocityComponent extends Component {
  type: "Velocity";
  dx: number;
  dy: number;
}

export interface FrictionComponent extends Component {
  type: "Friction";
  value: number; // 0-1, damping factor
}

export interface BoundaryComponent extends Component {
  type: "Boundary";
  width: number;
  height: number;
  mode: "wrap" | "bounce" | "destroy";
  bounceX?: boolean;
  bounceY?: boolean;
}

export interface TagComponent extends Component {
  type: "Tag";
  tags: string[];
}

/**
 * RigidBodyComponent is used primarily by the Matter.js adapter.
 * For the built-in physics engine, use PhysicsBody2DComponent.
 */
export interface RigidBodyComponent extends Component {
  type: "RigidBody";
  bodyId: number | string;
  isStatic: boolean;
  isSensor: boolean;
  restitution: number;
  friction: number;
  density: number;
  collisionFilter: {
    group: number;
    category: number;
    mask: number;
  };
}

export interface TTLComponent extends Component {
  type: "TTL";
  remaining: number;
  total: number;
}

/**
 * @deprecated Use Collider2DComponent instead for multi-shape support
 */
export interface ColliderComponent extends Component {
  type: "Collider";
  radius: number;
}

export interface RenderComponent extends Component {
  type: "Render";
  shape: string;
  size: number;
  color: string;
  rotation: number;
  angularVelocity?: number;
  vertices?: { x: number; y: number }[];
  /** Custom data for game-specific drawers */
  data?: Record<string, any>;
  /** Trail positions for generic trail rendering */
  trailPositions?: { x: number; y: number }[];
}

/**
 * Tracks the health or durability of an entity.
 */
export interface HealthComponent extends Component {
  type: "Health";
  current: number;
  max: number;
  invulnerableRemaining: number;
}

/**
 * Reclaimable component for entities that should be returned to a pool.
 */
export interface ReclaimableComponent extends Component {
  type: "Reclaimable";
  onReclaim: (world: any, entity: any) => void;
}

// --- NEW PHYSICS & COLLISION COMPONENTS ---

import { Shape } from "../physics/shapes/ShapeTypes";
export * from "../physics/shapes/ShapeTypes";
export * from "../physics/collision/NarrowPhase";

export interface Collider2DComponent extends Component {
  type: "Collider2D";
  shape: Shape;
  offsetX: number;
  offsetY: number;
  isTrigger: boolean;
  layer: number;
  mask: number;
  enabled: boolean;
}

export interface CollisionEventsComponent extends Component {
  type: "CollisionEvents";
  collisions: Array<{
    otherEntity: Entity;
    normalX: number;
    normalY: number;
    depth: number;
    contactPoints: Array<{ x: number; y: number }>;
  }>;
  activeTriggers: Entity[];
  triggersEntered: Entity[];
  triggersExited: Entity[];
}

export interface ContinuousColliderComponent extends Component {
  type: "ContinuousCollider";
  enabled: boolean;
  velocityThreshold: number;
}

export interface PhysicsBody2DComponent extends Component {
  type: "PhysicsBody2D";
  bodyType: "dynamic" | "static" | "kinematic";
  mass: number;
  inverseMass: number;
  inertia: number;
  inverseInertia: number;
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  forceX: number;
  forceY: number;
  torque: number;
  restitution: number;
  staticFriction: number;
  dynamicFriction: number;
  gravityScale: number;
  fixedRotation: boolean;
}
