import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { PositionComponent } from "../../../engine/types/EngineTypes";
import {
  PipeComponent,
  FLAPPY_CONFIG
} from "../types/FlappyBirdTypes";
import { IFlappyBirdGame, IFlappyStateSystem } from "../types/GameInterfaces";
import { getGameState } from "../GameUtils";
import { createPipe } from "../EntityFactory";
import { RandomService } from "../../../engine/utils/RandomService";

/**
 * System that manages game logic: scores, spawner, and game over condition.
 */
export class FlappyBirdGameStateSystem extends System implements IFlappyStateSystem {
  private gameOverLogged: boolean = false;
  private pipeSpawnTimer: number = 0;
  private gameInstance: IFlappyBirdGame;

  constructor(game: IFlappyBirdGame) {
    super();
    this.gameInstance = game;
  }

  public update(world: World, deltaTime: number): void {
    const gameState = getGameState(world);

    if (gameState.isGameOver) {
      if (!this.gameOverLogged) {
        this.gameOverLogged = true;
        this.gameInstance.pause();
      }
      return;
    }

    // Update Pipe Spawner
    this.pipeSpawnTimer += deltaTime;
    if (this.pipeSpawnTimer >= FLAPPY_CONFIG.PIPE_SPAWN_INTERVAL) {
      const margin = 100;
      const gapY = RandomService.nextInt(margin, FLAPPY_CONFIG.SCREEN_HEIGHT - margin);
      createPipe({
        world,
        x: FLAPPY_CONFIG.SCREEN_WIDTH + FLAPPY_CONFIG.PIPE_WIDTH,
        gapY,
      });
      this.pipeSpawnTimer = 0;
    }

    // Remove pipes that are off-screen and update score
    const pipes = world.query("Pipe", "Position");
    pipes.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      const pipe = world.getComponent<PipeComponent>(entity, "Pipe");
      if (pos && pipe) {
        if (pos.x < -FLAPPY_CONFIG.PIPE_WIDTH) {
          world.removeEntity(entity);
        } else if (!pipe.scored && pos.x < FLAPPY_CONFIG.BIRD_X) {
          pipe.scored = true;
          gameState.score++;
          if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
          }
        }
      }
    });
  }

  public isGameOver(): boolean {
    return this.gameOverLogged;
  }

  public resetGameOverState(): void {
    this.gameOverLogged = false;
    this.pipeSpawnTimer = 0;
  }
}
