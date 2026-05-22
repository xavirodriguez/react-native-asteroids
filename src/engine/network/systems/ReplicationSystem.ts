import { System } from "../../core/System";
import { World } from "../../core/World";
import { NetworkManager } from "../NetworkManager";

/**
 * ECS System that drives the NetworkManager update loop.
 * Registered in the Presentation phase.
 */
export class ReplicationSystem extends System {
    constructor(private manager: NetworkManager) {
        super();
    }

    public update(world: World, deltaTime: number): void {
        this.manager.update(world, deltaTime);
    }
}
