import { World } from "../../../engine/core/World";
import { System } from "../../../engine/core/System";
import { PongState } from "../types";

export class PongGameStateSystem extends System {
  private state: PongState = { scoreP1: 0, scoreP2: 0, isGameOver: false };

  update(world: World, _deltaTime: number): void {
    const states = world.query("PongState");
    if (states.length > 0) {
      const stateComp = world.getComponent<any>(states[0], "PongState")!;
      this.state.scoreP1 = stateComp.scoreP1;
      this.state.scoreP2 = stateComp.scoreP2;
      this.state.isGameOver = stateComp.isGameOver;
    }
  }

  public getState(): PongState {
    return this.state;
  }

  public isGameOver(): boolean {
    return this.state.isGameOver;
  }
}
