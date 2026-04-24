import { World } from "../../../engine";
import { PongState, PONG_CONFIG } from "../types";
import { BaseGameStateSystem } from "../../../engine/BaseGameStateSystem";
import { RandomService } from "../../../engine/RandomService";
import { TransformComponent, VelocityComponent } from "../../../engine/EngineTypes";
import { EventBus } from "../../../engine/EventBus";

export class PongGameStateSystem extends BaseGameStateSystem<PongState> {
  private state: PongState = { type: "PongState", scoreP1: 0, scoreP2: 0, isGameOver: false, comboMultiplier: 1 };

  constructor(private config: typeof PONG_CONFIG = PONG_CONFIG) {
    super();
  }

  protected updateGameState(world: World, state: PongState, deltaTime: number): void {
    void deltaTime;

    if (state.isGameOver) {
        this.state.scoreP1 = state.scoreP1;
        this.state.scoreP2 = state.scoreP2;
        this.state.isGameOver = state.isGameOver;
        this.state.winner = state.winner;
        return;
    }

    // Monitor ball position for scoring
    const balls = world.query("Ball", "Transform");
    balls.forEach(ballEntity => {
        const pos = world.getComponent<TransformComponent>(ballEntity, "Transform")!;
        const vel = world.getComponent<VelocityComponent>(ballEntity, "Velocity")!;

        if (pos.x < 0) {
            state.scoreP2++;
            this.resetBall(pos, vel, "right");
        } else if (pos.x > this.config.WIDTH) {
            state.scoreP1++;
            this.resetBall(pos, vel, "left");
        }

        if (state.scoreP1 >= this.config.WIN_SCORE) {
            state.isGameOver = true;
            state.winner = 1;
            const eventBus = world.getResource<EventBus>("EventBus");
            if (eventBus) {
                eventBus.emit("pong:set_won");
                eventBus.emit("game:over");
            }
        } else if (state.scoreP2 >= this.config.WIN_SCORE) {
            state.isGameOver = true;
            state.winner = 2;
            const eventBus = world.getResource<EventBus>("EventBus");
            if (eventBus) eventBus.emit("game:over");
        }
    });

    // Update local state from singleton AFTER logic to reduce 1-frame lag
    this.state.scoreP1 = state.scoreP1;
    this.state.scoreP2 = state.scoreP2;
    this.state.isGameOver = state.isGameOver;
    this.state.winner = state.winner;
  }

  private resetBall(pos: TransformComponent, vel: VelocityComponent, direction: "left" | "right"): void {
    pos.x = this.config.WIDTH / 2;
    pos.y = this.config.HEIGHT / 2;
    const gameplayRandom = RandomService.getInstance("gameplay");
    vel.dx = direction === "right" ? -this.config.BALL_SPEED_START : this.config.BALL_SPEED_START;
    vel.dy = (gameplayRandom.next() - 0.5) * this.config.BALL_SPEED_START;
  }

  protected getGameState(world: World): PongState | undefined {
    return world.getSingleton<PongState>("PongState");
  }

  protected evaluateGameOverCondition(state: PongState): boolean {
    return state.isGameOver;
  }

  public getState(): PongState {
    return this.state;
  }

  public resetGameOverState(world?: World): void {
    this.state.isGameOver = false;
    this.state.scoreP1 = 0;
    this.state.scoreP2 = 0;
    this.state.winner = undefined;

    if (world) {
        const state = world.getSingleton<PongState>("PongState");
        if (state) {
            state.isGameOver = false;
            state.scoreP1 = 0;
            state.scoreP2 = 0;
            state.winner = undefined;
        }
    }
  }
}
