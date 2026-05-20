import { z } from "zod";
import { BaseConfigSchema } from "../../../engine/services/ConfigService";

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
