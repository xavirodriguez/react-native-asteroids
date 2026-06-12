import { z } from "zod";

/**
 * Base engine configuration schema.
 * All games should extend or include these core properties.
 */
export const BaseConfigSchema = z.object({
  SCREEN_WIDTH: z.number().default(800),
  SCREEN_HEIGHT: z.number().default(600),
  SCREEN_CENTER_X: z.number().default(400),
  SCREEN_CENTER_Y: z.number().default(300),
  MAX_DELTA_TIME: z.number().default(100),
});

export type BaseConfig = z.infer<typeof BaseConfigSchema>;

/**
 * ConfigService handles loading and validation of game configurations.
 *
 * @responsibility Load configuration from dynamic sources.
 * @responsibility Validate configuration using Zod schemas.
 * @responsibility Cache configurations to prevent redundant parsing.
 */
export class ConfigService {
  private static cache = new Map<string, unknown>();

  /**
   * Loads and validates a configuration.
   *
   * @param id - Unique identifier for the config (e.g., 'asteroids').
   * @param schema - Zod schema to validate against.
   * @param data - Raw data to validate.
   * @returns Validated configuration.
   */
  public static load<T>(id: string, schema: z.ZodSchema<T>, data: unknown): T {
    try {
      const validated = schema.parse(data);
      this.cache.set(id, validated);
      return validated;
    } catch (error) {
      console.error(`[ConfigService] Validation failed for "${id}":`, error);
      throw error;
    }
  }

  /**
   * Retrieves a cached configuration.
   */
  public static get<T>(id: string): T | undefined {
    return this.cache.get(id) as T;
  }
}
