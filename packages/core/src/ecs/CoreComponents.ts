import { Component, ComponentRegistry } from "./Component";
import { Entity } from "./Entity";
import { Shape } from "../physics/shapes/Shapes";
import { CollisionLayer, CollisionMask, Collision } from "../physics/collision/CollisionTypes";

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

export interface VelocityComponent extends Component {
  type: "Velocity";
  vx: number;
  vy: number;
  angularVelocity: number;
}

export interface FrictionComponent extends Component {
  type: "Friction";
  value: number;
}

export interface BoundaryComponent extends Component {
  type: "Boundary";
  width: number;
  height: number;
  mode: "wrap" | "bounce" | "destroy";
}

export interface TTLComponent extends Component {
  type: "TTL";
  timeLeft: number;
  remaining: number;
  onCompleteEvent?: string;
}

export interface ReclaimableComponent extends Component {
  type: "Reclaimable";
  poolName: string;
  poolId: string;
}

export interface IEntityPool {
  release(entity: Entity): void;
}

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
}

export interface HealthComponent extends Component {
  type: "Health";
  current: number;
  max: number;
}

export interface InputStateComponent extends Component {
  type: "InputState";
  axes: Record<string, number>;
  buttons: Record<string, boolean>;
}

export interface AnimatorComponent extends Component {
  type: "Animator";
  currentAnimation?: string;
  frameIndex: number;
  elapsedTime: number;
  isPlaying: boolean;
  animations: any;
  current: any;
  elapsed: number;
  frame: number;
}

export interface StateMachineComponent extends Component {
  type: "StateMachine";
  currentState: string;
  elapsedInState: number;
  data: Record<string, any>;
  machineId: string;
  elapsedMs: number;
  previousState?: string;
}

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

export interface ParticleEmitterComponent extends Component {
  type: "ParticleEmitter";
  config: ParticleEmitterConfig;
  active: boolean | number;
  elapsed: number;
}

export interface TilemapComponent extends Component {
  type: "Tilemap";
  data: number[][];
  tileSize: number;
  visibleRange?: any;
}

export interface Camera2DComponent extends Component {
  type: "Camera2D";
  zoom: number;
  targetX: number;
  targetY: number;
  isMain?: boolean;
  x: number;
  y: number;
}

export interface ScreenShakeComponent extends Component {
  type: "ScreenShake";
  intensity: number;
  duration: number;
  remaining: number;
}

export interface VisualOffsetComponent extends Component {
  type: "VisualOffset";
  offsetX: number;
  offsetY: number;
}

export interface SpatialNodeComponent extends Component {
  type: "SpatialNode";
  gridX: number;
  gridY: number;
  active?: boolean;
}

export interface HapticRequestComponent<TPattern extends string = string> extends Component {
  type: "HapticRequest";
  pattern: TPattern;
  intensity?: number;
}

export interface JuiceComponent extends Component {
    type: "Juice";
    active: boolean;
    animations: any[];
}

export interface CollisionEventsComponent extends Component {
    type: "CollisionEvents";
    collisions: Collision[];
    activeTriggers: Entity[];
    triggersEntered: Entity[];
    triggersExited: Entity[];
}

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

export interface TrailComponent extends Component {
    type: "Trail";
    points: {x: number, y: number}[];
    maxLength: number;
    currentIndex: number;
    count: number;
}

export interface IHierarchicalComponent extends Component {
    parentEntity?: Entity;
    children: Entity[];
}

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
  Trail: TrailComponent;
  Tag: import("./TagComponent").TagComponent;
}

export { Entity };
