import { System } from "../core/System";
import { World } from "../core/World";
import {
  VirtualJoystickComponent,
  ProcessedJoystickComponent,
  InputStateComponent,
  HapticRequestComponent,
  MoveCommand,
  RotateCommand,
} from "../core/CoreComponents";
import { DEFAULT_JOYSTICK_CONFIG, JoystickConfig } from "../input/JoystickTypes";

/**
 * System that processes virtual joystick input entities with advanced mathematics.
 *
 * Implements radial deadzones, response curves (linear/quadratic), and
 * automatic command generation for the Command Pattern.
 */
export class JoystickSystem extends System {
  /** Epsilon for detecting "significant" changes in analog input. */
  private static readonly EPSILON = 0.001;

  public update(world: World, _deltaTime: number): void {
    const inputState = world.getSingleton<InputStateComponent>("InputState");
    if (!inputState) return;

    const joysticks = world.query("VirtualJoystick");

    for (let i = 0; i < joysticks.length; i++) {
      const entity = joysticks[i];
      const joystick = world.getComponent<VirtualJoystickComponent>(entity, "VirtualJoystick")!;

      // 1. Handle Inactive State
      if (!joystick.active) {
        this.clearJoystickInput(world, entity, joystick);
        continue;
      }

      // 2. Get Configuration (with fallback for backward compatibility)
      const config = joystick.config || {
        deadzone: joystick.deadzone ?? DEFAULT_JOYSTICK_CONFIG.deadzone,
        curveType: joystick.curveType ?? DEFAULT_JOYSTICK_CONFIG.curveType,
        curveExponent: DEFAULT_JOYSTICK_CONFIG.curveExponent,
        sensitivity: joystick.sensitivity ?? DEFAULT_JOYSTICK_CONFIG.sensitivity,
        normalizeOutput: DEFAULT_JOYSTICK_CONFIG.normalizeOutput,
      };

      // 3. Raw Input Calculation
      const dx = joystick.currentX - joystick.originX;
      const dy = joystick.currentY - joystick.originY;
      const radius = joystick.radius || 1;

      let nx = dx / radius;
      let ny = dy / radius;

      // 4. Process Input (Deadzone -> Curve -> Normalization)
      const processed = this.processJoystickInput(nx, ny, config);

      // 5. Haptic Feedback on Deadzone Exit
      if (joystick._wasInDeadzone && !processed.inDeadzone) {
        this.requestHaptic(world, "thrust", 0.5);
      }

      // 6. Update Internal State
      world.mutateComponent<VirtualJoystickComponent>(entity, "VirtualJoystick", (j) => {
        j._wasInDeadzone = processed.inDeadzone;
      });

      // 7. Update/Add Processed Component
      const hasProcessed = world.hasComponent(entity, "ProcessedJoystick");
      if (!hasProcessed) {
        world.getCommandBuffer().addComponent(entity, {
          type: "ProcessedJoystick",
          ...processed
        } as ProcessedJoystickComponent);
      } else {
        world.mutateComponent<ProcessedJoystickComponent>(entity, "ProcessedJoystick", (p) => {
          p.x = processed.x;
          p.y = processed.y;
          p.magnitude = processed.magnitude;
          p.inDeadzone = processed.inDeadzone;
        });
      }

      // 8. Update Global Input State (Axes)
      world.mutateSingleton<InputStateComponent>("InputState", (state) => {
        state.axes.set(joystick.horizontalAxis, processed.x);
        state.axes.set(joystick.verticalAxis, processed.y);
      });

      // 9. Command Pattern Generation
      if (joystick.joystickType) {
        this.handleCommandGeneration(world, entity, joystick.joystickType, processed);
      }
    }
  }

  /**
   * Clears all input-related components and axes when a joystick becomes inactive.
   */
  private clearJoystickInput(world: World, entity: number, joystick: VirtualJoystickComponent): void {
    world.mutateSingleton<InputStateComponent>("InputState", (state) => {
      state.axes.set(joystick.horizontalAxis, 0);
      state.axes.set(joystick.verticalAxis, 0);
    });

    if (world.hasComponent(entity, "ProcessedJoystick")) {
      world.mutateComponent<ProcessedJoystickComponent>(entity, "ProcessedJoystick", (p) => {
        p.x = 0; p.y = 0; p.magnitude = 0; p.inDeadzone = true;
      });
    }

    // Remove temporary commands if they exist
    if (world.hasComponent(entity, "MoveCommand")) {
      world.getCommandBuffer().removeComponent(entity, "MoveCommand");
    }
    if (world.hasComponent(entity, "RotateCommand")) {
      world.getCommandBuffer().removeComponent(entity, "RotateCommand");
    }
  }

