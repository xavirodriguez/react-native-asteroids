import { System, type World } from "../ecs-world"
import { type GameStateComponent, type RenderComponent } from "../../types/GameTypes"

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
    this.updateScreenShake(world);
    this.updateHitFlash(world);
  }

  private updateScreenShake(world: World): void {
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

  private updateHitFlash(world: World): void {
    const entities = world.query("Render");
    entities.forEach(entity => {
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (render && render.hitFlashFrames && render.hitFlashFrames > 0) {
        render.hitFlashFrames--;
      }
    });
  }
}
