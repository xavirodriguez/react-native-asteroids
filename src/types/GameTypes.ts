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
  /** Remaining time in milliseconds for which the entity is invulnerable to damage */
  invulnerableRemaining: number
}

/**
 * Represents the current state of user inputs.
 */
export interface InputState {
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
 * Stores the current input state for controllable entities.
 *
 * @remarks
 * Usually attached to the player ship entity.
 */
export interface InputComponent extends Component, InputState {
  type: "Input"
  /** Remaining cooldown time between shots in milliseconds */
  shootCooldownRemaining: number
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
 * Marker component for bullet entities.
 */
export interface BulletComponent extends Component {
  type: "Bullet"
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
  /** Whether the game is currently in a Game Over state */
  isGameOver: boolean
}

/**
 * Null Object for GameStateComponent to avoid returning null/undefined.
 */
export const INITIAL_GAME_STATE: GameStateComponent = {
  type: "GameState",
  lives: 0,
  score: 0,
  level: 0,
  asteroidsRemaining: 0,
  isGameOver: false,
}

/**
 * Global game configuration constants for tuning gameplay.
 */
export const GAME_CONFIG = {
  /** Width of the game arena in pixels */
  SCREEN_WIDTH: 800,
  /** Height of the game arena in pixels */
  SCREEN_HEIGHT: 600,
  /** Center X position of the screen */
  SCREEN_CENTER_X: 400,
  /** Center Y position of the screen */
  SCREEN_CENTER_Y: 300,

  /** Input keys mapping */
  KEYS: {
    THRUST: "ArrowUp",
    ROTATE_LEFT: "ArrowLeft",
    ROTATE_RIGHT: "ArrowRight",
    SHOOT: "Space",
  },

  /** Acceleration force applied to the ship (pixels/sec²) */
  SHIP_THRUST: 200,
  /** Speed of rotation in radians per second */
  SHIP_ROTATION_SPEED: 3,
  /** Initial number of lives for the player */
  SHIP_INITIAL_LIVES: 3,
  /** Ship friction coefficient (velocity multiplier per frame) */
  SHIP_FRICTION: 0.99,
  /** Base render size for the ship */
  SHIP_RENDER_SIZE: 10,
  /** Collider radius for the ship */
  SHIP_COLLIDER_RADIUS: 8,

  /** Velocity of bullets in pixels per second */
  BULLET_SPEED: 300,
  /** Lifespan of bullets in milliseconds */
  BULLET_TTL: 2000,
  /** Cooldown between bullets in milliseconds */
  BULLET_SHOOT_COOLDOWN: 200,
  /** Render size for bullets */
  BULLET_RENDER_SIZE: 2,
  /** Collider radius for bullets */
  BULLET_COLLIDER_RADIUS: 2,

  /** Duration of invulnerability after being hit, in milliseconds */
  INVULNERABILITY_DURATION: 2000,

  /** Initial number of asteroids in the first wave */
  INITIAL_ASTEROID_COUNT: 4,
  /** Maximum number of asteroids allowed in a single wave */
  MAX_WAVE_ASTEROIDS: 12,
  /** Distance from the center where new asteroid waves spawn */
  WAVE_SPAWN_DISTANCE: 200,
  /** Radius for spawning initial asteroids around the center */
  INITIAL_ASTEROID_SPAWN_RADIUS: 150,

  /** Asteroid radii mapping */
  ASTEROID_RADII: {
    large: 30,
    medium: 20,
    small: 10,
  },
  /** Position offset when a large asteroid splits into medium ones */
  ASTEROID_SPLIT_OFFSET_LARGE: 10,
  /** Position offset when a medium asteroid splits into small ones */
  ASTEROID_SPLIT_OFFSET_MEDIUM: 5,
  /** Points awarded for destroying an asteroid */
  ASTEROID_SCORE: 10,
}
