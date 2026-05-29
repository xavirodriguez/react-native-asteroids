import { World } from "./World";
import { ComponentRegistry, BlueprintRegistryMap } from "./Component";
import { EventRegistry } from "./EventBus";

/**
 * Standard phases for system execution order.
 *
 * @public
 *
 * @remarks
 * Systems are executed sequentially based on these phases.
 * See {@link BaseGame} for more details on the execution pipeline.
 *
 * Mutation Guidelines per Phase:
 * - `Input`: Intended for capturing external events. It is recommended to avoid
 *   mutating component data directly in this phase.
 * - `Simulation`: Main phase for gameplay logic and data mutation. Structural changes
 *   (creation/deletion) should be deferred via {@link WorldCommandBuffer} to help
 *   maintain iterator safety.
 * - `Collision`: Generally expects read-only access to spatial components for detection.
 * - `GameRules`: High-level state changes and logic resolution.
 * - `Transform`: Intended for world-space hierarchy resolution.
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
 *
 * @public
 */
export interface SystemConfig {
  phase?: SystemPhase | string;
  priority?: number;
}

/**
 * Abstract base class for all ECS Systems.
 *
 * @public
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
export abstract class System<
  TComponents extends ComponentRegistry = any,
  TEvents extends EventRegistry = any,
  TBlueprints extends BlueprintRegistryMap<TComponents> = any
> {
  public onRegister(_world: World<TComponents, TEvents, TBlueprints>): void {}

  public onUnregister(_world: World<TComponents, TEvents, TBlueprints>): void {}

  /**
   * Executes the system logic for the current simulation tick.
   *
   * @param world - The {@link World} instance the system operates on.
   * @param deltaTime - Elapsed time since last update in milliseconds.
   *
   * @remarks
   * Systems typically query relevant entities via {@link World.query} and apply
   * transformations to their components. To support reproducibility, it is
   * recommended to avoid non-serializable internal mutable state.
   *
   * @warning **Structural Mutations**: Modifying world structure (creating/removing entities
   * or components) while iterating over a query is restricted to help protect
   * iterator safety. Use {@link World.getCommandBuffer} to defer these operations
   * until the end of the tick.
   *
   * @warning **Asynchronous Logic**: Systems are intended to be synchronous. Using
   * `async/await` within `update` is not supported by the engine's core loop and
   * can lead to race conditions, broken simulation integrity, and unpredictable behavior.
   *
   * @remarks
   * World state is intended to be consistent at the start of the update cycle.
   */
  abstract update(world: World<TComponents, TEvents, TBlueprints>, deltaTime: number): void;

  public dispose(): void {}
}
