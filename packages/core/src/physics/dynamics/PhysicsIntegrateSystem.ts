import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";

/**
 * System that integrates forces and velocities.
 * @public
 */
export class PhysicsIntegrateSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    // Basic Euler integration logic
  }
}
