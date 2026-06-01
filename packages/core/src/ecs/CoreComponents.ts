import { Component, ComponentRegistry } from "./Component";
import { Entity } from "./Entity";
import { EventRegistry, EventBus as GenericEventBus } from "../events/EventBus";
import { AABB } from "../math/CommonTypes";
import { Shape } from "../physics/shapes/ShapeTypes";
import { CollisionManifold } from "../physics/collision/CollisionTypes";

export { Entity, AABB, Shape, CollisionManifold };

/**
 * Common interface for components that participate in a parent-child hierarchy.
 */
export interface IHierarchicalComponent extends Component {
  /** Reference to the parent entity, or null if it's a root element. */
  parentEntity: Entity | null;
  /** Optimization flag to indicate that the hierarchy or local transform needs re-evaluation. */
  dirty?: boolean;
}

/**
 * Standard 2D transform.
 */
export interface TransformComponent extends IHierarchicalComponent {
  type: "Transform";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;

  worldX?: number;
  worldY?: number;
  worldRotation?: number;
  worldScaleX?: number;
  worldScaleY?: number;
}

/**
 * Stores the transform from the previous simulation tick.
 */
export interface PreviousTransformComponent extends Component {
  type: "PreviousTransform";
  x: number;
  y: number;
  rotation: number;

  worldX?: number;
  worldY?: number;
  worldRotation?: number;
}

/**
 * 2D linear velocity.
 */
export interface VelocityComponent extends Component {
  type: "Velocity";
  /** [px/s] velocity X. */
  dx: number;
  /** [px/s] velocity Y. */
  dy: number;
  /** [rad/s] angular velocity. */
  vAngle?: number;
}

/**
 * Basic friction/damping factor.
 */
export interface FrictionComponent extends Component {
  type: "Friction";
  value: number;
}

/**
 * World boundary constraints.
 */
export interface BoundaryComponent extends Component {
  type: "Boundary";
  x?: number;
  y?: number;
  width: number;
  height: number;
  behavior: "wrap" | "bounce" | "destroy";
  bounceX?: boolean;
  bounceY?: boolean;
}

/**
 * Time To Live - automatic entity destruction.
 */
export interface TTLComponent extends Component {
  type: "TTL";
  remaining: number;
  total: number;
}

/**
 * Modern 2D collision component.
 */
export interface Collider2DComponent extends Component {
  type: "Collider2D";
  shape: Shape;
  /** [px] horizontal offset relative to Transform. */
  offsetX: number;
  /** [px] vertical offset relative to Transform. */
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
  contactPoints?: ReadonlyArray<{ readonly x: number; readonly y: number }>;
}

/**
 * Stores collision events occurred in the current tick.
 */
export interface CollisionEventsComponent extends Component {
  type: "CollisionEvents";
  collisions: CollisionEvent[];
  activeTriggers: Entity[];
  triggersEntered: Entity[];
  triggersExited: Entity[];
}

/**
 * Basic physics body properties.
 */
export interface PhysicsBody2DComponent extends Component {
  type: "PhysicsBody2D";
  /**
   * static: immovable, zero mass.
   * dynamic: fully simulated, affected by forces and gravity.
   * kinematic: moved via velocity, not affected by forces.
   */
  bodyType: "static" | "dynamic" | "kinematic";
  /** [px/s] Linear velocity X. */
  velocityX: number;
  /** [px/s] Linear velocity Y. */
  velocityY: number;
  /** [rad/s] Angular velocity. */
  angularVelocity: number;
  /** [px/s^2] Force X. */
  forceX: number;
  /** [px/s^2] Force Y. */
  forceY: number;
  /** [rad/s^2] Torque. */
  torque: number;
  /** [kg] Mass. */
  mass: number;
  /** Pre-calculated 1/mass. Use 0 for infinite mass (static). */
  readonly inverseMass: number;
  /** Rotational resistance. */
  inertia: number;
  /** Pre-calculated 1/inertia. */
  readonly inverseInertia: number;
  /** [unitless] Bounciness [0, 1]. */
  restitution: number;
  /** [unitless] Static friction coefficient. */
  staticFriction: number;
  /** [unitless] Dynamic friction coefficient. */
  dynamicFriction: number;
  /** [unitless] Multiplier for global gravity. */
  gravityScale: number;
  /** If true, the entity will not rotate due to torque or collisions. */
  fixedRotation: boolean;
}

