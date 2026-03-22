import { System, type World } from "../ecs-world"
import { type GameStateComponent, NULL_SCREEN_SHAKE } from "../../types/GameTypes"

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
    this.updateScreenShake(gameState)
  }

  private updateScreenShake(gameState: GameStateComponent | undefined): void {
    if (gameState && gameState.screenShake.duration > 0) {
      gameState.screenShake.duration--
      this.handleScreenShakeEnd(gameState)
    }
  }

  private handleScreenShakeEnd(gameState: GameStateComponent): void {
    if (gameState.screenShake.duration <= 0) {
      gameState.screenShake = NULL_SCREEN_SHAKE
    }
  }
}
