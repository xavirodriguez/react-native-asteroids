import { Component } from "./Component";
import { Entity } from "./Entity";
import { EventBus } from "./EventBus";
import { StateMachine } from "./StateMachine";

export { Entity, Component };

/**
 * Components provided by the engine as reusable primitives.
 */

export interface PositionComponent extends Component {
  type: "Position";
  x: number;
  y: number;
}

export interface VelocityComponent extends Component {
  type: "Velocity";
  dx: number;
  dy: number;
}

export interface TTLComponent extends Component {
  type: "TTL";
  remaining: number;
  total: number;
}

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
  zIndex?: number;
  trailPositions?: { x: number; y: number }[];
  hitFlashFrames?: number;
  /** Custom data for game-specific drawers */
  data?: Record<string, any>;
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

/**
 * Transform component for hierarchical positioning.
 */
export interface TransformComponent extends Component {
  type: "Transform";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  parent?: Entity;
  // World-space values (calculated by HierarchySystem)
  worldX?: number;
  worldY?: number;
  worldRotation?: number;
  worldScaleX?: number;
  worldScaleY?: number;
}

/**
 * Legacy Transform interface for compatibility.
 * @deprecated Use TransformComponent instead.
 */
export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  matrix?: number[];
}

/**
 * Boundary component for world constraints.
 */
export interface BoundaryComponent extends Component {
  type: "Boundary";
  x: number;
  y: number;
  width: number;
  height: number;
  behavior: "wrap" | "bounce" | "destroy";
  // Backward compatibility
  mode?: "wrap" | "bounce" | "destroy";
  bounceX?: boolean;
  bounceY?: boolean;
}

/**
 * Input state component for semantic action handling.
 */
export type InputAction = string;

export interface InputStateComponent extends Component {
  type: "InputState";
  actions: Map<InputAction, boolean>;
  axes: Map<string, number>;
  isPressed: (action: InputAction) => boolean;
  getAxis: (axis: string) => number;
}

/**
 * Event bus singleton component.
 */
export interface EventBusComponent extends Component {
  type: "EventBus";
  bus: EventBus;
}

/**
 * Animator component for frame-based animations.
 */
export interface AnimationConfig {
  frames: number[];
  fps: number;
  loop: boolean;
  onComplete?: (entity: Entity) => void;
}

export type AnimationMap = Record<string, AnimationConfig>;

export interface AnimatorComponent extends Component {
  type: "Animator";
  animations: AnimationMap;
  current: string;
  frame: number;
  elapsed: number;
}

/**
 * State machine component for complex logic.
 */
export interface StateMachineComponent extends Component {
  type: "StateMachine";
  fsm: StateMachine<any, any>;
}

/**
 * Particle emitter configuration and component.
 */
export interface ParticleEmitterConfig {
  position?: { x: number; y: number };
  rate: number;
  burst?: number;
  lifetime: { min: number; max: number };
  speed: { min: number; max: number };
  angle: { min: number; max: number };
  size: { min: number; max: number };
  color: string[];
  gravity?: { x: number; y: number };
  loop: boolean;
}

export interface ParticleEmitterComponent extends Component {
  type: "ParticleEmitter";
  config: ParticleEmitterConfig;
  active: boolean;
  elapsed: number;
}

/**
 * Tilemap data and component.
 */
export interface Tileset {
  id: number;
  textureId: string;
  solid: boolean;
}

export interface TilemapLayer {
  name: string;
  tiles: number[];
  collidable: boolean;
}

export interface TilemapData {
  tileSize: number;
  width: number;
  height: number;
  layers: TilemapLayer[];
  tilesets: Tileset[];
}

export interface TilemapComponent extends Component {
  type: "Tilemap";
  data: TilemapData;
  isSolid: (tileX: number, tileY: number) => boolean;
}

/**
 * Camera 2D component.
 */
export interface Camera2DComponent extends Component {
  type: "Camera2D";
  x: number;
  y: number;
  zoom: number;
  shakeIntensity: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
  smoothing: number;
  offset: { x: number; y: number };
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  target?: Entity;
}

/**
 * Common data structures.
 */
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RigidBodyComponent extends Component {
  type: "RigidBody";
  bodyId: any;
  isStatic?: boolean;
}

export interface FrictionComponent extends Component {
  type: "Friction";
  value: number;
}

export interface ScreenShakeComponent extends Component {
  type: "ScreenShake";
  intensity: number;
  duration: number;
  remaining: number;
  config?: {
    intensity: number;
    duration: number;
  };
}

/**
 * Legacy ScreenShake interface for compatibility.
 * @deprecated Use ScreenShakeComponent instead.
 */
export interface ScreenShake {
  intensity: number;
  duration: number;
  remaining: number;
}

/**
 * Renderable component for compatibility.
 * @deprecated Use RenderComponent instead.
 */
export interface RenderableComponent extends Component {
  type: "Renderable";
  shape: string;
  visible: boolean;
  textureId?: string;
  width: number;
  height: number;
  color: string;
  zOrder: number;
  opacity?: number;
  renderType?: string;
  size?: number;
  radius?: number;
}

/**
 * Tag component for basic entity categorization.
 */
export interface TagComponent extends Component {
  type: "Tag";
  tag?: string;
  tags?: string[];
}

/**
 * Star component for background effects.
 */
export interface Star extends Component {
  type: "Star";
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
}
