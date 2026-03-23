import { World } from "../../engine/core/World";
import { MovementSystem } from "../../engine/systems/generic/MovementSystem";
import { TTLSystem } from "../../engine/systems/generic/TTLSystem";
import { RenderSystem } from "../../engine/systems/generic/RenderSystem";
import { IRenderer } from "../../engine/rendering/IRenderer";
import { AsteroidCollisionSystem } from "./systems/AsteroidCollisionSystem";
import { AsteroidGameStateSystem } from "./systems/AsteroidGameStateSystem";
import { AsteroidInputSystem } from "./systems/AsteroidInputSystem";
import { createShip, spawnAsteroidWave, createGameState } from "./EntityFactory";
import { GAME_CONFIG } from "../../types/GameTypes";

/**
 * Initializes the Asteroids game on the engine.
 */
export function initAsteroids(world: World, renderer: IRenderer) {
  // Add Systems
  world.addSystem(new AsteroidInputSystem());
  world.addSystem(new MovementSystem(GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT));
  world.addSystem(new AsteroidCollisionSystem());
  world.addSystem(new TTLSystem());
  world.addSystem(new AsteroidGameStateSystem());
  world.addSystem(new RenderSystem(renderer));

  // Initial Entities
  createShip({ world, x: GAME_CONFIG.SCREEN_CENTER_X, y: GAME_CONFIG.SCREEN_CENTER_Y });
  createGameState({ world });
  spawnAsteroidWave({ world, count: GAME_CONFIG.INITIAL_ASTEROID_COUNT });

  return {
    // Return any game-specific API
  };
}
