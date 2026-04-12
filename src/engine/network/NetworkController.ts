import { World } from "../core/World";
import { InputFrame } from "../../multiplayer/NetTypes";

/**
 * Interface for a controller that can provide networked inputs.
 */
export interface NetworkController<_TInput extends Record<string, any>> {
  /**
   * Called to apply inputs for a specific tick to the world.
   */
  applyInputs(world: World, tick: number, inputs: Record<string, InputFrame | undefined>): void;
}
