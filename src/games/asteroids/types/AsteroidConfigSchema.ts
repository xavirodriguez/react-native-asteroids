import { z } from "zod";
import { BaseConfigSchema } from "@tiny-aster/core";

/**
 * Asteroids specific configuration schema.
 */
export const AsteroidConfigSchema = BaseConfigSchema.extend({
  KEYS: z.object({
    THRUST: z.string(),
    ROTATE_LEFT: z.string(),
    ROTATE_RIGHT: z.string(),
    SHOOT: z.string(),
    HYPERSPACE: z.string(),
    PAUSE: z.string(),
    RESTART: z.string(),
  }),
  SHIP_THRUST: z.number(),
  SHIP_ROTATION_SPEED: z.number(),
  SHIP_INITIAL_LIVES: z.number(),
  SHIP_RENDER_SIZE: z.number(),
  SHIP_COLLIDER_RADIUS: z.number(),
  SHIP_FRICTION: z.number(),
  BULLET_SPEED: z.number(),
  BULLET_TTL: z.number(),
  BULLET_SHOOT_COOLDOWN: z.number(),
  BULLET_SIZE: z.number(),
  INVULNERABILITY_DURATION: z.number(),
  HYPERSPACE_DURATION: z.number(),
  HYPERSPACE_COOLDOWN: z.number(),
  UFO_SPEED: z.number(),
  UFO_SPAWN_CHANCE: z.number(),
  UFO_SIZE: z.number(),
  UFO_OSCILLATION_AMPLITUDE: z.number(),
  UFO_OSCILLATION_FREQUENCY: z.number(),
  INITIAL_ASTEROID_COUNT: z.number(),
  ASTEROIDS_PER_WAVE: z.number(),
  MAX_WAVE_ASTEROIDS: z.number(),
  WAVE_SPAWN_DISTANCE: z.number(),
  INITIAL_ASTEROID_SPAWN_RADIUS: z.number(),
  ASTEROID_RADII: z.object({
    large: z.number(),
    medium: z.number(),
    small: z.number(),
  }),
  ASTEROID_SPLIT_OFFSET_LARGE: z.number(),
  ASTEROID_SPLIT_OFFSET_MEDIUM: z.number(),
  ASTEROID_SCORE: z.number(),
  PARTICLE_COUNT: z.number(),
  PARTICLE_TTL_BASE: z.number(),
  PARTICLE_SPEED_BASE: z.number(),
  STAR_COUNT: z.number(),
  SHAKE_INTENSITY_IMPACT: z.number(),
  SHAKE_DURATION_IMPACT: z.number(),
  TRAIL_MAX_LENGTH: z.number(),
});

export type AsteroidConfig = z.infer<typeof AsteroidConfigSchema>;
