import { World } from "@tiny-aster/core";
import { TransformComponent } from "@tiny-aster/core";
import {
  PipeComponent,
  FLAPPY_CONFIG,
  FlappyBirdState
} from "../types/FlappyBirdTypes";
import { IFlappyBirdGame, IFlappyStateSystem } from "../types/GameInterfaces";
import { createPipe } from "../EntityFactory";
import { EventBus } from "@tiny-aster/core";
import { BaseGameStateSystem } from "@tiny-aster/core";

/**
 * System that manages game logic: scores, spawner, and game over condition.
 */
export class FlappyBirdGameStateSystem extends BaseGameStateSystem<FlappyBirdState> implements IFlappyStateSystem {
  constructor(game: IFlappyBirdGame, private config: typeof FLAPPY_CONFIG = FLAPPY_CONFIG) {
    super(game as unknown as IFlappyBirdGame & import("@tiny-aster/core").BaseGame<unknown, Record<string, boolean>>);
  }

  protected updateGameState(world: World, gameState: FlappyBirdState, deltaTime: number): void {
    // Update Pipe Spawner
    world.mutateSingleton<FlappyBirdState>("FlappyState", (gs) => {
        gs.pipeSpawnTimer += deltaTime;
    });

    if (gameState.pipeSpawnTimer >= this.config.PIPE_SPAWN_INTERVAL) {
      const margin = 100;
      const gapY = world.gameplayRandom.nextInt(margin, this.config.SCREEN_HEIGHT - margin);
      createPipe({
        world,
        x: this.config.SCREEN_WIDTH + this.config.PIPE_WIDTH,
        gapY,
        deferred: true
      });
      world.mutateSingleton<FlappyBirdState>("FlappyState", (gs) => {
          gs.pipeSpawnTimer = 0;
      });
    }

    // Remove pipes that are off-screen and update score
    const pipes = world.query("Pipe", "Transform");
    pipes.forEach((entity) => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const pipe = world.getComponent<PipeComponent>(entity, "Pipe");
      if (pos && pipe) {
        if (pos.x < -this.config.PIPE_WIDTH) {
          world.getCommandBuffer().removeEntity(entity);
        } else if (!pipe.scored && pos.x < this.config.BIRD_X) {
          world.mutateComponent<PipeComponent>(entity, "Pipe", p => {
             p.scored = true;
          });
          world.mutateSingleton<FlappyBirdState>("FlappyState", (gs) => {
              gs.score += gs.comboMultiplier || 1;
              if (gs.score > gs.highScore) {
                gs.highScore = gs.score;
              }
          });
          const eventBus = world.getResource<EventBus>("EventBus");
          if (eventBus) eventBus.emitDeferred("pipe:passed");
        }
      }
    });
  }

  protected getGameState(world: World): FlappyBirdState | undefined {
    return world.getSingleton<FlappyBirdState>("FlappyState");
  }

  protected evaluateGameOverCondition(state: FlappyBirdState): boolean {
    return state.isGameOver;
  }

  public resetGameOverState(world?: World): void {
    const w = world || this._world;
    if (w) {
        w.mutateSingleton<FlappyBirdState>("FlappyState", (state) => {
            state.gameOverLogged = false;
            state.isGameOver = false;
            state.score = 0;
            state.pipeSpawnTimer = 0;
        });
    }
  }
}
