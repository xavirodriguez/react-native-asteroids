/**
 * @packageDocumentation
 * Networked Input Controller interface.
 * Defines the contract for applying remote/synchronized inputs to the ECS World.
 */

import { World } from "../core/World";
import { InputFrame } from "../../multiplayer/NetTypes";

/**
 * Interface for a controller that can provide and apply networked inputs.
 *
 * @remarks
 * This interface bridges the gap between the network transport layer (which receives raw packets)
 * and the game logic (which updates entity state based on inputs).
 *
 * @template TInput - The structure of the input data being synchronized.
 *
 * @responsibility Translate networked {@link InputFrame} data into ECS component mutations.
 */
export interface NetworkController< _TInput extends Record<string, unknown>> {
  /**
   * Called by the simulation loop to apply inputs for a specific tick to the world.
   *
   * @param world - The ECS world to mutate.
   * @param tick - The simulation tick being processed.
   * @param inputs - A record of all inputs (local and remote) available for this tick.
   *
   * @remarks
   * The implementation is responsible for finding the correct entities (e.g., players)
   * and updating their state based on the provided input frames.
   *
   * @mutates Entity components based on inputs.
   */
  applyInputs(world: World, tick: number, inputs: Record<string, InputFrame | undefined>): void;
}
