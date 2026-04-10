import { Component, TransformComponent, VelocityComponent, RenderComponent, HealthComponent } from "../../../engine/types/EngineTypes";

/**
 * Represents the current state of user inputs for Space Invaders.
 */
export interface InputState {
  moveLeft: boolean;
  moveRight: boolean;
  shoot: boolean;
}

/**
 * Stores the current input state for the player in Space Invaders.
 */
export interface InputComponent extends Component, InputState {
  type: "Input";
  shootCooldownRemaining: number;
}

/**
 * Marker component for the player.
 */
export interface PlayerComponent extends Component {
  type: "Player";
}

/**
 * Component for invaders.
 */
export interface InvaderComponent extends Component {
  type: "Invader";
  row: number;
  col: number;
  points: number;
}

/**
 * Marker component for enemy bullets.
 */
export interface EnemyBulletComponent extends Component {
  type: "EnemyBullet";
}

/**
 * Marker component for player bullets.
 */
export interface PlayerBulletComponent extends Component {
  type: "PlayerBullet";
}

/**
 * Component for shield segments.
 */
export interface ShieldComponent extends Component {
  type: "Shield";
  hp: number;
  maxHp: number;
  segment?: { row: number; col: number };
}

/**
 * Singleton entity to control the invader formation.
 */
export interface FormationComponent extends Component {
  type: "Formation";
  direction: 1 | -1;
  stepDownPending: boolean;
  speed: number;
  descentStep: number;
  leftBound: number;
  rightBound: number;
  fireCooldownRemaining: number;
}

/**
 * Component to track global game progress and state.
 */
export interface GameStateComponent extends Component {
  type: "GameState";
  lives: number;
  score: number;
  level: number;
  invadersRemaining: number;
  isGameOver: boolean;
  combo: number;
  multiplier: number;
  comboTimerRemaining: number;
  highScoreCandidate?: number;
  screenShake?: { intensity: number; duration: number } | null;
  kamikazesActive: number;
}

/**
 * Null Object for GameStateComponent.
 */
export const INITIAL_GAME_STATE: GameStateComponent = Object.freeze({
  type: "GameState",
  lives: 0,
  score: 0,
  level: 0,
  invadersRemaining: 0,
  isGameOver: false,
  combo: 0,
  multiplier: 1,
  comboTimerRemaining: 0,
  kamikazesActive: 0,
});

/**
 * Global game configuration constants.
 */
export const GAME_CONFIG = {
  SCREEN_WIDTH: 800,
  SCREEN_HEIGHT: 600,
  SCREEN_CENTER_X: 400,
  SCREEN_CENTER_Y: 300,

  KEYS: {
    LEFT: "ArrowLeft",
    RIGHT: "ArrowRight",
    SHOOT: "Space",
    PAUSE: "KeyP",
    RESTART: "KeyR",
  },

  PLAYER_SPEED: 300,
  PLAYER_RENDER_WIDTH: 40,
  PLAYER_RENDER_HEIGHT: 20,
  PLAYER_COLLIDER_RADIUS: 15,
  PLAYER_INITIAL_LIVES: 3,
  PLAYER_SHOOT_COOLDOWN: 500,

  PLAYER_BULLET_SPEED: 500,
  PLAYER_BULLET_TTL: 2000,
  PLAYER_BULLET_SIZE: 4,

  ENEMY_BULLET_SPEED: 250,
  ENEMY_BULLET_TTL: 3000,
  ENEMY_BULLET_SIZE: 4,
  ENEMY_FIRE_INTERVAL_MIN: 1000,
  ENEMY_FIRE_INTERVAL_MAX: 3000,

  INVADER_ROWS: 5,
  INVADER_COLS: 11,
  INVADER_SPACING_X: 50,
  INVADER_SPACING_Y: 40,
  INVADER_START_X: 100,
  INVADER_START_Y: 100,
  INVADER_SPEED_BASE: 50,
  INVADER_SPEED_MAX: 400,
  INVADER_DESCENT_STEP: 20,
  INVADER_ANIMATION_RATE: 0.5,

  SHIELD_COUNT: 4,
  SHIELD_SEGMENTS_X: 4,
  SHIELD_SEGMENTS_Y: 3,
  SHIELD_SEGMENT_HP: 3,
  SHIELD_START_Y: 480,
  SHIELD_WIDTH: 60,
  SHIELD_HEIGHT: 40,
  SHIELD_SPACING: 150,

  LEVEL_SPEED_MULTIPLIER: 1.1,
  MAX_DELTA_TIME: 100,

  ELITE_HP: 2,

  PARTICLE_COUNT: 8,
  PARTICLE_TTL_BASE: 500,
  TRAIL_MAX_LENGTH: 0, // No trails for Space Invaders usually

  COMBO_TIMEOUT: 2000, // 2 segundos para mantener el combo
  MAX_MULTIPLIER: 10,
};
