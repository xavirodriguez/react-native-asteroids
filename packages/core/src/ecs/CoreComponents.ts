import { Component, ComponentRegistry } from "./Component";
import { Entity } from "./Entity";
import { Shape } from "../physics/shapes/Shapes";
import { CollisionLayer, CollisionMask, Collision } from "../physics/collision/CollisionTypes";
import { World } from "./World";

/** @public */
export interface TransformComponent extends Component {
  type: "Transform";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  worldX: number;
  worldY: number;
  worldRotation: number;
  worldScaleX: number;
  worldScaleY: number;
  dirty: boolean;
  parentEntity?: Entity;
}

/** @public */
export interface VelocityComponent extends Component {
  type: "Velocity";
  vx: number;
  vy: number;
  angularVelocity: number;
}

/** @public */
export interface FrictionComponent extends Component {
  type: "Friction";
  value: number;
}

/** @public */
export interface BoundaryComponent extends Component {
  type: "Boundary";
  width: number;
  height: number;
  mode: "wrap" | "bounce" | "destroy";
}

/** @public */
export interface TTLComponent extends Component {
  type: "TTL";
  timeLeft: number;
  remaining: number;
  onCompleteEvent?: string;
}

/** @public */
export interface ReclaimableComponent extends Component {
  type: "Reclaimable";
  poolName: string;
  poolId: string;
  onReclaim?: (world: World<any, any, any>, entity: Entity) => void;
}

/** @public */
export interface IEntityPool {
  release(entity: Entity): void;
}

/** @public */
export interface RenderComponent extends Component {
  type: "Render";
  spriteId?: string;
  color?: string;
  visible: boolean;
  opacity: number;
  order: number;
  rotation: number;
  angularVelocity: number;
  hitFlashFrames: number;
  shape?: string;
  size?: number;
}

/** @public */
export interface HealthComponent extends Component {
  type: "Health";
  current: number;
  max: number;
  invulnerableRemaining?: number;
}

/** @public */
export interface InputStateComponent extends Component {
  type: "InputState";
  axes: Record<string, number>;
  buttons: Record<string, boolean>;
}

/** @public */
export interface AnimationDefinition {
  frames: number[];
  frameRate: number;
  loop?: boolean;
  onCompleteEvent?: string;
}

/** @public */
export interface AnimatorComponent extends Component {
  type: "Animator";
  currentAnimation?: string;
  frameIndex: number;
  elapsedTime: number;
  isPlaying: boolean;
  animations: Record<string, AnimationDefinition>;
  current: string | null;
  elapsed: number;
  frame: number;
}

/** @public */
export interface StateMachineComponent extends Component {
  type: "StateMachine";
  currentState: string;
  elapsedInState: number;
  data: Record<string, unknown>;
  machineId: string;
  elapsedMs: number;
  previousState?: string;
}

/** @public */
export interface ParticleEmitterConfig {
    type: string;
    x: number;
    y: number;
    count: number;
    burst?: boolean;
    rate: number;
    angle?: [number, number];
    speed?: [number, number];
    lifetime?: [number, number];
    size?: [number, number];
    color?: string | string[];
    position?: [number, number, number, number] | {x: number, y: number};
    loop?: boolean;
}

/** @public */
export interface ParticleEmitterComponent extends Component {
  type: "ParticleEmitter";
  config: ParticleEmitterConfig;
  active: boolean | number;
  elapsed: number;
}

/** @public */
export interface TilemapComponent extends Component {
  type: "Tilemap";
  data: number[][];
  tileSize: number;
  visibleRange?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/** @public */
export interface Camera2DComponent extends Component {
  type: "Camera2D";
  zoom: number;
  targetX: number;
  targetY: number;
  isMain?: boolean;
  x: number;
  y: number;
}

/** @public */
export interface ScreenShakeComponent extends Component {
  type: "ScreenShake";
  intensity: number;
  duration: number;
  remaining: number;
}

/** @public */
export interface VisualOffsetComponent extends Component {
  type: "VisualOffset";
  offsetX: number;
  offsetY: number;
}

/** @public */
export interface SpatialNodeComponent extends Component {
  type: "SpatialNode";
  gridX: number;
  gridY: number;
  active?: boolean;
}

/** @public */
export interface HapticRequestComponent<TPattern extends string = string> extends Component {
  type: "HapticRequest";
  pattern: TPattern;
  intensity?: number;
}

/** @public */
export interface JuiceAnimation {
  type: string;
  property?: string;
  duration: number;
  elapsed: number;
  target?: number;
  startValue?: number;
  endValue?: number;
  delay?: number;
  easing?: string;
  repeat?: number;
}

/** @public */
export interface JuiceComponent extends Component {
    type: "Juice";
    active: boolean;
    animations: JuiceAnimation[];
}

/** @public */
export interface CollisionEventsComponent extends Component {
    type: "CollisionEvents";
    collisions: Collision[];
    activeTriggers: Entity[];
    triggersEntered: Entity[];
    triggersExited: Entity[];
}

/** @public */
export interface ColliderComponent extends Component {
  type: "Collider";
  shape: Shape;
  layer: CollisionLayer;
  mask: CollisionMask;
  enabled: boolean;
  isTrigger: boolean;
  offsetX?: number;
  offsetY?: number;
}

/** @public */
export interface TrailComponent extends Component {
    type: "Trail";
    points: {x: number, y: number}[];
    maxLength: number;
    currentIndex: number;
    count: number;
}

/** @public */
export interface IHierarchicalComponent extends Component {
    parentEntity?: Entity;
    children: Entity[];
}

/** @public */
export interface Collider2DComponent extends Component {
  type: "Collider2D";
  shape: { type: "circle"; radius: number } | { type: "aabb"; halfWidth: number; halfHeight: number };
  layer: number;
  mask: number;
  offsetX: number;
  offsetY: number;
  isTrigger: boolean;
  enabled: boolean;
}

/** @public */
export interface CoreComponentRegistry extends ComponentRegistry {
  Transform: TransformComponent;
  Velocity: VelocityComponent;
  Friction: FrictionComponent;
  Boundary: BoundaryComponent;
  TTL: TTLComponent;
  Reclaimable: ReclaimableComponent;
  Render: RenderComponent;
  Health: HealthComponent;
  InputState: InputStateComponent;
  Animator: AnimatorComponent;
  StateMachine: StateMachineComponent;
  ParticleEmitter: ParticleEmitterComponent;
  Tilemap: TilemapComponent;
  Camera2D: Camera2DComponent;
  ScreenShake: ScreenShakeComponent;
  VisualOffset: VisualOffsetComponent;
  SpatialNode: SpatialNodeComponent;
  HapticRequest: HapticRequestComponent<string>;
  Juice: JuiceComponent;
  CollisionEvents: CollisionEventsComponent;
  Collider: ColliderComponent;
  Collider2D: Collider2DComponent;
  Trail: TrailComponent;
  Tag: import("./TagComponent").TagComponent;
}

export { Entity };
