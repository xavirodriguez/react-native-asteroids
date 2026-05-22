import { System } from "../core/System";
import { World } from "../core/World";
import {
  VirtualJoystickComponent,
  InputStateComponent,
  HapticRequestComponent,
} from "../core/CoreComponents";

/**
 * System that processes virtual joystick input entities.
 *
 * It calculates normalized axis values using radial deadzones and response curves,
 * then updates the global InputState singleton.
 */
export class JoystickSystem extends System {
  public update(world: World, _deltaTime: number): void {
    const inputState = world.getSingleton<InputStateComponent>("InputState");
    if (!inputState) return;

    const joysticks = world.query("VirtualJoystick");

    for (let i = 0; i < joysticks.length; i++) {
      const entity = joysticks[i];
      const joystick = world.getComponent<VirtualJoystickComponent>(entity, "VirtualJoystick")!;

      if (!joystick.active) {
        // Clear axes if inactive
        world.mutateSingleton<InputStateComponent>("InputState", (state) => {
          state.axes.set(joystick.horizontalAxis, 0);
          state.axes.set(joystick.verticalAxis, 0);
        });
        continue;
      }

      // Calculate relative displacement from origin
      const dx = joystick.currentX - joystick.originX;
      const dy = joystick.currentY - joystick.originY;

      const radius = joystick.radius || 1; // Avoid division by zero

      let nx = dx / radius;
      let ny = dy / radius;

      // Clamp to unit circle
      const mag = Math.sqrt(nx * nx + ny * ny);
      if (mag > 1) {
        nx /= mag;
        ny /= mag;
      }

      const currentMag = Math.sqrt(nx * nx + ny * ny);
      const inDeadzone = currentMag < joystick.deadzone;

      // Haptic Feedback on deadzone exit
      if (joystick._wasInDeadzone && !inDeadzone) {
        world.getCommandBuffer().createEntity((hapticEntity) => {
          world.getCommandBuffer().addComponent(hapticEntity, {
            type: "HapticRequest",
            pattern: "thrust", // Using thrust as proxy for light impact feedback
            intensity: 0.5
          } as HapticRequestComponent);
        });
      }

      world.mutateComponent<VirtualJoystickComponent>(entity, "VirtualJoystick", (j) => {
        j._wasInDeadzone = inDeadzone;
      });

      let finalX = 0;
      let finalY = 0;

      if (!inDeadzone) {
        // Rescale input to start from deadzone boundary for a smooth ramp
        const rescaledMag = (currentMag - joystick.deadzone) / (1 - joystick.deadzone);
        const ratio = rescaledMag / currentMag;
        let rx = nx * ratio;
        let ry = ny * ratio;

        // Apply response curves
        if (joystick.curveType === "squared") {
          finalX = Math.sign(rx) * (rx * rx);
          finalY = Math.sign(ry) * (ry * ry);
        } else {
          finalX = rx;
          finalY = ry;
        }

        finalX *= joystick.sensitivity;
        finalY *= joystick.sensitivity;
      }

      // Update Global Input State
      world.mutateSingleton<InputStateComponent>("InputState", (state) => {
        state.axes.set(joystick.horizontalAxis, finalX);
        state.axes.set(joystick.verticalAxis, finalY);
      });
    }
  }
}
