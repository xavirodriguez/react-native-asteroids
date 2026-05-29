import { System } from "../core/System";
import { World } from "../core/World";
import { HapticRequestComponent, CoreComponentRegistry } from "../core/CoreComponents";
import { ComponentRegistry } from "../core/Component";
import { EventRegistry } from "../core/EventBus";

/**
 * System that processes haptic requests and clears them.
 */
export class FeedbackSystem<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = any
> extends System<TComponents, TEvents> {
  public update(world: World<TComponents, TEvents, any>, _deltaTime: number): void {
    const query = world.query("HapticRequest" as any);

    for (const entity of query) {
      const request = world.getComponent(entity, "HapticRequest" as any) as any as HapticRequestComponent;
      if (request) {
        // Here we would call a platform-specific haptics driver
        // For now, we just remove the request component
        world.getCommandBuffer().removeComponent(entity, "HapticRequest" as any);
      }
    }
  }
}
