import { Component } from "../../../engine/types/EngineTypes";

/**
 * Represents the current state of user inputs for Flappy Bird.
 */
export interface FlappyBirdInput {
  flap: boolean;
}

/**
 * Stores the current input state for the bird in Flappy Bird.
 */
export interface FlappyBirdInputComponent extends Component, FlappyBirdInput {
  type: "FlappyInput";
  flapCooldownRemaining: number;
}

/**
 * Component for the bird entity.
 */
export interface BirdComponent extends Component {
  type: "Bird";
  velocityY: number;
  isAlive: boolean;
}

/**
 * Component for pipe entities.
 */
export interface PipeComponent extends Component {
  type: "Pipe";
  gapY: number;
  gapSize: number;
  scored: boolean;
}

/**
 * Component to track global game progress and state.
 */
export interface FlappyBirdState extends Component {
  type: "FlappyState";
  score: number;
  isGameOver: boolean;
  highScore: number;
  pipeSpawnTimer: number;
  gameOverLogged: boolean;
}

/**
 * Null Object for FlappyBirdState.
 */
export const INITIAL_FLAPPY_STATE: FlappyBirdState = Object.freeze({
  type: "FlappyState",
  score: 0,
  isGameOver: false,
  highScore: 0,
  pipeSpawnTimer: 0,
  gameOverLogged: false,
});

/**
 * Global game configuration constants for Flappy Bird.
 */
export const FLAPPY_CONFIG = {
  SCREEN_WIDTH: 400,
  SCREEN_HEIGHT: 600,

  BIRD_X: 100,
  BIRD_START_Y: 300,
  BIRD_RADIUS: 15,

  GRAVITY: 800,
  FLAP_STRENGTH: -300,
  FLAP_COOLDOWN: 200,

  PIPE_WIDTH: 60,
  PIPE_SPEED: 150,
  PIPE_SPAWN_INTERVAL: 1500,
  GAP_SIZE: 140,

  GROUND_Y: 580,

  KEYS: {
    FLAP: "Space",
    PAUSE: "KeyP",
    RESTART: "KeyR",
  },
};
