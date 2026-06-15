import { System } from "../ecs/System";
import { World } from "../ecs/World";

/**
 * System designed to perform arbitrary mutations on entity components.
 *
 * @remarks
 * This system provides a general-purpose update hook. Care should be taken
 * when performing structural changes (adding/removing components or entities)
 * directly; use the {@link WorldCommandBuffer} for safer modifications.
 */
export class MutatorSystem extends System<any> {
  public update(world: World<any>, _deltaTime: number): void {
      // Mutator logic
  }
}
