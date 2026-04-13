import { System } from "../../core/System";
import { World } from "../../core/World";
import { IPhysicsAdapter } from "../../core/types/SystemTypes";
/**
 * PhysicsSystem: Orchestrates the physics simulation and syncs results to the ECS.
 */
export declare class PhysicsSystem implements System {
    private adapter;
    constructor(adapter: IPhysicsAdapter);
    update(world: World, deltaTime: number): void;
}
