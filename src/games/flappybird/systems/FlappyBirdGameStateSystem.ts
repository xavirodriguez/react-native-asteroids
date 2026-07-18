import { World, BaseGame, TransformComponent } from "@tiny-aster/core";
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
import { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";

export class FlappyBirdGameStateSystem extends BaseGameStateSystem<FlappyBirdState, FlappyBirdComponentRegistry> implements IFlappyStateSystem {
  constructor(game: IFlappyBirdGame, private config: typeof FLAPPY_CONFIG = FLAPPY_CONFIG) {
    super("FlappyState");
  }

  protected updateGameState(world: World<FlappyBirdComponentRegistry>, gameState: FlappyBirdState, deltaTime: number): void {
    // Update Pipe Spawner
    world.mutateSingleton("FlappyState", (gs) => {
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
      world.mutateSingleton("FlappyState", (gs) => {
          gs.pipeSpawnTimer = 0;
      });
    }

    // Remove pipes that are off-screen and update score
    const pipes = world.query("Pipe", "Transform");
    pipes.forEach((entity) => {
      const pos = world.getComponent(entity, "Transform");
      const pipe = world.getComponent(entity, "Pipe");
      if (pos && pipe) {
        if (pos.x < -this.config.PIPE_WIDTH) {
          world.getCommandBuffer().removeEntity(entity);
        } else if (!pipe.scored && pos.x < this.config.BIRD_X) {
          world.mutateComponent(entity, "Pipe", p => {
             p.scored = true;
          });
          world.mutateSingleton("FlappyState", (gs) => {
              gs.score += gs.comboMultiplier || 1;
              if (gs.score > gs.highScore) {
                gs.highScore = gs.score;
              }
          });
          const eventBus = world.getResource<EventBus>("EventBus");
          if (eventBus) eventBus.emitDeferred("pipe:passed" as any, {} as any);
        }
      }
    });
  }

  protected getGameState(world: World<FlappyBirdComponentRegistry>): FlappyBirdState | undefined {
    return world.getSingleton("FlappyState");
  }

  protected evaluateGameOverCondition(state: FlappyBirdState): boolean {
    return state.isGameOver;
  }

  public isGameOver(): boolean {
    return this.getGameState(this._world as World<FlappyBirdComponentRegistry>)?.isGameOver ?? false;
  }

  public resetGameOverState(world?: World<FlappyBirdComponentRegistry>): void {
    const w = world || (this._world as World<FlappyBirdComponentRegistry>);
    if (w) {
        w.mutateSingleton("FlappyState", (state) => {
            state.gameOverLogged = false;
            state.isGameOver = false;
            state.score = 0;
            state.pipeSpawnTimer = 0;
        });
    }
  }
}
