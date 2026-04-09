import { System } from "../core/System";
import { World } from "../core/World";
import { Mutator } from "../../config/MutatorConfig";

/**
 * System to handle dynamic logic changes from active mutators.
 */
export class MutatorSystem extends System {
  constructor(private activeMutators: Mutator[]) {
    super();
  }

  public update(world: World, deltaTime: number): void {
    // Dynamic effects that cannot be solved with static config scaling
    // Example: Pong Ciego (Blind Pong)
    if (this.activeMutators.some(m => m.id === 'blind_pong')) {
      const balls = world.query("Ball", "Render");
      // Logic would go here to hide the ball based on ticks since last hit
      // (This requires monitoring collision events)
    }
  }
}
