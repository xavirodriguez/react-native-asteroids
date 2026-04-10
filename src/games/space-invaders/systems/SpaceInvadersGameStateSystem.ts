import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { GameStateComponent } from "../types/SpaceInvadersTypes";
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

  public update(world: World, deltaTime: number): void {
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState) return;

    if (gameState.isGameOver) {
      return;
    }

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

  public isGameOver(): boolean {
    const world = this.game.getWorld();
    const entities = world.query("GameState");
    if (entities.length === 0) return false;
    const gameState = world.getComponent<GameStateComponent>(entities[0], "GameState");
    return gameState?.isGameOver || false;
  }

  public resetGameOverState(): void {
    const world = this.game.getWorld();
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (!gameState) return;
    gameState.isGameOver = false;
    gameState.score = 0;
    gameState.level = 1;
    gameState.lives = 3;
    gameState.combo = 0;
    gameState.multiplier = 1;
    gameState.comboTimerRemaining = 0;
  }
}
