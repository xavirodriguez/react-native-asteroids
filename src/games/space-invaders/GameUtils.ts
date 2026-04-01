import { World } from "../../engine/core/World";
import { GameStateComponent, INITIAL_GAME_STATE } from "./types/SpaceInvadersTypes";

/**
 * Retrieves the global GameState entity from the world.
 * Returns INITIAL_GAME_STATE if not found.
 */
export function getGameState(world: World): GameStateComponent {
  const entities = world.query("GameState");
  if (entities.length === 0) {
    return INITIAL_GAME_STATE;
  }

  const gameState = world.getComponent<GameStateComponent>(entities[0], "GameState");
  if (!gameState) {
    return INITIAL_GAME_STATE;
  }

  // Handle potential frozen state
  if (Object.isFrozen(gameState)) {
    const mutableState = { ...gameState };
    world.addComponent(entities[0], mutableState);
    return mutableState;
  }

  return gameState;
}
