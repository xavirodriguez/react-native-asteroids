/**
 * Base types and interfaces for the Entity-Component-System (ECS) architecture of the Asteroids game.
 *
 * @remarks
 * This module defines the core building blocks: {@link Entity}, {@link Component},
 * and various concrete component interfaces used throughout the game.
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
 *
 * @remarks
 * Attached to entities that exist at a specific location in the game world.
 */
export interface PositionComponent extends Component {
  type: "Position"
  /** X-coordinate on the screen in pixels */
  x: number
  /** Y-coordinate on the screen in pixels */
  y: number
}

/**
 * Represents velocity in 2D space.
 *
 * @remarks
 * Attached to entities that move over time.
 */
export interface VelocityComponent extends Component {
  type: "Velocity"
  /** Change in X position per second (pixels/sec) */
  dx: number
  /** Change in Y position per second (pixels/sec) */
  dy: number
}

/**
 * Defines how an entity should be rendered by the {@link GameRenderer}.
 */
export interface RenderComponent extends Component {
  type: "Render"
  /** The geometric shape to draw */
  shape: "triangle" | "circle" | "line"
  /** Base size of the shape in pixels */
  size: number
  /** CSS color string (e.g., "#FFFFFF", "red") */
  color: string
  /** Rotation in radians */
  rotation: number
}

/**
 * Defines the circular collision boundary for an entity.
 *
 * @remarks
 * Colliders are used for physical collision detection. They are often simplified
 * circular approximations (e.g., a circle for a complex ship) to improve performance.
 * The collider is invisible and doesn't necessarily match the render shape exactly.
 */
export interface ColliderComponent extends Component {
  type: "Collider"
  /** Radius of the circular collider in pixels */
  radius: number
}

/**
 * Tracks the health or durability of an entity.
 *
 * @remarks
 * Typically used for the player ship to track remaining lives or hits it can take.
 */
export interface HealthComponent extends Component {
  type: "Health"
  /** Current health points or lives */
  current: number
  /** Maximum health points or lives */
  max: number
}

/**
 * Stores the current input state for controllable entities.
 *
 * @remarks
 * Usually attached to the player ship entity.
 */
export interface InputComponent extends Component {
  type: "Input"
  /** Whether the thrust (acceleration) action is active */
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
 *
 * @remarks
 * Commonly used for projectiles (bullets) to prevent them from flying forever.
 */
export interface TTLComponent extends Component {
  type: "TTL"
  /** Remaining time to live in milliseconds */
  remaining: number
}

/**
 * Marker component for asteroid entities.
 */
export interface AsteroidComponent extends Component {
  type: "Asteroid"
  /** Size category of the asteroid, affecting its collider radius and split behavior */
  size: "large" | "medium" | "small"
}

/**
 * Component to track global game progress and state.
 *
 * @remarks
 * Only one entity should possess this component in the world.
 */
export interface GameStateComponent extends Component {
  type: "GameState"
  /** Number of lives remaining for the player */
  lives: number
  /** Current player score */
  score: number
  /** Current game level (affects asteroid wave size) */
  level: number
  /** Count of asteroids currently in the world */
  asteroidsRemaining: number
}

/**
 * Global game configuration constants for tuning gameplay.
 */
export const GAME_CONFIG = {
  /** Width of the game arena in pixels */
  SCREEN_WIDTH: 800,
  /** Height of the game arena in pixels */
  SCREEN_HEIGHT: 600,
  /** Acceleration force applied to the ship (pixels/sec²) */
  SHIP_THRUST: 200,
  /** Speed of rotation in radians per second */
  SHIP_ROTATION_SPEED: 3,
  /** Velocity of bullets in pixels per second */
  BULLET_SPEED: 300,
  /** Lifespan of bullets in milliseconds */
  BULLET_TTL: 2000,
}
