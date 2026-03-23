import { World } from "../../engine/core/World";
import { MovementSystem } from "../../engine/systems/MovementSystem";
import { TTLSystem } from "../../engine/systems/TTLSystem";
import { AsteroidCollisionSystem } from "./systems/AsteroidCollisionSystem";
import { AsteroidGameStateSystem } from "./systems/AsteroidGameStateSystem";
import { AsteroidRenderSystem } from "./systems/AsteroidRenderSystem";
import { AsteroidInputSystem } from "./systems/AsteroidInputSystem";
import { createShip, spawnAsteroidWave, createGameState, clearEntityPools } from "./EntityFactory";
import { GAME_CONFIG } from "../../types/GameTypes";
import { InputManager } from "../../engine/input/InputManager";
import { KeyboardController, TouchController } from "../../engine/input/InputController";

/**
 * Initializes the Asteroids game on the engine.
 *
 * @param world - The ECS world instance.
 * @returns The initialized game state and controllers for external access.
 */
export function initAsteroids(world: World) {
  // Setup Input
  const inputManager = new InputManager();
  const touchController = new TouchController();

  inputManager.addController(new KeyboardController());
  inputManager.addController(touchController);

  const collisionSystem = new AsteroidCollisionSystem();

  // Add Systems
  world.addSystem(new AsteroidInputSystem(inputManager));
  world.addSystem(new MovementSystem(GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT));
  world.addSystem(collisionSystem);
  world.addSystem(new TTLSystem(collisionSystem)); // Connect TTL to pool via collision system
  world.addSystem(new AsteroidGameStateSystem());
  world.addSystem(new AsteroidRenderSystem());

  // Initial Entities
  createShip({ world, x: GAME_CONFIG.SCREEN_CENTER_X, y: GAME_CONFIG.SCREEN_CENTER_Y });
  createGameState({ world });
  spawnAsteroidWave({ world, count: GAME_CONFIG.INITIAL_ASTEROID_COUNT });

  return {
    inputManager,
    touchController,
    cleanup: () => {
      inputManager.cleanup();
      clearEntityPools(world);
    }
  };
}
