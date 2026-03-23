/**
 * Generic ECS and Rendering types for TinyAsterEngine.
 */

export type Entity = number;

export interface Component {
  readonly type: string;
}

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

export interface RenderComponent extends Component {
  type: "Render";
  shape: string;
  size: number;
  color: string;
  rotation: number;
  opacity?: number;
  scale?: number;
  trailPositions?: { x: number; y: number }[];
  trailMaxLength?: number;
  vertices?: { x: number; y: number }[];
  internalLines?: { x1: number; y1: number; x2: number; y2: number }[];
}

export interface ColliderComponent extends Component {
  type: "Collider";
  radius: number;
}

export interface TTLComponent extends Component {
  type: "TTL";
  remaining: number;
  total: number;
}

export interface AnimationComponent extends Component {
  type: "Animation";
  property: string;
  waveType: "sine" | "linear" | "blink";
  frequency: number;
  amplitude: number;
  currentValue: number;
}

export interface ScreenShake {
  intensity: number;
  duration: number;
}

export interface InputState {
  [key: string]: boolean;
}
