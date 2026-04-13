import { System } from "../core/System";
import { World } from "../core/World";
/**
 * System that updates state machines for all entities with a StateMachineComponent.
 */
export declare class StateMachineSystem extends System {
    update(world: World, deltaTime: number): void;
}
