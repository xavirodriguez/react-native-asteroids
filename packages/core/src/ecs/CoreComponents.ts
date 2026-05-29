/**
 * Generic ECS core component definitions.
 */

import { Component, ComponentRegistry } from "./Component";
import { EventRegistry, EventBus as GenericEventBus } from "../events/EventBus";

/**
 * Standard 2D transform.
 */
export interface TransformComponent extends Component {
  type: "Transform";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Stores the transform from the previous simulation tick.
 */
export interface PreviousTransformComponent extends Component {
  type: "PreviousTransform";
  x: number;
  y: number;
  rotation: number;
}

/**
 * 2D linear velocity.
 */
export interface VelocityComponent extends Component {
  type: "Velocity";
  vx: number;
  vy: number;
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
  width: number;
  height: number;
  mode: "wrap" | "bounce" | "destroy";
}

/**
 * Time To Live - automatic entity destruction.
 */
export interface TTLComponent extends Component {
  type: "TTL";
  timeLeft: number;
}

/**
 * Generic 2D circular collider.
 */
export interface Collider2DComponent extends Component {
  type: "Collider2D";
  radius: number;
  layer: number;
  mask: number;
}

/**
 * Stores collision events occurred in the current tick.
 */
export interface CollisionEventsComponent extends Component {
  type: "CollisionEvents";
  collisions: unknown[];
}

/**
 * Basic physics body properties.
 */
export interface PhysicsBody2DComponent extends Component {
  type: "PhysicsBody2D";
  mass: number;
  inverseMass: number;
}

/**
 * Visual rendering properties.
 */
export interface RenderComponent extends Component {
  type: "Render";
  visible: boolean;
  opacity: number;
  color?: string;
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
  axes: Record<string, number>;
  buttons: Record<string, boolean>;
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
  zoom: number;
  target?: number;
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
  cellId: string;
}

/**
 * Component for requesting haptic feedback.
 */
export interface HapticRequestComponent<TPattern extends string = string> extends Component {
  type: "HapticRequest";
  pattern: TPattern;
  intensity?: number;
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
}
