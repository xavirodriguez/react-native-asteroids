import { World } from "../../../engine/core/World";
import { PongState, PONG_CONFIG } from "../types";
import { BaseGameStateSystem } from "../../../engine/systems/BaseGameStateSystem";
import { TransformComponent, VelocityComponent } from "../../../engine/types/EngineTypes";
import { RandomService } from "../../../engine/utils/RandomService";

export class PongGameStateSystem extends BaseGameStateSystem<PongState> {
  private state: PongState = { scoreP1: 0, scoreP2: 0, isGameOver: false };

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
        } else if (pos.x > PONG_CONFIG.WIDTH) {
            state.scoreP1++;
            this.resetBall(pos, vel, "left");
        }

        if (state.scoreP1 >= PONG_CONFIG.WIN_SCORE) {
            state.isGameOver = true;
            state.winner = 1;
        } else if (state.scoreP2 >= PONG_CONFIG.WIN_SCORE) {
            state.isGameOver = true;
            state.winner = 2;
        }
    });

    // Update local state from singleton AFTER logic to reduce 1-frame lag
    this.state.scoreP1 = state.scoreP1;
    this.state.scoreP2 = state.scoreP2;
    this.state.isGameOver = state.isGameOver;
    this.state.winner = state.winner;
  }

  private resetBall(pos: TransformComponent, vel: VelocityComponent, direction: "left" | "right"): void {
    pos.x = PONG_CONFIG.WIDTH / 2;
    pos.y = PONG_CONFIG.HEIGHT / 2;
    vel.dx = direction === "right" ? -PONG_CONFIG.BALL_SPEED_START : PONG_CONFIG.BALL_SPEED_START;
    vel.dy = (RandomService.next() - 0.5) * PONG_CONFIG.BALL_SPEED_START;
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
