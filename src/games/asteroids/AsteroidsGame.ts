import { World } from "../../engine/core/World";
import { GameLoop } from "../../engine/core/GameLoop";
import { MovementSystem } from "../../engine/systems/MovementSystem";
import { TTLSystem } from "../../engine/systems/TTLSystem";
import { AsteroidCollisionSystem as CollisionSystem } from "./systems/AsteroidCollisionSystem";
import { GameStateSystem } from "./systems/AsteroidGameStateSystem";
import { RenderSystem } from "./systems/AsteroidRenderSystem";
import { InputSystem } from "./systems/AsteroidInputSystem";
import { createShip, spawnAsteroidWave, createGameState } from "./EntityFactory";
import { GAME_CONFIG } from "../../types/GameTypes";

/**
 * Initializes the Asteroids game on the engine.
 */
export function initAsteroids(world: World) {
  // Add Systems
  world.addSystem(new InputSystem());
  world.addSystem(new MovementSystem(GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT));
  world.addSystem(new CollisionSystem());
  world.addSystem(new TTLSystem());
  world.addSystem(new GameStateSystem()); // Note: GameStateSystem might need gameInstance for pause, but we can refactor later
  world.addSystem(new RenderSystem());

  // Initial Entities
  createShip({ world, x: GAME_CONFIG.SCREEN_CENTER_X, y: GAME_CONFIG.SCREEN_CENTER_Y });
  createGameState({ world });
  spawnAsteroidWave({ world, count: GAME_CONFIG.INITIAL_ASTEROID_COUNT });

  return {
    // Return any game-specific API
  };
}
