import { z } from "zod";
import { BaseConfigSchema } from "../../../config/BaseConfigSchema";

export const AsteroidConfigSchema = BaseConfigSchema.extend({
  SCREEN_WIDTH: z.number().default(800),
  SCREEN_HEIGHT: z.number().default(600),
  SCREEN_CENTER_X: z.number().default(400),
  SCREEN_CENTER_Y: z.number().default(300),
  INITIAL_ASTEROID_COUNT: z.number().default(5),
  TRAIL_MAX_LENGTH: z.number().default(10)
});

export type AsteroidConfig = z.infer<typeof AsteroidConfigSchema>;
