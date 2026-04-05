/**
 * Types that are part of the engine and apply to ANY game.
 */

export interface Component {
  type: string;  // Open string - each game defines its own types
}

export type Entity = number;

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

export interface ScreenShake {
  intensity: number;
  duration: number;
}

export interface ScreenShakeComponent extends Component {
  type: "ScreenShake";
  config: ScreenShake | null;
}

/**
 * Metadata for identifying entities and their collision profiles.
 */
export interface TagComponent extends Component {
  type: "Tag";
  tags: string[];
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
