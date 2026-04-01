import { World } from "../../engine/core/World";
import { FlappyBirdState, INITIAL_FLAPPY_STATE } from "./types/FlappyBirdTypes";

/**
 * Retrieves the global GameState entity from the world for Flappy Bird.
 */
export function getGameState(world: World): FlappyBirdState {
  const entities = world.query("FlappyState");
  if (entities.length === 0) {
    return { ...INITIAL_FLAPPY_STATE };
  }

  const gameState = world.getComponent<FlappyBirdState>(entities[0], "FlappyState");
  if (!gameState) {
    return { ...INITIAL_FLAPPY_STATE };
  }

  // Handle potential frozen state
  if (Object.isFrozen(gameState)) {
    const mutableState = { ...gameState };
    world.addComponent(entities[0], mutableState);
    return mutableState;
  }

  return gameState;
}
