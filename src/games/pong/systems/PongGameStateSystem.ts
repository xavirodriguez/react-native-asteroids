import { World } from "../../../engine/core/World";
import { PongState, PONG_CONFIG } from "../types";
import { BaseGameStateSystem } from "../../../engine/systems/BaseGameStateSystem";
import { RandomService } from "../../../engine/utils/RandomService";
import { TransformComponent, VelocityComponent } from "../../../engine/types/EngineTypes";
import { EventBus } from "../../../engine/core/EventBus";

export class PongGameStateSystem extends BaseGameStateSystem<PongState> {

  constructor(private config: typeof PONG_CONFIG = PONG_CONFIG) {
    super();
  }

  protected updateGameState(world: World, state: PongState, deltaTime: number): void {
    void deltaTime;

    if (state.isGameOver) {
        return;
    }

    // Monitor ball position for scoring
    const balls = world.query("Ball", "Transform");
    balls.forEach(ballEntity => {
        const pos = world.getComponent<TransformComponent>(ballEntity, "Transform")!;
        const vel = world.getComponent<VelocityComponent>(ballEntity, "Velocity")!;

        if (pos.x < 0) {
            world.mutateSingleton<PongState>("PongState", (gs) => {
                gs.scoreP2++;
            });
            this.resetBall(world, ballEntity, pos, vel, "right");
        } else if (pos.x > this.config.WIDTH) {
            world.mutateSingleton<PongState>("PongState", (gs) => {
                gs.scoreP1++;
            });
            this.resetBall(world, ballEntity, pos, vel, "left");
        }

        const currentState = this.getGameState(world);
        if (currentState && currentState.scoreP1 >= this.config.WIN_SCORE) {
            world.mutateSingleton<PongState>("PongState", (gs) => {
                gs.isGameOver = true;
                gs.winner = 1;
            });
            const eventBus = world.getResource<EventBus>("EventBus");
            if (eventBus) {
                eventBus.emitDeferred("pong:set_won");
            }
        } else if (currentState && currentState.scoreP2 >= this.config.WIN_SCORE) {
            world.mutateSingleton<PongState>("PongState", (gs) => {
                gs.isGameOver = true;
                gs.winner = 2;
            });
        }
    });
  }

  private resetBall(world: World, entity: number, _pos: TransformComponent, _vel: VelocityComponent, direction: "left" | "right"): void {
    const gameplayRandom = RandomService.getInstance("gameplay");

    world.mutateComponent<TransformComponent>(entity, "Transform", pos => {
        pos.x = this.config.WIDTH / 2;
        pos.y = this.config.HEIGHT / 2;
    });

    world.mutateComponent<VelocityComponent>(entity, "Velocity", vel => {
        vel.dx = direction === "right" ? -this.config.BALL_SPEED_START : this.config.BALL_SPEED_START;
        vel.dy = (gameplayRandom.next() - 0.5) * this.config.BALL_SPEED_START;
    });
  }

  protected getGameState(world: World): PongState | undefined {
    return world.getSingleton<PongState>("PongState");
  }

  protected evaluateGameOverCondition(state: PongState): boolean {
    return state.isGameOver;
  }

  public resetGameOverState(world?: World): void {
    if (world) {
        world.mutateSingleton<PongState>("PongState", (state) => {
            state.isGameOver = false;
            state.scoreP1 = 0;
            state.scoreP2 = 0;
            state.winner = undefined;
            state.gameOverLogged = false;
        });
    }
  }
}
