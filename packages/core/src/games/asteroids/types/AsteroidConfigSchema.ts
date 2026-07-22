import { z } from "zod";
import { BaseConfigSchema } from "../../../config/BaseConfigSchema";

/** @public */
export const AsteroidConfigSchema = BaseConfigSchema.extend({
  SCREEN_WIDTH: z.number().default(800),
  SCREEN_HEIGHT: z.number().default(600),
  SCREEN_CENTER_X: z.number().default(400),
  SCREEN_CENTER_Y: z.number().default(300),
  INITIAL_ASTEROID_COUNT: z.number().default(5),
  TRAIL_MAX_LENGTH: z.number().default(10),
  SHIP_THRUST: z.number().default(150),
  FRICTION: z.number().default(0.99),
  SHIP_FRICTION: z.number().default(0.99),
  SHIP_ROTATION_SPEED: z.number().default(Math.PI),
  BULLET_TTL: z.number().default(2.0),
  SHIP_SHOOT_COOLDOWN: z.number().default(0.25),
  BULLET_SPEED: z.number().default(300)
});

/** @public */
export type AsteroidConfig = z.infer<typeof AsteroidConfigSchema>;
