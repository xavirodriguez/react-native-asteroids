import { Component } from "../../../engine/types/EngineTypes";

/**
 * Represents the current state of user inputs for Asteroids.
 */
export interface InputState {
  thrust: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
  shoot: boolean;
  hyperspace: boolean;
  [key: string]: any;
}

/**
 * Stores the current input state for controllable entities in Asteroids.
 */
export interface InputComponent extends Component, InputState {
  type: "Input";
  shootCooldownRemaining: number;
}

/**
 * Marker component for bullet entities in Asteroids.
 */
export interface BulletComponent extends Component {
  type: "Bullet";
}

/**
 * Marker component for the player ship in Asteroids.
 */
export interface ShipComponent extends Component {
  type: "Ship";
  sessionId?: string;
  hyperspaceTimer: number;
  hyperspaceCooldownRemaining: number;
}

/**
 * Marker component for UFO entities.
 */
export interface UfoComponent extends Component {
  type: "Ufo";
  baseY: number;
  time: number;
}

/**
 * Marker component for asteroid entities.
 */
export interface AsteroidComponent extends Component {
  type: "Asteroid";
  size: "large" | "medium" | "small";
}

import { Star, Legacy } from "../../../engine/index";

/**
 * Component to track global game progress and state.
 */
export interface GameStateComponent extends Component {
  type: "GameState";
  lives: number;
  score: number;
  level: number;
  asteroidsRemaining: number;
  isGameOver: boolean;
  comboCount: number;
  comboMultiplier: number;
  lastBulletHit: boolean;
  serverTick: number;
  stars?: Star[];
  screenShake?: Legacy.LegacyScreenShake | null;
  debugCRT?: boolean;
}

/**
 * Null Object for GameStateComponent to avoid returning null/undefined.
 */
export const INITIAL_GAME_STATE: GameStateComponent = Object.freeze({
  type: "GameState",
  lives: 0,
  score: 0,
  level: 0,
  asteroidsRemaining: 0,
  isGameOver: false,
  comboCount: 0,
  comboMultiplier: 1,
  lastBulletHit: false,
  serverTick: 0,
});

/**
 * Global game configuration constants for tuning gameplay.
 */
export const GAME_CONFIG = {
  SCREEN_WIDTH: 800,
  SCREEN_HEIGHT: 600,
  SCREEN_CENTER_X: 400,
  SCREEN_CENTER_Y: 300,

  KEYS: {
    THRUST: "ArrowUp",
    ROTATE_LEFT: "ArrowLeft",
    ROTATE_RIGHT: "ArrowRight",
    SHOOT: "Space",
    HYPERSPACE: "ShiftLeft",
    PAUSE: "KeyP",
    RESTART: "KeyR",
  },

  SHIP_THRUST: 200,
  SHIP_ROTATION_SPEED: 3,
  SHIP_INITIAL_LIVES: 3,
  SHIP_RENDER_SIZE: 10,
  SHIP_COLLIDER_RADIUS: 8,
  SHIP_FRICTION: 0.99,

  BULLET_SPEED: 300,
  BULLET_TTL: 2000,
  BULLET_SHOOT_COOLDOWN: 200,
  BULLET_SIZE: 2,

  INVULNERABILITY_DURATION: 2000,

  HYPERSPACE_DURATION: 500,
  HYPERSPACE_COOLDOWN: 3000,

  UFO_SPEED: 100,
  UFO_SPAWN_CHANCE: 0.005,
  UFO_SIZE: 15,

  INITIAL_ASTEROID_COUNT: 4,
  MAX_WAVE_ASTEROIDS: 12,
  WAVE_SPAWN_DISTANCE: 200,
  INITIAL_ASTEROID_SPAWN_RADIUS: 150,

  ASTEROID_RADII: {
    large: 30,
    medium: 20,
    small: 10,
  },
  ASTEROID_SPLIT_OFFSET_LARGE: 10,
  ASTEROID_SPLIT_OFFSET_MEDIUM: 5,
  ASTEROID_SCORE: 10,
  MAX_DELTA_TIME: 100,

  PARTICLE_COUNT: 10,
  PARTICLE_TTL_BASE: 600,
  PARTICLE_SPEED_BASE: 50,

  STAR_COUNT: 150,

  SHAKE_INTENSITY_IMPACT: 8,
  SHAKE_DURATION_IMPACT: 15,

  TRAIL_MAX_LENGTH: 12,
};
