import { World } from "../../../engine/core/World";
import { PongState } from "../types";
import { BaseGameStateSystem } from "../../../engine/systems/BaseGameStateSystem";

export class PongGameStateSystem extends BaseGameStateSystem<PongState> {
  private state: PongState = { scoreP1: 0, scoreP2: 0, isGameOver: false };

  protected updateGameState(world: World, state: PongState, deltaTime: number): void {
    void deltaTime;
    // The state parameter here is the singleton from the world
    this.state.scoreP1 = state.scoreP1;
    this.state.scoreP2 = state.scoreP2;
    this.state.isGameOver = state.isGameOver;
  }

  protected getGameState(world: World): PongState | undefined {
    return world.getSingleton<PongState>("PongState");
  }

  protected evaluateGameOverCondition(state: PongState): boolean {
    return state.isGameOver; // Pong logic currently sets this elsewhere or manually
  }

  public getState(): PongState {
    return this.state;
  }
}
