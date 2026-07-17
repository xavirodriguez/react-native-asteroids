import { World, BaseGame, BaseGameStateSystem } from "@tiny-aster/core";
import { GameStateComponent } from "../types/SpaceInvadersTypes";
import { spawnInvaderWave } from "../EntityFactory";
import { ISpaceInvadersGame } from "../types/GameInterfaces";

/**
 * System that manages the overall game state, level progression, and game over.
 */
export class SpaceInvadersGameStateSystem extends BaseGameStateSystem<GameStateComponent> {
  constructor(game: ISpaceInvadersGame) {
    super(game as unknown as BaseGame<Record<string, unknown>, Record<string, unknown>>);
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

    // Sync generic Combo component values with GameState component for rendering / backwards compatibility
    const comboEntity = world.query("GameState")[0];
    if (comboEntity !== undefined) {
      const comboComp = world.getComponent(comboEntity, "Combo" as any) as any;
      if (comboComp) {
        world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
          gs.combo = comboComp.combo;
          gs.multiplier = comboComp.multiplier;
          gs.comboTimerRemaining = comboComp.timerRemaining;
        });
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
