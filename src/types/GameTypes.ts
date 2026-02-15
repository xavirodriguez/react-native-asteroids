/**
 * Base types for the Entity-Component-System (ECS) architecture.
 */

/**
 * Unique identifier for a component type.
 */
export type ComponentType = string

/**
 * Unique identifier for an entity in the world.
 */
export type Entity = number

/**
 * Base interface for all components.
 * Every component must have a type discriminator.
 */
export interface Component {
  /** Discriminator for the component type */
  type: ComponentType
}

/**
 * Represents a position in 2D space.
 */
export interface PositionComponent extends Component {
  type: "Position"
  /** X-coordinate on the screen */
  x: number
  /** Y-coordinate on the screen */
  y: number
}

/**
 * Represents velocity in 2D space.
 */
export interface VelocityComponent extends Component {
  type: "Velocity"
  /** Change in X per second */
  dx: number
  /** Change in Y per second */
  dy: number
}

/**
 * Defines how an entity should be rendered.
 */
export interface RenderComponent extends Component {
  type: "Render"
  /** The geometric shape to draw */
  shape: "triangle" | "circle" | "line"
  /** Base size of the shape in pixels */
  size: number
  /** CSS color string */
  color: string
  /** Rotation in radians */
  rotation: number
}

/**
 * Defines the collision boundary for an entity.
 *
 * @remarks
 * Colliders are used for physical collision detection. They are often simplified
 * approximations (e.g., a circle for a complex ship) to improve performance.
 * The collider is invisible and doesn't necessarily match the render shape exactly.
 */
export interface ColliderComponent extends Component {
  type: "Collider"
  /** Radius of the circular collider */
  radius: number
}

/**
 * Tracks the health or durability of an entity.
 */
export interface HealthComponent extends Component {
  type: "Health"
  /** Current health points */
  current: number
  /** Maximum health points */
  max: number
}

/**
 * Stores the current input state for controllable entities.
 */
export interface InputComponent extends Component {
  type: "Input"
  /** Whether the thrust (accelerate) action is active */
  thrust: boolean
  /** Whether the rotate left action is active */
  rotateLeft: boolean
  /** Whether the rotate right action is active */
  rotateRight: boolean
  /** Whether the shoot action is active */
  shoot: boolean
}

/**
 * Component for entities that should be removed after a period of time.
 */
export interface TTLComponent extends Component {
  type: "TTL"
  /** Remaining time to live in milliseconds */
  remaining: number
}

/**
 * Marker component for asteroids.
 */
export interface AsteroidComponent extends Component {
  type: "Asteroid"
  /** Size category of the asteroid */
  size: "large" | "medium" | "small"
}

/**
 * Component to track global game progress and state.
 */
export interface GameStateComponent extends Component {
  type: "GameState"
  /** Number of lives remaining for the player */
  lives: number
  /** Current player score */
  score: number
  /** Current game level (affects difficulty) */
  level: number
  /** Count of asteroids currently in the world */
  asteroidsRemaining: number
}

/**
 * Global game configuration constants.
 */
export const GAME_CONFIG = {
  /** Width of the game arena in pixels */
  SCREEN_WIDTH: 800,
  /** Height of the game arena in pixels */
  SCREEN_HEIGHT: 600,
  /** Acceleration force applied to the ship */
  SHIP_THRUST: 200,
  /** Speed of rotation in radians per second */
  SHIP_ROTATION_SPEED: 3,
  /** Velocity of bullets in pixels per second */
  BULLET_SPEED: 300,
  /** Lifespan of bullets in milliseconds */
  BULLET_TTL: 2000,
}
