import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent } from "../../../engine/types/EngineTypes";
import {
  PipeComponent,
  FLAPPY_CONFIG,
  FlappyBirdState
} from "../types/FlappyBirdTypes";
import { IFlappyBirdGame, IFlappyStateSystem } from "../types/GameInterfaces";
import { createPipe } from "../EntityFactory";
import { RandomService } from "../../../engine/utils/RandomService";
import { EventBus } from "../../../engine/core/EventBus";

/**
 * System that manages game logic: scores, spawner, and game over condition.
 */
export class FlappyBirdGameStateSystem extends System implements IFlappyStateSystem {
  private gameOverLogged: boolean = false;
  private pipeSpawnTimer: number = 0;
  private gameInstance: IFlappyBirdGame;

  constructor(game: IFlappyBirdGame, private config: typeof FLAPPY_CONFIG = FLAPPY_CONFIG) {
    super();
    this.gameInstance = game;
  }

  public update(world: World, deltaTime: number): void {
    const gameState = world.getSingleton<FlappyBirdState>("FlappyState");
    if (!gameState) return;

    if (gameState.isGameOver) {
      if (!this.gameOverLogged) {
        this.gameOverLogged = true;
        this.gameInstance.pause();
        const eventBus = world.getResource<EventBus>("EventBus");
        if (eventBus) eventBus.emit("game:over");
      }
      return;
    }

    // Update Pipe Spawner
    this.pipeSpawnTimer += deltaTime;
    if (this.pipeSpawnTimer >= this.config.PIPE_SPAWN_INTERVAL) {
      const margin = 100;
      const gapY = RandomService.nextInt(margin, this.config.SCREEN_HEIGHT - margin);
      createPipe({
        world,
        x: this.config.SCREEN_WIDTH + this.config.PIPE_WIDTH,
        gapY,
      });
      this.pipeSpawnTimer = 0;
    }

    // Remove pipes that are off-screen and update score
    const pipes = world.query("Pipe", "Transform");
    pipes.forEach((entity) => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const pipe = world.getComponent<PipeComponent>(entity, "Pipe");
      if (pos && pipe) {
        if (pos.x < -this.config.PIPE_WIDTH) {
          world.removeEntity(entity);
        } else if (!pipe.scored && pos.x < this.config.BIRD_X) {
          pipe.scored = true;
          gameState.score++;
          const eventBus = world.getResource<EventBus>("EventBus");
          if (eventBus) eventBus.emit("pipe:passed");
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
