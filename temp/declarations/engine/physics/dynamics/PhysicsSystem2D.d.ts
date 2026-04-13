import { System } from "../../core/System";
import { World } from "../../core/World";
/**
 * Built-in 2D Physics System for stable rigid body dynamics.
 * Handles integration and collision response (impulse-based).
 */
export declare class PhysicsSystem2D extends System {
    private gravityX;
    private gravityY;
    setGravity(x: number, y: number): void;
    update(world: World, deltaTime: number): void;
    private resolveCollision;
}
