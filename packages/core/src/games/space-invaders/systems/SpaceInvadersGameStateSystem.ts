import { World, BaseGame, BaseGameStateSystem } from "../../../index";
import { GameStateComponent, SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { spawnInvaderWave } from "../EntityFactory";
import { ISpaceInvadersGame } from "../types/GameInterfaces";

/**
 * System that manages the overall game state, level progression, and game over.
 */
export class SpaceInvadersGameStateSystem extends BaseGameStateSystem<GameStateComponent, SpaceInvadersComponentRegistry> {
  constructor(game: ISpaceInvadersGame) {
    super("GameState");
  }

  protected updateGameState(world: World<SpaceInvadersComponentRegistry>, gameState: GameStateComponent, deltaTime: number): void {
    // 1. Count remaining invaders
    const invaders = world.query("Invader");
    world.mutateSingleton("GameState", (gs) => {
        gs.invadersRemaining = invaders.length;
    });

    // 2. Handle level progression
    const bosses = world.query("Boss");
    if (gameState.invadersRemaining === 0 && bosses.length === 0) {
      world.mutateSingleton("GameState", (gs) => {
          gs.level++;
      });
      spawnInvaderWave(world, gameState.level);
    }

    // 3. Update screen shake duration
    if (gameState.screenShake) {
      world.mutateSingleton("GameState", (gs) => {
          if (gs.screenShake) {
              gs.screenShake.duration -= deltaTime;
              if (gs.screenShake.duration <= 0) {
                gs.screenShake = null;
              }
          }
      });
    }

    // Decrement local combo timer and clear if expired, mutating GameState conditionally
    if (gameState.comboTimerRemaining > 0) {
      world.mutateSingleton("GameState", (gs) => {
        gs.comboTimerRemaining -= deltaTime;
        if (gs.comboTimerRemaining <= 0) {
          gs.comboTimerRemaining = 0;
          gs.combo = 0;
          gs.multiplier = 1;
        }
      });
    }
  }

  protected getGameState(world: World<SpaceInvadersComponentRegistry>): GameStateComponent | undefined {
    return world.getSingleton("GameState");
  }

  protected evaluateGameOverCondition(state: GameStateComponent): boolean {
    return state.isGameOver || state.lives <= 0;
  }

  public resetGameOverState(world?: World<SpaceInvadersComponentRegistry>): void {
    const w = world || (this._world as World<SpaceInvadersComponentRegistry>);
    if (!w) return;
    w.mutateSingleton("GameState", (gameState) => {
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
