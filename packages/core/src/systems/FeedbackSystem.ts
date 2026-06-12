import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { HapticRequestComponent, CoreComponentRegistry } from "../ecs/CoreComponents";

export class FeedbackSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.isReSimulating) return;

    const query = world.getQuery("HapticRequest");
    query.forEach((entity) => {
      const haptic = world.getComponent(entity, "HapticRequest");
      if (haptic) {
        // Haptics.trigger(haptic.pattern); // Haptics utility seems to be missing or different
        world.getCommandBuffer().removeComponent(entity, "HapticRequest");
      }
    });
  }
}
