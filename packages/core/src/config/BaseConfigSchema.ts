import { z } from "zod";

/**
 * Base configuration schema for all games.
 */
export const BaseConfigSchema = z.object({
  KEYS: z.object({
    PAUSE: z.string(),
    RESTART: z.string()
  }).optional(),
  ENEMY_SFX_ENABLED: z.boolean().optional()
});

export type BaseConfig = z.infer<typeof BaseConfigSchema>;
