import { System } from "../core/System";
import { World } from "../core/World";
import { StateMachineComponent } from "../types/EngineTypes";

/**
 * System that updates state machines for all entities with a StateMachineComponent.
 *
 * @responsibility Orchestrates the update cycle for entity-bound Finite State Machines.
 *
 * @conceptualRisk [OPAQUE_STATE] Internal FSM state is not stored directly in the ECS component,
 * which may break deterministic rollback or perfect world snapshots if the FSM is not externally serializable.
 *
 * @mutates {@link StateMachineComponent} - Delegates updates to the internal `fsm` instance.
 *
 * @dependsOn {@link StateMachineComponent}
 */
export class StateMachineSystem extends System {
  /**
   * Actualiza las máquinas de estado de las entidades.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   *
   * @precondition Las entidades deben poseer un {@link StateMachineComponent}.
   * @postcondition Se delega la actualización a la instancia interna de la FSM.
   */
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
