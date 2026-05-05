import { World } from "../../../engine/core/World";
import { GameStateComponent } from "../types/SpaceInvadersTypes";
import { spawnInvaderWave } from "../EntityFactory";
import { ISpaceInvadersGame } from "../types/GameInterfaces";
import { BaseGameStateSystem } from "../../../engine/systems/BaseGameStateSystem";

/**
 * System that manages the overall game state, level progression, and game over.
 */
export class SpaceInvadersGameStateSystem extends BaseGameStateSystem<GameStateComponent> {
  constructor(game: ISpaceInvadersGame) {
    super(game as any);
  }

  protected updateGameState(world: World, gameState: GameStateComponent, deltaTime: number): void {
    // 1. Count remaining invaders
    const invaders = world.query("Invader");
    gameState.invadersRemaining = invaders.length;

    // 2. Handle level progression
    const bosses = world.query("Boss");
    if (gameState.invadersRemaining === 0 && bosses.length === 0) {
      gameState.level++;
      spawnInvaderWave(world, gameState.level);
    }

    // 3. Update screen shake duration
    if (gameState.screenShake) {
      gameState.screenShake.duration -= deltaTime;
      if (gameState.screenShake.duration <= 0) {
        gameState.screenShake = null;
      }
    }

    // 4. Update Combo Timer
    if (gameState.comboTimerRemaining > 0) {
      gameState.comboTimerRemaining -= deltaTime;
      if (gameState.comboTimerRemaining <= 0) {
        gameState.combo = 0;
        gameState.multiplier = 1;
      }
    }
  }

  protected getGameState(world: World): GameStateComponent | undefined {
    return world.getSingleton<GameStateComponent>("GameState");
  }

  protected evaluateGameOverCondition(state: GameStateComponent): boolean {
    return state.isGameOver || state.lives <= 0;
  }

  public resetGameOverState(world?: World): void {
    const w = world || this._world;
    if (!w) return;
    const gameState = w.getSingleton<GameStateComponent>("GameState");
    if (!gameState) return;
    gameState.isGameOver = false;
    gameState.gameOverLogged = false;
    gameState.score = 0;
    gameState.level = 1;
    gameState.lives = 3;
    gameState.combo = 0;
    gameState.multiplier = 1;
    gameState.comboTimerRemaining = 0;
  }
}
