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
