import { World } from "./World";

/**
 * Standard phases for system execution order.
 *
 * API status: Public
 *
 * @remarks
 * Systems are executed sequentially based on these phases.
 * See {@link BaseGame} for more details on the execution pipeline.
 *
 * Mutation Guidelines per Phase:
 * - `Input`: Intended for capturing external events. Ideally should NOT mutate component data directly.
 * - `Simulation`: Main phase for gameplay logic and data mutation. Structural changes (creation/deletion)
 *   SHOULD be deferred via {@link WorldCommandBuffer} to ensure iterator safety.
 * - `Collision`: Typically expects READ-ONLY access to spatial components.
 * - `GameRules`: High-level state changes and logic resolution.
 * - `Transform`: Designed for world-space hierarchy resolution.
 *
 * @public
 */
export enum SystemPhase {
  Input = "Input",
  Simulation = "Simulation",
  Collision = "Collision",
  GameRules = "GameRules",
  Transform = "Transform",
  Presentation = "Presentation",
}

/**
 * Configuration for registering a system within the {@link World}.
 */
export interface SystemConfig {
  /**
   * The phase in which the system should run.
   * Defaults to {@link SystemPhase.Simulation}.
   */
  phase?: SystemPhase | string;
  /**
   * Execution priority within the phase.
   * Higher priority runs earlier.
   */
  priority?: number;
}

/**
 * Abstract base class for all ECS Systems.
 *
 * API status: Public
 *
 * @remarks
 * Systems encapsulate game logic and behavior, typically operating on sets of
 * entities filtered via queries. While systems should primarily depend on
 * {@link World} state, they may maintain internal caches or coordination
 * state if required for performance or complex logic.
 *
 * Execution order is managed via {@link SystemPhase} and priorities.
 *
 * Example:
 * ```ts
 * class PhysicsSystem extends System {
 *   update(world: World, deltaTime: number) {
 *     const entities = world.query('Transform', 'Velocity');
 *     for (const entity of entities) {
 *       const transform = world.getComponent(entity, 'Transform');
 *       const velocity = world.getComponent(entity, 'Velocity');
 *       // Logic...
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export abstract class System {
  /**
   * Called when the system is registered in the World.
   * API status: Public
   *
   * @param world - The World instance where the system is being registered.
   */
  public onRegister(_world: World): void {}

  /**
   * Called when the system is removed from the World or the game is destroyed.
   * API status: Public
   *
   * @param world - The World instance where the system was registered.
   */
  public onUnregister(_world: World): void {}

  /**
   * Executes the system logic for the current simulation tick.
   *
   * @param world - The {@link World} instance the system operates on.
   * @param deltaTime - Elapsed time since last update in milliseconds.
   *
   * @remarks
   * Systems typically query relevant entities via {@link World.query} and apply
   * transformations to their components. To support reproducibility and rollbacks,
   * it is recommended to minimize the use of non-serializable internal mutable state.
   *
   * @warning **Structural Mutations**: Modifying world structure (creating/removing entities
   * or components) while iterating over a query is restricted as it may invalidate
   * iterators. Use {@link World.getCommandBuffer} to defer these operations until
   * the end of the tick.
   *
   * @warning **Asynchronous Logic**: Systems are expected to be synchronous. Using
   * `async/await` within `update` is not supported by the engine's core loop and
   * will likely lead to race conditions or broken simulation integrity.
   *
   * @precondition World state is expected to be consistent at the start of the update cycle.
   */
  abstract update(world: World, deltaTime: number): void;

  /**
   * Cleanup system resources when it's removed or the game is destroyed.
   * API status: Public
   */
  public dispose(): void {}
}
