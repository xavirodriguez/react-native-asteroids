import { World } from "./World";

/**
 * Standard phases for system execution order.
 *
 * @remarks
 * Systems are executed sequentially in this order:
 * 1. `Input` - Processing user or network input.
 * 2. `Simulation` - Physics integration, movement, and basic state logic.
 * 3. `Collision` - Detection and resolution of collisions.
 * 4. `GameRules` - High-level logic (scoring, health, win/loss conditions).
 * 5. `Transform` - Hierarchy propagation and world matrix calculation.
 * 6. `Presentation` - Audio, visual effects, and preparing data for the renderer.
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
 * @responsibility Encapsulate game logic in a decoupled manner.
 * @responsibility Transform world state based on time increments (ticks).
 * @responsibility Maintain pure simulation by operating only on components and resources.
 *
 * @remarks
 * Systems encapsulate logic and behavior. They typically operate on sets of
 * entities filtered via queries. While systems should mostly depend on
 * {@link World} state, they may maintain internal caches or coordination
 * state if required.
 *
 * Execution order is managed via {@link SystemPhase} and priorities.
 *
 * @example
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
   * Executes the system logic for the current simulation tick.
   *
   * @param world - The {@link World} instance the system operates on.
   * @param deltaTime - Elapsed time since last update in milliseconds.
   *
   * @remarks
   * Systems should query relevant entities via {@link World.query} and apply
   * transformations. To support reproducibility and rollbacks, minimize the
   * use of non-serializable internal mutable state.
   *
   * @warning **Structural Mutations**: Creating/removing entities or components
   * during query iteration can invalidate iterators. Use {@link World.getCommandBuffer}
   * to buffer these operations for the end of the tick.
   *
   * @precondition World state should be consistent at the start of the update cycle.
   * @postcondition Mutations should respect component contracts.
   * @sideEffect May create/remove entities, add/remove components, or emit events.
   *
   * @conceptualRisk [UNIT_CONSISTENCY][LOW] `deltaTime` is in milliseconds.
   * Physics integrations (e.g., velocity) typically expect seconds, requiring
   * division by 1000.
   */
  abstract update(world: World, deltaTime: number): void;
}
