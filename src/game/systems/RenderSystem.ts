import { System, type World } from "../ecs-world"
import { type GameStateComponent } from "../../types/GameTypes"

/**
 * System responsible for handling rendering logic updates (e.g., screen shake duration).
 * Note: Actual drawing is performed by the GameRenderer React component.
 */
export class RenderSystem extends System {
  /**
   * Updates rendering-related state.
   */
  public update(world: World, deltaTime: number): void {
    void deltaTime
    const gameStateEntity = world.query("GameState")[0]
    if (!gameStateEntity) return

    const gameState = world.getComponent<GameStateComponent>(gameStateEntity, "GameState")
    if (gameState?.screenShake && gameState.screenShake.duration > 0) {
      gameState.screenShake.duration--
      if (gameState.screenShake.duration <= 0) {
        gameState.screenShake = null
      }
    }
  }
}
