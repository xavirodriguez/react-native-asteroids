import { ConfigService } from "../src/config/ConfigService";
import { BaseConfigSchema, BaseConfig } from "../src/config/BaseConfigSchema";
import { AsteroidConfigSchema, AsteroidConfig } from "../src/games/asteroids/types/AsteroidConfigSchema";

describe("ConfigService", () => {
  it("should parse and validate a valid BaseConfig", () => {
    const rawConfig = {
      KEYS: {
        PAUSE: "KeyP",
        RESTART: "KeyR"
      },
      ENEMY_SFX_ENABLED: true
    };

    const config = ConfigService.load<BaseConfig>("test-game", BaseConfigSchema, rawConfig);
    expect(config.KEYS?.PAUSE).toBe("KeyP");
    expect(config.KEYS?.RESTART).toBe("KeyR");
    expect(config.ENEMY_SFX_ENABLED).toBe(true);
  });

  it("should automatically populate defaults for AsteroidConfigSchema when raw config is empty", () => {
    const rawConfig = {};
    const config = ConfigService.load<AsteroidConfig>("asteroids", AsteroidConfigSchema, rawConfig);

    expect(config.SCREEN_WIDTH).toBe(800);
    expect(config.SCREEN_HEIGHT).toBe(600);
    expect(config.SCREEN_CENTER_X).toBe(400);
    expect(config.SCREEN_CENTER_Y).toBe(300);
    expect(config.INITIAL_ASTEROID_COUNT).toBe(5);
    expect(config.TRAIL_MAX_LENGTH).toBe(10);
  });

  it("should fail validation with clear error message when invalid type is provided", () => {
    const rawConfig = {
      SCREEN_WIDTH: "eight hundred" // invalid type, should be number
    } as unknown;

    expect(() => {
      ConfigService.load<AsteroidConfig>("asteroids", AsteroidConfigSchema, rawConfig);
    }).toThrow(/Configuration validation failed for game "asteroids"/);
  });

  it("should gracefully pass through raw config when schema is not a Zod schema", () => {
    const rawConfig = { someField: 42 };
    const nonZodSchema = { foo: "bar" };

    const config = ConfigService.load<typeof rawConfig>("custom", nonZodSchema, rawConfig);
    expect(config).toEqual(rawConfig);
  });
});
