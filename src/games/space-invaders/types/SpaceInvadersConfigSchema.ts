import { z } from "zod";
import { BaseConfigSchema } from "@tiny-aster/core";

/**
 * Space Invaders specific configuration schema.
 */
export const SpaceInvadersConfigSchema = BaseConfigSchema.extend({
  KEYS: z.object({
    LEFT: z.string(),
    RIGHT: z.string(),
    SHOOT: z.string(),
    PAUSE: z.string(),
    RESTART: z.string(),
  }),
  PLAYER_SPEED: z.number(),
  PLAYER_INITIAL_LIVES: z.number(),
  PLAYER_SHOOT_COOLDOWN: z.number(),
  PLAYER_RENDER_WIDTH: z.number(),
  PLAYER_COLLIDER_RADIUS: z.number(),
  PLAYER_BULLET_SPEED: z.number(),
  PLAYER_BULLET_SIZE: z.number(),
  PLAYER_BULLET_TTL: z.number(),
  ENEMY_BULLET_SPEED: z.number(),
  ENEMY_BULLET_SIZE: z.number(),
  ENEMY_BULLET_TTL: z.number(),
  ENEMY_FIRE_INTERVAL_MIN: z.number(),
  ENEMY_FIRE_INTERVAL_MAX: z.number(),
  INVADER_ROWS: z.number(),
  INVADER_COLS: z.number(),
  INVADER_SPACING_X: z.number(),
  INVADER_SPACING_Y: z.number(),
  INVADER_START_X: z.number(),
  INVADER_START_Y: z.number(),
  INVADER_SPEED_BASE: z.number(),
  INVADER_SPEED_MAX: z.number(),
  INVADER_DESCENT_STEP: z.number(),
  SHIELD_COUNT: z.number(),
  SHIELD_SEGMENTS_X: z.number(),
  SHIELD_SEGMENTS_Y: z.number(),
  SHIELD_START_X: z.number(),
  SHIELD_START_Y: z.number(),
  SHIELD_SPACING: z.number(),
  SHIELD_SEGMENT_SIZE: z.number(),
  SHIELD_SEGMENT_HP: z.number(),
  PARTICLE_COUNT: z.number(),
  PARTICLE_TTL_BASE: z.number(),
  COMBO_TIMEOUT: z.number(),
  MAX_MULTIPLIER: z.number(),
});

export type SpaceInvadersConfig = z.infer<typeof SpaceInvadersConfigSchema>;
