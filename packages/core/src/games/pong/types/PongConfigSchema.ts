import { z } from "zod";
import { BaseConfigSchema } from "../../../config/BaseConfigSchema";

/**
 * Pong specific configuration schema.
 */
export const PongConfigSchema = BaseConfigSchema.extend({
  WIDTH: z.number(),
  HEIGHT: z.number(),
  PADDLE_WIDTH: z.number(),
  PADDLE_HEIGHT: z.number(),
  BALL_SIZE: z.number(),
  PADDLE_SPEED: z.number(),
  BALL_SPEED_START: z.number(),
  BALL_SPEED_INC: z.number(),
  WIN_SCORE: z.number(),
  BALL_INVISIBLE_AFTER_HIT_TICKS: z.number(),
});

export type PongConfig = z.infer<typeof PongConfigSchema>;

/**
 * Default Pong configuration for fallback.
 */
export const DEFAULT_PONG_CONFIG: PongConfig = {
  WIDTH: 800,
  HEIGHT: 600,
  PADDLE_WIDTH: 15,
  PADDLE_HEIGHT: 80,
  BALL_SIZE: 10,
  PADDLE_SPEED: 400,
  BALL_SPEED_START: 300,
  BALL_SPEED_INC: 1.05,
  WIN_SCORE: 11,
  BALL_INVISIBLE_AFTER_HIT_TICKS: 0,
  KEYS: {
    PAUSE: "Escape",
    RESTART: "KeyR"
  },
  ENEMY_SFX_ENABLED: true
};
