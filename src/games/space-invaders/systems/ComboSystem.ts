import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { GameStateComponent, GAME_CONFIG } from "../types/SpaceInvadersTypes";

/**
 * System that manages the combo and multiplier based on player actions.
 */
export class ComboSystem extends System {
  public update(world: World, deltaTime: number): void {
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState || gameState.isGameOver) return;

    if (gameState.comboTimerRemaining > 0) {
      gameState.comboTimerRemaining -= deltaTime;
      if (gameState.comboTimerRemaining <= 0) {
        // Reset combo if timer expires
        gameState.combo = 0;
        gameState.multiplier = 1;
      }
    }
  }

  /**
   * Helper to notify the system that a hit has occurred.
   */
  public static notifyHit(world: World): void {
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState) return;

    gameState.combo += 1;
    gameState.comboTimerRemaining = GAME_CONFIG.COMBO_TIMEOUT;

    // Recalcular multiplicador: cada 3 hits sube x1 (según prompt o similar a lo indicado)
    // El prompt decía floor(comboCount/3) + 1
    gameState.multiplier = Math.min(Math.floor(gameState.combo / 3) + 1, GAME_CONFIG.MAX_MULTIPLIER);
  }

  /**
   * Helper to notify a missed shot.
   */
  public static notifyMiss(world: World): void {
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState) return;

    gameState.combo = 0;
    gameState.multiplier = 1;
    gameState.comboTimerRemaining = 0;
  }
}
