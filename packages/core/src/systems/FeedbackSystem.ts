import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { HapticRequestComponent } from "../ecs/CoreComponents";
import { HapticsProvider, noopHapticsProvider } from "../utils/Haptics";

/**
 * System responsible for processing haptic feedback requests.
 *
 * @responsibility Consumes HapticRequestComponents and triggers the corresponding hardware feedback.
 * @remarks
 * This system should run in the Presentation phase to ensure feedback is triggered after
 * simulation logic has finished.
 */
export class FeedbackSystem extends System {
  constructor(private haptics: HapticsProvider = noopHapticsProvider) {
    super();
  }

  /**
   * Processes all pending haptic requests.
   */
  public update(world: World, _deltaTime: number): void {
    const query = world.getQuery("HapticRequest");
    const commands = world.getCommandBuffer();

    query.forEach((entity) => {
      const request = world.getComponent<HapticRequestComponent>(entity, "HapticRequest");
      if (!request) return;

      if (!world.isReSimulating) {
        this.triggerHaptic(request.pattern);
      }

      // Consume the request
      commands.removeComponent(entity, "HapticRequest");
    });
  }

  private triggerHaptic(pattern: HapticRequestComponent["pattern"]): void {
    switch (pattern) {
      case "shoot":
        this.haptics.hapticShoot();
        break;
      case "damage":
        this.haptics.hapticDamage();
        break;
      case "death":
        this.haptics.hapticDeath();
        break;
      case "hyperspace":
        this.haptics.hapticHyperspace();
        break;
      case "thrust":
        this.haptics.hapticThrust(true);
        break;
    }
  }
}
