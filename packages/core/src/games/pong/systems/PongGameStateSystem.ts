import { World } from "../../../index";
import { type PongState, type PongComponentRegistry } from "../types";
import { PongConfig } from "../types/PongConfigSchema";
import { BaseGameStateSystem } from "../../../index";
import { TransformComponent, VelocityComponent } from "../../../index";
import { EventBus } from "../../../index";

export class PongGameStateSystem extends BaseGameStateSystem<PongState, PongComponentRegistry> {
  private config?: PongConfig;

  constructor(config?: PongConfig) {
    super("PongState");
    this.config = config;
  }

  protected updateGameState(world: World<PongComponentRegistry>, state: PongState, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<PongConfig>("GameConfig")!;
    }
    void deltaTime;

    if (state.isGameOver) {
        return;
    }

    // Monitor ball position for scoring
    const balls = world.query("Ball", "Transform", "Velocity");
    balls.forEach(ballEntity => {
        const pos = world.getComponent(ballEntity, "Transform")!;
        const vel = world.getComponent(ballEntity, "Velocity")!;
        const ballSize = this.config!.BALL_SIZE;

        if (pos.x < -ballSize) {
            world.mutateSingleton("PongState", (gs: PongState) => {
                gs.scoreP2++;
            });
            this.resetBall(world, ballEntity, pos, vel, "right");
        } else if (pos.x > this.config!.WIDTH + ballSize) {
            world.mutateSingleton("PongState", (gs: PongState) => {
                gs.scoreP1++;
            });
            this.resetBall(world, ballEntity, pos, vel, "left");
        }

        const currentState = this.getGameState(world);
        if (currentState && currentState.scoreP1 >= this.config!.WIN_SCORE) {
            world.mutateSingleton("PongState", (gs: PongState) => {
                gs.isGameOver = true;
                gs.winner = 1;
            });
            const eventBus = world.getResource<EventBus>("EventBus");
            if (eventBus) {
                eventBus.emitDeferred("pong:set_won" as any, {} as any);
            }
        } else if (currentState && currentState.scoreP2 >= this.config!.WIN_SCORE) {
            world.mutateSingleton("PongState", (gs: PongState) => {
                gs.isGameOver = true;
                gs.winner = 2;
            });
        }
    });
  }

  private resetBall(world: World<PongComponentRegistry>, entity: number, _pos: TransformComponent, _vel: VelocityComponent, direction: "left" | "right"): void {
    const gameplayRandom = world.gameplayRandom;

    world.mutateComponent(entity, "Transform", (pos: TransformComponent) => {
        pos.x = this.config!.WIDTH / 2;
        pos.y = this.config!.HEIGHT / 2;
        pos.dirty = true;
    });

    world.mutateComponent(entity, "Velocity", (vel: VelocityComponent) => {
        vel.vx = direction === "right" ? -this.config!.BALL_SPEED_START : this.config!.BALL_SPEED_START;
        vel.vy = (gameplayRandom.next() - 0.5) * this.config!.BALL_SPEED_START;
    });
  }

  protected getGameState(world: World<PongComponentRegistry>): PongState | undefined {
    return world.getSingleton("PongState");
  }

  protected evaluateGameOverCondition(state: PongState): boolean {
    return state.isGameOver;
  }

  public resetGameOverState(world?: World<PongComponentRegistry>): void {
    if (world) {
        world.mutateSingleton("PongState", (state: PongState) => {
            state.isGameOver = false;
            state.scoreP1 = 0;
            state.scoreP2 = 0;
            state.winner = undefined;
            state.gameOverLogged = false;
        });
    }
  }

  public isGameOver(): boolean {
    if (!this._world) return false;
    const state = this.getGameState(this._world);
    return state ? state.isGameOver : false;
  }
}
