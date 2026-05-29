import { System } from "../core/System";
import { World } from "../core/World";
import { HapticRequestComponent } from "../core/CoreComponents";
import { hapticShoot, hapticDamage, hapticDeath, hapticHyperspace, hapticThrust } from "../../utils/haptics";

/**
 * System responsible for processing haptic feedback requests.
 *
 * @responsibility Consumes HapticRequestComponents and triggers the corresponding hardware feedback.
 * @remarks
 * This system should run in the Presentation phase to ensure feedback is triggered after
 * simulation logic has finished.
 */
export class FeedbackSystem extends System {
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
        hapticShoot();
        break;
      case "damage":
        hapticDamage();
        break;
      case "death":
        hapticDeath();
        break;
      case "hyperspace":
        hapticHyperspace();
        break;
      case "thrust":
        hapticThrust(true);
        break;
    }
  }
}
