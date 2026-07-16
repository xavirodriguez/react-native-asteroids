import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";

/**
 * System that solves collision constraints.
 * @public
 */
export class PhysicsSolveSystem<TRegistry extends ComponentRegistry = ComponentRegistry> extends System<TRegistry> {
  public update(world: World<TRegistry>, _deltaTime: number): void {
    // Collision resolution and constraint solving logic
  }
}
