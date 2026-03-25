import { World } from "../../../engine/core/World";
import { RenderUpdateSystem } from "../../../engine/systems/RenderUpdateSystem";
import {
  type GameStateComponent,
  GAME_CONFIG,
} from "../../../types/GameTypes";

/**
 * System responsible for Asteroids-specific rendering logic (e.g., screen shake).
 */
export class AsteroidRenderSystem extends RenderUpdateSystem {
  constructor() {
    super(GAME_CONFIG.TRAIL_MAX_LENGTH);
  }

  /**
   * Updates rendering-related state.
   */
  public override update(world: World, deltaTime: number): void {
    super.update(world, deltaTime);
    this.updateScreenShake(world);
  }

  private updateScreenShake(world: World): void {
    const gameStateEntity = world.query("GameState")[0];
    if (!gameStateEntity) return;

    const gameState = world.getComponent<GameStateComponent>(gameStateEntity, "GameState");
    if (gameState?.screenShake && gameState.screenShake.duration > 0) {
      gameState.screenShake.duration--;
      if (gameState.screenShake.duration <= 0) {
        gameState.screenShake = null;
      }
    }
  }
}
