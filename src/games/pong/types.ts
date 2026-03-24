export interface PongState {
  scoreP1: number;
  scoreP2: number;
  isGameOver: boolean;
}

export interface PongInput extends Record<string, boolean> {
  p1Up: boolean;
  p1Down: boolean;
  p2Up: boolean;
  p2Down: boolean;
}

export const PONG_CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 60,
  BALL_SIZE: 10,
  PADDLE_SPEED: 250,
  BALL_SPEED: 300,
};
