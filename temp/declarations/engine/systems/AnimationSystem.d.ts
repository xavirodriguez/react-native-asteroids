import { System } from "../core/System";
import { World } from "../core/World";
/**
 * System that manages frame progression for entities with an AnimatorComponent.
 */
export declare class AnimationSystem extends System {
    update(world: World, deltaTime: number): void;
}
