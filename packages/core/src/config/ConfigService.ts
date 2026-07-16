import { z } from "zod";

/**
 * Service for loading and validating game configuration schemas.
 */
export class ConfigService {
  /**
   * Loads and validates a raw configuration object against a provided Zod schema.
   * If validation succeeds, returns the typed and potentially filled with Zod defaults configuration.
   * If validation fails, throws a descriptive error detailing the validation issues.
   *
   * @param gameId - The unique identifier of the game.
   * @param schema - The configuration schema (expected to be a ZodSchema).
   * @param rawConfig - The raw configuration object to validate.
   * @returns The validated and typed configuration.
   */
  public static load<T>(gameId: string, schema: unknown, rawConfig: unknown): T {
    if (schema && typeof schema === "object" && "safeParse" in schema) {
      const maybeSchema = schema as Record<string, unknown>;
      if (typeof maybeSchema.safeParse === "function") {
        const zodSchema = schema as z.ZodSchema;
        const result = zodSchema.safeParse(rawConfig);
        if (!result.success) {
          throw new Error(`Configuration validation failed for game "${gameId}": ${result.error.message}`);
        }
        return result.data as T;
      }
    }
    return rawConfig as T;
  }
}
