export interface PongState {
  scoreP1: number;
  scoreP2: number;
  isGameOver: boolean;
  winner?: number;
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
  PADDLE_WIDTH: 15,
  PADDLE_HEIGHT: 80,
  BALL_SIZE: 10,
  PADDLE_SPEED: 400,
  BALL_SPEED_START: 300,
  BALL_SPEED_INC: 1.05,
  WIN_SCORE: 5,
};
