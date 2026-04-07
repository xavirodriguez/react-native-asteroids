/**
 * Types that are part of the engine and apply to ANY game.
 */

export interface Component {
  type: string;  // Open string - each game defines its own types
}

export type Entity = number;

export interface Transform {
  x: number;
  y: number;
  rotation: number; // radianes
  scaleX: number;
  scaleY: number;
  /** Matrix representation: [a, b, c, d, tx, ty] */
  matrix?: [number, number, number, number, number, number];
}

export interface Velocity {
  vx: number;
  vy: number;
  angularVelocity: number;
}

/**
 * Components provided by the engine as reusable primitives.
 */

/**
 * Base transform for all game entities.
 */
export interface TransformComponent extends Component {
  type: "Transform";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  parent?: Entity;
  worldX?: number;
  worldY?: number;
  worldRotation?: number;
  worldScaleX?: number;
  worldScaleY?: number;
}

/**
 * LEGACY: Alias for TransformComponent to facilitate migration.
 * @deprecated Use TransformComponent instead.
 */
export type PositionComponent = TransformComponent;

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
 * RenderComponent remains here because SvgRenderer uses it directly.
 */
export interface RenderComponent extends Component {
  type: "Render";
  shape: string;  // Open string - each game defines its shapes
  size: number;
  color: string;
  rotation: number;
  zIndex?: number;
  trailPositions?: { x: number; y: number }[];
  vertices?: { x: number; y: number }[];
  internalLines?: { x1: number; y1: number; x2: number; y2: number }[];
  angularVelocity?: number;
  hitFlashFrames?: number;
}

/**
 * Reclaimable component for entities that should be returned to a pool.
 */
export interface ReclaimableComponent extends Component {
  type: "Reclaimable";
  onReclaim: (world: any, entity: any) => void;
}

export type BoundaryMode = "wrap" | "bounce" | "destroy";

export interface BoundaryComponent extends Component {
  type: "Boundary";
  width: number;
  height: number;
  mode: BoundaryMode;
  bounceX?: boolean;
  bounceY?: boolean;
}

export interface FrictionComponent extends Component {
  type: "Friction";
  value: number; // 0 to 1, where 1 is no friction and 0 is instant stop
}

export interface RenderableComponent extends Component {
  type: "Renderable";
  shape: 'sprite' | 'rect' | 'circle' | 'line';
  textureId: string | null;
  width: number;
  height: number;
  color: string;
  visible: boolean;
  zOrder: number;
}

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ScreenShake {
  intensity: number;
  duration: number;
}

export interface ScreenShakeComponent extends Component {
  type: "ScreenShake";
  config: ScreenShake | null;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
  layer: number;
}

/**
 * Metadata for identifying entities and their collision profiles.
 */
export interface TagComponent extends Component {
  type: "Tag";
  tags: string[];
}

/**
 * Unified Input System types.
 */
export type InputAction = string;

export interface InputStateComponent extends Component {
  type: "InputState";
  /** Map of semantic actions to their current pressed state */
  actions: Map<InputAction, boolean>;
  /** Map of axis names to their current value (-1 to 1) */
  axes: Map<string, number>;
  /** Helper to check if an action is pressed */
  isPressed(action: InputAction): boolean;
  /** Helper to get an axis value */
  getAxis(axis: string): number;
}

/**
 * EventBus types.
 */
export interface EventBusComponent extends Component {
  type: "EventBus";
  /** The EventBus instance */
  bus: any; // Using any to avoid circular dependency, defined in EventBus.ts
}

/**
 * StateMachine types.
 */
export interface StateMachineComponent extends Component {
  type: "StateMachine";
  /** The StateMachine instance */
  fsm: any; // Using any to avoid circular dependency, defined in StateMachine.ts
}

/**
 * Animation types.
 */
export interface AnimationDefinition {
  frames: number[];
  fps: number;
  loop: boolean;
  onComplete?: (entity: Entity) => void;
}

export interface AnimationMap {
  [name: string]: AnimationDefinition;
}

export interface AnimatorComponent extends Component {
  type: "Animator";
  animations: AnimationMap;
  current: string;
  frame: number;
  elapsed: number;
}

/**
 * Camera 2D types.
 */
export interface Camera2DComponent extends Component {
  type: "Camera2D";
  x: number;
  y: number;
  zoom: number;
  shakeIntensity: number;
  target?: Entity;
  bounds?: AABB;
  smoothing: number;
  offset: { x: number; y: number };
}

/**
 * Tilemap types.
 */
export interface TilemapLayer {
  name: string;
  tiles: number[];
  collidable: boolean;
}

export interface TilesetConfig {
  id: number;
  textureId: string;
  solid: boolean;
}

export interface TilemapData {
  tileSize: number;
  width: number;
  height: number;
  layers: TilemapLayer[];
  tilesets: TilesetConfig[];
}

export interface TilemapComponent extends Component {
  type: "Tilemap";
  data: TilemapData;
  /** Helper to check if a tile position is solid */
  isSolid(tileX: number, tileY: number): boolean;
}

/**
 * Particle types.
 */
export interface ParticleEmitterConfig {
  position: { x: number; y: number };
  rate: number; // particles per second
  burst: number; // emitted once upon activation
  lifetime: { min: number; max: number }; // seconds
  speed: { min: number; max: number };
  angle: { min: number; max: number }; // degrees
  size: { min: number; max: number };
  color: string[];
  gravity: { x: number; y: number };
  loop: boolean;
}

export interface ParticleEmitterComponent extends Component {
  type: "ParticleEmitter";
  config: ParticleEmitterConfig;
  active: boolean;
  elapsed: number;
}

/**
 * Configuration for Matter.js rigid body adapter.
 */
export interface RigidBodyComponent extends Component {
  type: "RigidBody";
  bodyId: number | string; // Reference to Matter.Body.id
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

/**
 * Unified renderable descriptor for Skia.
 */
export type RenderType = "circle" | "rect" | "sprite" | "atlas" | "text" | "path" | "particle";

export interface RenderableComponent extends Component {
  type: "Renderable";
  renderType: RenderType;
  color: string;
  opacity: number;
  visible: boolean;
  zIndex: number;
  size: { width: number; height: number; radius?: number };
  spriteKey?: string; // For atlas or simple image lookup
  text?: string;
  pathData?: string;
}
