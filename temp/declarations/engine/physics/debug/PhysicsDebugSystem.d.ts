import { System } from "../../core/System";
import { World } from "../../core/World";
/**
 * System that collects and processes debug information for physics rendering.
 * Facilitates visualization of colliders, normals, and contact points.
 */
export declare class PhysicsDebugSystem extends System {
    enabled: boolean;
    /**
     * Color configuration for different states
     */
    colors: {
        collider: string;
        trigger: string;
        contact: string;
        normal: string;
    };
    update(world: World, _deltaTime: number): void;
    private drawDebugShape;
    private drawContactPoints;
}
