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
}

export interface Velocity {
  vx: number;
  vy: number;
  angularVelocity: number;
}

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
