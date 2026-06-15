import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

export interface StateMachineDefinition {
  states: Record<string, StateDefinition>;
}

export interface StateDefinition {
  onUpdate?: (world: World<CoreComponentRegistry>, entity: number, data: any, elapsed: number) => string | void;
  onEnter?: (world: World<CoreComponentRegistry>, entity: number, data: any) => void;
  onExit?: (world: World<CoreComponentRegistry>, entity: number, data: any) => void;
}

/**
 * System that manages entity state machines.
 *
 * @remarks
 * This system updates the state of entities based on defined transitions and behaviors.
 * State definitions can include `onEnter`, `onUpdate`, and `onExit` hooks.
 *
 * Warning: State transitions and hook execution may involve complex logic.
 * Ensure that hooks do not perform unauthorized structural changes to the world
 * while the system is iterating over entities.
 */
export class StateMachineSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const entities = world.query("StateMachine");

    for (const entity of entities) {
      const sm = world.getComponent(entity, "StateMachine");
      if (!sm) continue;

      const registry = world.getResource<Record<string, StateMachineDefinition>>("StateMachineRegistry");
      const definition = registry ? registry[sm.machineId] : undefined;

      if (!definition) continue;

      const stateDef = definition.states[sm.currentState];

      world.mutateComponent(entity, "StateMachine", (comp) => {
        comp.elapsedMs += deltaTime;
      });

      if (stateDef?.onUpdate) {
        const nextState = stateDef.onUpdate(world, entity, sm.data, sm.elapsedMs);
        if (nextState && nextState !== sm.currentState) {
          this.transition(world, entity, nextState, definition);
        }
      }
    }
  }

  private transition(world: World<CoreComponentRegistry>, entity: number, nextState: string, definition: StateMachineDefinition): void {
    const sm = world.getComponent(entity, "StateMachine")!;
    const oldStateDef = definition.states[sm.currentState];
    const newStateDef = definition.states[nextState];

    if (oldStateDef?.onExit) {
      oldStateDef.onExit(world, entity, sm.data);
    }

    world.mutateComponent(entity, "StateMachine", (comp) => {
      comp.previousState = comp.currentState;
      comp.currentState = nextState;
      comp.elapsedMs = 0;
    });

    if (newStateDef?.onEnter) {
      newStateDef.onEnter(world, entity, sm.data);
    }
  }
}
