import { World } from "../../engine/core/World";
import { type GameStateComponent, INITIAL_GAME_STATE } from "../../types/GameTypes";

/**
 * Utility functions for the Asteroids game.
 */

/**
 * Retrieves the global game state from the ECS world.
 *
 * @param world - The ECS world instance.
 * @returns The current {@link GameStateComponent} or {@link INITIAL_GAME_STATE} if not found.
 */
export function getGameState(world: World): GameStateComponent {
  const [gameStateEntity] = world.query("GameState");
  if (gameStateEntity === undefined) {
    return INITIAL_GAME_STATE;
  }
  return world.getComponent<GameStateComponent>(gameStateEntity, "GameState") ?? INITIAL_GAME_STATE;
}
