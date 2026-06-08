import { System } from "@tiny-aster/core";
import { World } from "@tiny-aster/core";
import { type InputStateComponent } from "@tiny-aster/core";
import { type InputComponent } from "../types/AsteroidTypes";
import { BulletPool, ParticlePool } from "../EntityPool";
import { InputUtils } from "@tiny-aster/core";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";

/**
 * System responsible for processing user input and applying it to the ship's state.
 *
 * @remarks
 * This system reads from the UnifiedInputSystem (via InputStateComponent)
 * and applies it to game entities.
 */
export class AsteroidInputSystem extends System {
  /**
   * Creates a new AsteroidInputSystem.
   *
   * @param bulletPool - The pool for creating bullets.
   * @param particlePool - The pool for creating particles.
   */
  constructor(
    private bulletPool: BulletPool,
    private particlePool: ParticlePool,
    private config?: AsteroidConfig
  ) {
    super();
  }


  /**
   * Updates ship rotation, velocity, and shooting based on current input state.
   *
   * @param world - The ECS world.
   * @param deltaTime - Time since last frame in milliseconds.
   */
  private isMultiplayer = false;

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public update(world: World, _deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<AsteroidConfig>("GameConfig")!;
    }
    if (this.isMultiplayer) return; // Inputs handled by React hook in multiplayer
    const inputState = world.getSingleton<InputStateComponent>("InputState");
    const ships = world.query("Ship", "Input");
    ships.forEach((entity) => {
      world.mutateComponent<InputComponent>(entity, "Input", (input) => {
        this.updateShipInputState({ input, inputState });
      });
    });
  }

  private updateShipInputState(context: { input: InputComponent, inputState?: import("../../../engine/core/CoreComponents").InputStateComponent | null }): void {
    const { input, inputState } = context;
    if (inputState) {
      // Direct action overrides
      input.thrust = InputUtils.isPressed(inputState, "thrust");
      input.rotateLeft = InputUtils.isPressed(inputState, "rotateLeft");
      input.rotateRight = InputUtils.isPressed(inputState, "rotateRight");
      input.shoot = InputUtils.isPressed(inputState, "shoot");
      input.hyperspace = InputUtils.isPressed(inputState, "hyperspace");

      // Axis support
      const horizontal = InputUtils.getAxis(inputState, "horizontal");
      const vertical = InputUtils.getAxis(inputState, "vertical");

      input.rotationAmount = horizontal;

      // When using the virtual joystick, JoystickSystem already processes deadzones.
      // We apply a small threshold here to map analog input to discrete flags (like thrust).
      if (horizontal < -0.15) input.rotateLeft = true;
      if (horizontal > 0.15) input.rotateRight = true;
      if (vertical < -0.15) input.thrust = true;

      // Ensure rotationAmount is set even if only buttons are used
      if (input.rotateLeft && Math.abs(input.rotationAmount) < 0.1) input.rotationAmount = -1;
      if (input.rotateRight && Math.abs(input.rotationAmount) < 0.1) input.rotationAmount = 1;
    }
  }

}
