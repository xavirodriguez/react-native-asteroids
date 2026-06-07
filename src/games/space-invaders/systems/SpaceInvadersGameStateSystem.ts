import { World } from "@tiny-aster/core";
import { GameStateComponent } from "../types/SpaceInvadersTypes";
import { spawnInvaderWave } from "../EntityFactory";
import { ISpaceInvadersGame } from "../types/GameInterfaces";
import { BaseGameStateSystem } from "@tiny-aster/core";

/**
 * System that manages the overall game state, level progression, and game over.
 */
export class SpaceInvadersGameStateSystem extends BaseGameStateSystem<GameStateComponent> {
  constructor(game: ISpaceInvadersGame) {
    super(game as unknown as import("../../../engine/core/BaseGame").BaseGame<Record<string, unknown>, Record<string, unknown>>);
  }

  protected updateGameState(world: World, gameState: GameStateComponent, deltaTime: number): void {
    // 1. Count remaining invaders
    const invaders = world.query("Invader");
    world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
        gs.invadersRemaining = invaders.length;
    });

    // 2. Handle level progression
    const bosses = world.query("Boss");
    if (gameState.invadersRemaining === 0 && bosses.length === 0) {
      world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
          gs.level++;
      });
      spawnInvaderWave(world, gameState.level);
    }

    // 3. Update screen shake duration
    if (gameState.screenShake) {
      world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
          if (gs.screenShake) {
              gs.screenShake.duration -= deltaTime;
              if (gs.screenShake.duration <= 0) {
                gs.screenShake = null;
              }
          }
      });
    }

    // 4. Update Combo Timer
    if (gameState.comboTimerRemaining > 0) {
      world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
          gs.comboTimerRemaining -= deltaTime;
          if (gs.comboTimerRemaining <= 0) {
            gs.combo = 0;
            gs.multiplier = 1;
          }
      });
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
    w.mutateSingleton<GameStateComponent>("GameState", (gameState) => {
        gameState.isGameOver = false;
        gameState.gameOverLogged = false;
        gameState.score = 0;
        gameState.level = 1;
        gameState.lives = 3;
        gameState.combo = 0;
        gameState.multiplier = 1;
        gameState.comboTimerRemaining = 0;
    });
  }
}
