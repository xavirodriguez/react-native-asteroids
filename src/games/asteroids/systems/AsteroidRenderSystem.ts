import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import {
  type GameStateComponent,
  type PositionComponent,
  type RenderComponent,
  GAME_CONFIG,
} from "../../../types/GameTypes";

/**
 * System responsible for handling rendering logic updates (e.g., screen shake duration, trails).
 * Note: Actual drawing is performed by the GameRenderer React component.
 */
export class AsteroidRenderSystem extends System {
  /**
   * Updates rendering-related state.
   */
  public update(world: World, deltaTime: number): void {
    void deltaTime;
    this.updateScreenShake(world);
    this.updateTrails(world);

    // Force world version increment to trigger re-renders for animations
    world.version++;
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

  private updateTrails(world: World): void {
    const entities = world.query("Position", "Render");
    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      const render = world.getComponent<RenderComponent>(entity, "Render");

      if (pos && render && render.trailPositions) {
        render.trailPositions.push({ x: pos.x, y: pos.y });
        if (render.trailPositions.length > GAME_CONFIG.TRAIL_MAX_LENGTH) {
          render.trailPositions.shift();
        }
      }
    });
  }
}