  /**
   * Applies the full processing pipeline to raw joystick coordinates.
   */
  private processJoystickInput(nx: number, ny: number, config: JoystickConfig) {
    // Radial Deadzone
    let mag = Math.sqrt(nx * nx + ny * ny);
    const inDeadzone = mag < config.deadzone;

    if (inDeadzone) {
      return { x: 0, y: 0, magnitude: 0, inDeadzone: true };
    }

    // Clamp to unit circle
    if (mag > 1) {
      nx /= mag;
      ny /= mag;
      mag = 1;
    }

    // Scaled Radial Deadzone (smooth ramp from the edge of the deadzone)
    const rescaledMag = (mag - config.deadzone) / (1 - config.deadzone);
    const ratio = rescaledMag / mag;
    let rx = nx * ratio;
    let ry = ny * ratio;

    // Response Curves
    let finalX = this.applyResponseCurve(rx, config);
    let finalY = this.applyResponseCurve(ry, config);

    // Global Sensitivity
    finalX *= config.sensitivity;
    finalY *= config.sensitivity;

    // Optional Normalization
    let finalMag = Math.sqrt(finalX * finalX + finalY * finalY);
    if (config.normalizeOutput && finalMag > 1) {
      finalX /= finalMag;
      finalY /= finalMag;
      finalMag = 1;
    }

    return {
      x: finalX,
      y: finalY,
      magnitude: finalMag,
      inDeadzone: false
    };
  }

  /**
   * Applies the configured response curve to a single axis value.
   */
  private applyResponseCurve(value: number, config: JoystickConfig): number {
    if (config.curveType === "quadratic") {
      // Suggested formula: Math.sign(value) * Math.pow(Math.abs(value), exponent)
      return Math.sign(value) * Math.pow(Math.abs(value), config.curveExponent);
    }
    // Default: linear
    return value;
  }

  /**
   * Handles automatic generation of MoveCommand or RotateCommand based on joystick type.
   */
  private handleCommandGeneration(
    world: World,
    entity: number,
    type: string,
    processed: { x: number; y: number }
  ): void {
    const commands = world.getCommandBuffer();

    if (type === "movement") {
      const hasCmd = world.hasComponent(entity, "MoveCommand");
      if (hasCmd) {
        const current = world.getComponent<MoveCommand>(entity, "MoveCommand")!;
        if (Math.abs(current.x - processed.x) > JoystickSystem.EPSILON ||
            Math.abs(current.y - processed.y) > JoystickSystem.EPSILON) {
          world.mutateComponent<MoveCommand>(entity, "MoveCommand", (c) => {
            c.x = processed.x;
            c.y = processed.y;
          });
        }
      } else {
        commands.addComponent(entity, {
          type: "MoveCommand",
          x: processed.x,
          y: processed.y
        } as MoveCommand);
      }
    } else if (type === "rotation") {
      // For rotation joysticks, we typically care about the horizontal displacement (X)
      const hasCmd = world.hasComponent(entity, "RotateCommand");
      if (hasCmd) {
        const current = world.getComponent<RotateCommand>(entity, "RotateCommand")!;
        if (Math.abs(current.amount - processed.x) > JoystickSystem.EPSILON) {
          world.mutateComponent<RotateCommand>(entity, "RotateCommand", (c) => {
            c.amount = processed.x;
          });
        }
      } else {
        commands.addComponent(entity, {
          type: "RotateCommand",
          amount: processed.x
        } as RotateCommand);
      }
    }
  }

  private requestHaptic(world: World, pattern: "thrust", intensity: number): void {
    world.getCommandBuffer().createEntity((hapticEntity) => {
      world.getCommandBuffer().addComponent(hapticEntity, {
        type: "HapticRequest",
        pattern,
        intensity
      } as HapticRequestComponent);
    });
  }
}
