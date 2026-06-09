import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { StateMachineComponent } from "../ecs/CoreComponents";

/**
 * Interface for State Machine definitions.
 */
export interface StateMachineDefinition {
  states: Record<string, StateDefinition>;
}

export interface StateDefinition {
  onUpdate?: (world: World, entity: number, data: any, elapsed: number) => string | void;
  onEnter?: (world: World, entity: number, data: any) => void;
  onExit?: (world: World, entity: number, data: any) => void;
}

/**
 * System responsible for executing Finite State Machines.
 *
 * @remarks
 * State transitions are processed synchronously during the update.
 * Circular transitions within the same frame may lead to infinite loops
 * if not handled by the state definitions.
 */
export class StateMachineSystem extends System {
  /**
   * Updates all state machines in the world.
   */
  public update(world: World, deltaTime: number): void {
    const query = world.getQuery("StateMachine");

    query.forEach((entity) => {
      const sm = world.getComponent<StateMachineComponent>(entity, "StateMachine");
      if (!sm) return;

      const registry = world.getResource<Record<string, StateMachineDefinition>>("StateMachineRegistry");
      const definition = registry ? registry[sm.machineId] : undefined;

      if (!definition) {
        return;
      }

      const stateDef = definition.states[sm.currentState];

      world.mutateComponent<StateMachineComponent>(entity, "StateMachine", (comp) => {
        comp.elapsedMs += deltaTime;
      });

      if (stateDef?.onUpdate) {
        const nextState = stateDef.onUpdate(world, entity, sm.data, sm.elapsedMs);
        if (nextState && nextState !== sm.currentState) {
          this.transition(world, entity, nextState, definition);
        }
      }
    });
  }

  private transition(world: World, entity: number, nextState: string, definition: StateMachineDefinition): void {
    const sm = world.getComponent<StateMachineComponent>(entity, "StateMachine")!;
    const oldStateDef = definition.states[sm.currentState];
    const newStateDef = definition.states[nextState];

    if (oldStateDef?.onExit) {
      oldStateDef.onExit(world, entity, sm.data);
    }

    world.mutateComponent<StateMachineComponent>(entity, "StateMachine", (comp) => {
      comp.previousState = comp.currentState;
      comp.currentState = nextState;
      comp.elapsedMs = 0;
    });

    if (newStateDef?.onEnter) {
      newStateDef.onEnter(world, entity, sm.data);
    }
  }
}
