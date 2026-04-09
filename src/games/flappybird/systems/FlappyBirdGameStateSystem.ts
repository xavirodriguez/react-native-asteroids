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
  private gameInstance: IFlappyBirdGame;
  private _world: World | undefined;

  constructor(game: IFlappyBirdGame, private config: typeof FLAPPY_CONFIG = FLAPPY_CONFIG) {
    super();
    this.gameInstance = game;
  }

  public update(world: World, deltaTime: number): void {
    this._world = world;
    const gameState = world.getSingleton<FlappyBirdState>("FlappyState");
    if (!gameState) return;

    if (gameState.isGameOver) {
      if (!gameState.gameOverLogged) {
        gameState.gameOverLogged = true;
        this.gameInstance.pause();
        const eventBus = world.getResource<EventBus>("EventBus");
        if (eventBus) eventBus.emit("game:over");
      }
      return;
    }

    // Update Pipe Spawner
    gameState.pipeSpawnTimer += deltaTime;
    if (gameState.pipeSpawnTimer >= this.config.PIPE_SPAWN_INTERVAL) {
      const margin = 100;
      const gapY = RandomService.nextInt(margin, this.config.SCREEN_HEIGHT - margin);
      createPipe({
        world,
        x: this.config.SCREEN_WIDTH + this.config.PIPE_WIDTH,
        gapY,
      });
      gameState.pipeSpawnTimer = 0;
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

  public isGameOver(world?: World): boolean {
    const w = world || this._world;
    if (w) {
      const state = w.getSingleton<FlappyBirdState>("FlappyState");
      return state?.isGameOver || false;
    }
    return false;
  }

  public resetGameOverState(world?: World): void {
    const w = world || this._world;
    if (w) {
      const state = w.getSingleton<FlappyBirdState>("FlappyState");
      if (state) {
        state.isGameOver = false;
        state.gameOverLogged = false;
        state.pipeSpawnTimer = 0;
        state.score = 0;
      }
    }
  }
}
