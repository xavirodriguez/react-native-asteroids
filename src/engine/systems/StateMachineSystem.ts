import { System } from "../core/System";
import { World } from "../core/World";
import { StateMachineComponent } from "../types/EngineTypes";

/**
 * System that updates state machines for all entities with a StateMachineComponent.
 */
export class StateMachineSystem extends System {
  public update(world: World, deltaTime: number): void {
    const entities = world.query("StateMachine");
    entities.forEach((entity) => {
      const fsmComp = world.getComponent<StateMachineComponent>(entity, "StateMachine");
      if (fsmComp && fsmComp.fsm) {
        fsmComp.fsm.update(deltaTime);
      }
    });
  }
}
