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
import { BaseGameStateSystem } from "../../../engine/systems/BaseGameStateSystem";

/**
 * System that manages game logic: scores, spawner, and game over condition.
 */
export class FlappyBirdGameStateSystem extends BaseGameStateSystem<FlappyBirdState> implements IFlappyStateSystem {
  constructor(game: IFlappyBirdGame, private config: typeof FLAPPY_CONFIG = FLAPPY_CONFIG) {
    super(game as any);
  }

  protected updateGameState(world: World, gameState: FlappyBirdState, deltaTime: number): void {
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

  protected getGameState(world: World): FlappyBirdState | undefined {
    return world.getSingleton<FlappyBirdState>("FlappyState");
  }

  protected evaluateGameOverCondition(state: FlappyBirdState): boolean {
    // Note: The logic for setting isGameOver might be elsewhere or handled by collision
    return state.isGameOver;
  }
}