/**
 * Visual rendering properties.
 */
export interface RenderComponent extends Component {
  type: "Render";
  visible: boolean;
  opacity: number;
  color?: string;
  shape: string;
  size: number;
  rotation: number;
  zIndex?: number;
}

/**
 * Basic health/life tracking.
 */
export interface HealthComponent extends Component {
  type: "Health";
  current: number;
  max: number;
}

/**
 * Generic input state for an entity.
 */
export interface InputStateComponent extends Component {
  type: "InputState";
  axes: Map<string, number>;
  buttons: Map<string, boolean>;
}

/**
 * Global or local EventBus reference.
 */
export interface EventBusComponent<T extends EventRegistry = EventRegistry> extends Component {
  type: "EventBus";
  bus: GenericEventBus<T>;
}

/**
 * Generic frame-based animator.
 */
export interface AnimatorComponent extends Component {
  type: "Animator";
  animations: unknown;
  current?: string;
}

/**
 * Finite State Machine component.
 */
export interface StateMachineComponent extends Component {
  type: "StateMachine";
  states: unknown;
  current?: string;
}

/**
 * Visual particle emitter.
 */
export interface ParticleEmitterComponent extends Component {
  type: "ParticleEmitter";
  config: unknown;
}

/**
 * Grid-based tilemap data.
 */
export interface TilemapComponent extends Component {
  type: "Tilemap";
  data: unknown;
}

/**
 * 2D Camera settings.
 */
export interface Camera2DComponent extends Component {
  type: "Camera2D";
  x: number;
  y: number;
  zoom: number;
  target?: Entity;
}

/**
 * Screen shake effect parameters.
 */
export interface ScreenShakeComponent extends Component {
  type: "ScreenShake";
  intensity: number;
  duration: number;
}

/**
 * Visual offset from the physics/transform position.
 */
export interface VisualOffsetComponent extends Component {
  type: "VisualOffset";
  x: number;
  y: number;
}

/**
 * Visual trail/breadcrumb tracking.
 */
export interface TrailComponent extends Component {
  type: "Trail";
  points: unknown[];
}

/**
 * Spatial partitioning node reference.
 */
export interface SpatialNodeComponent extends Component {
  type: "SpatialNode";
  active: boolean;
}

/**
 * Component for requesting haptic feedback.
 */
export interface HapticRequestComponent<TPattern extends string = string> extends Component {
  type: "HapticRequest";
  pattern: TPattern;
  intensity?: number;
}

export interface ReclaimableComponent extends Component {
  type: "Reclaimable";
  poolId: string;
  onReclaim?: (world: any, entity: Entity) => void;
}

/**
 * The standard set of components provided by the core engine.
 */
export interface CoreComponentRegistry extends ComponentRegistry {
  Transform: TransformComponent;
  PreviousTransform: PreviousTransformComponent;
  Velocity: VelocityComponent;
  Friction: FrictionComponent;
  Boundary: BoundaryComponent;
  TTL: TTLComponent;
  Collider2D: Collider2DComponent;
  CollisionEvents: CollisionEventsComponent;
  PhysicsBody2D: PhysicsBody2DComponent;
  Render: RenderComponent;
  Health: HealthComponent;
  InputState: InputStateComponent;
  EventBus: EventBusComponent<EventRegistry>;
  Animator: AnimatorComponent;
  StateMachine: StateMachineComponent;
  ParticleEmitter: ParticleEmitterComponent;
  Tilemap: TilemapComponent;
  Camera2D: Camera2DComponent;
  ScreenShake: ScreenShakeComponent;
  VisualOffset: VisualOffsetComponent;
  Trail: TrailComponent;
  SpatialNode: SpatialNodeComponent;
  HapticRequest: HapticRequestComponent<string>;
  Reclaimable: ReclaimableComponent;
}
