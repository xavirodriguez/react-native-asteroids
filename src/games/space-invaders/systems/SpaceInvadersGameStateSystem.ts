import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { GameStateComponent } from "../types/SpaceInvadersTypes";
import { getGameState } from "../GameUtils";
import { spawnInvaderWave } from "../EntityFactory";
import { ISpaceInvadersGame } from "../types/GameInterfaces";

/**
 * System that manages the overall game state, level progression, and game over.
 */
export class SpaceInvadersGameStateSystem extends System {
  private game: ISpaceInvadersGame;

  constructor(game: ISpaceInvadersGame) {
    super();
    this.game = game;
  }

  public update(world: World, _deltaTime: number): void {
    const gameState = getGameState(world);

    if (gameState.isGameOver) {
      return;
    }

    // 1. Count remaining invaders
    const invaders = world.query("Invader");
    gameState.invadersRemaining = invaders.length;

    // 2. Handle level progression
    if (gameState.invadersRemaining === 0) {
      gameState.level += 1;
      spawnInvaderWave(world, gameState.level);
    }

    // 3. Update screen shake duration
    if (gameState.screenShake) {
      gameState.screenShake.duration -= 1;
      if (gameState.screenShake.duration <= 0) {
        gameState.screenShake = null;
      }
    }
  }

  public isGameOver(): boolean {
    const world = this.game.getWorld();
    const gameState = getGameState(world);
    return gameState.isGameOver;
  }

  public resetGameOverState(): void {
    const world = this.game.getWorld();
    const gameState = getGameState(world);
    gameState.isGameOver = false;
    gameState.score = 0;
    gameState.level = 1;
    gameState.lives = 3;
  }
}
