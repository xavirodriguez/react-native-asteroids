import { System } from "../core/System";
import { World } from "../core/World";
import { StateMachineComponent } from "../types/EngineTypes";
import { StateMachineRegistry } from "../core/StateMachineRegistry";

/**
 * System that updates state machines for all entities with a StateMachineComponent.
 *
 * @responsibility Orchestrates the update cycle for entity-bound Finite State Machines.
 * @responsibility Decouples data (Component) from behavior (Registry).
 *
 * @mutates {@link StateMachineComponent}
 * @dependsOn {@link StateMachineComponent}
 */
export class StateMachineSystem extends System {
  /**
   * Actualiza las máquinas de estado de las entidades.
   */
  public update(world: World, deltaTime: number): void {
    const entities = world.query("StateMachine");
    const registry = StateMachineRegistry.getInstance();

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const fsmData = world.getComponent<StateMachineComponent>(entity, "StateMachine");
      if (!fsmData) continue;

      const definition = registry.getDefinition(fsmData.machineId);
      if (!definition) {
        if (__DEV__) console.warn(`[StateMachineSystem] Definition not found for machineId: ${fsmData.machineId}`);
        continue;
      }

      const currentStateLogic = definition.states[fsmData.currentState];

      // 1. Update Timer
      world.mutateComponent<StateMachineComponent>(entity, "StateMachine", (fsm) => {
        fsm.elapsedMs += deltaTime;
      });

      // 2. Execute onUpdate
      if (currentStateLogic?.onUpdate) {
        currentStateLogic.onUpdate(world, entity, fsmData.data, deltaTime);
      }
    }
  }

  /**
   * Utility to trigger a transition between states.
   */
  public static transition(world: World, entity: number, newState: string): void {
    const registry = StateMachineRegistry.getInstance();
    const fsmData = world.getComponent<StateMachineComponent>(entity, "StateMachine");
    if (!fsmData || fsmData.currentState === newState) return;

    const definition = registry.getDefinition(fsmData.machineId);
    if (!definition) return;

    const oldStateLogic = definition.states[fsmData.currentState];
    const newStateLogic = definition.states[newState];

    // Lifecycle: onExit -> change state -> onEnter
    if (oldStateLogic?.onExit) {
      oldStateLogic.onExit(world, entity, fsmData.data);
    }

    world.mutateComponent<StateMachineComponent>(entity, "StateMachine", (fsm) => {
      fsm.previousState = fsm.currentState;
      fsm.currentState = newState;
      fsm.elapsedMs = 0;
    });

    if (newStateLogic?.onEnter) {
      newStateLogic.onEnter(world, entity, fsmData.data);
    }
  }
}
