import { World } from "./World";

/**
 * Standard phases for system execution.
 *
 * @remarks
 * Systems are executed in the following order:
 * 1. Input - Handling user or network input.
 * 2. Simulation - Physics and movement.
 * 3. Collision - Detection and resolution.
 * 4. GameRules - Score, lives, and logic.
 * 5. Presentation - Sound and preparation for rendering.
 */
export enum SystemPhase {
  Input = "Input",
  Simulation = "Simulation",
  Collision = "Collision",
  GameRules = "GameRules",
  Presentation = "Presentation",
}

/**
 * Configuration for registering a system.
 */
export interface SystemConfig {
  /** The phase in which the system should run. Defaults to {@link SystemPhase.Simulation}. */
  phase?: SystemPhase | string;
  /** Execution priority within the phase. Higher priority runs first. */
  priority?: number;
}

/**
 * Base class for all game systems in the ECS architecture.
 * Systems implement the game logic by processing entities that possess specific sets of components.
 *
 * @remarks
 * Systems should be stateless whenever possible, relying on the {@link World}'s components
 * or resources for state.
 */
export abstract class System {
  /**
   * Updates the system logic for a single frame.
   *
   * @param world - The ECS world containing entities and components.
   * @param deltaTime - The time elapsed since the last frame in milliseconds.
   *
   * @conceptualRisk [UNIT_CONSISTENCY] `deltaTime` is in milliseconds. Some physics calculations might expect seconds.
   */
  abstract update(world: World, deltaTime: number): void;
}
