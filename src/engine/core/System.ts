import { World } from "./World";

/**
 * Standard phases for system execution.
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
  phase?: SystemPhase | string;
  priority?: number;
}

/**
 * Base class for all game systems in the ECS architecture.
 * Systems implement the game logic by processing entities that possess specific sets of components.
 */
export abstract class System {
  /**
   * Updates the system logic for a single frame.
   *
   * @param world - The ECS world containing entities and components.
   * @param deltaTime - The time elapsed since the last frame in milliseconds.
   */
  abstract update(world: World, deltaTime: number): void;
}
