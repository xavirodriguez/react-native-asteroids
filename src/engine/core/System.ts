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
 * - `Input`: Intended for capturing external events. It is generally recommended NOT
 *   to mutate component data directly in this phase.
 * - `Simulation`: Main phase for gameplay logic and data mutation. Structural changes
 *   (creation/deletion) should be deferred via {@link WorldCommandBuffer} to help
 *   maintain iterator safety.
 * - `Collision`: Typically expects read-only access to spatial components for detection.
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

  abstract update(world: World<TComponents, TEvents, TBlueprints>, deltaTime: number): void;

  public dispose(): void {}
}
