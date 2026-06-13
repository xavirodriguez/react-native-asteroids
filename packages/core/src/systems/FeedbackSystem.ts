import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

export class FeedbackSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.isReSimulating) return;

    const entities = world.query("HapticRequest");
    for (const entity of entities) {
      const haptic = world.getComponent(entity, "HapticRequest");
      if (haptic) {
        // Driver-based haptics would be triggered here
        world.getCommandBuffer().removeComponent(entity, "HapticRequest");
      }
    }
  }
}
