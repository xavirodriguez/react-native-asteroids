import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import {
  type InputComponent,
  type VelocityComponent,
  type RenderComponent,
  type TransformComponent,
  type InputState,
  type InputStateComponent,
  GAME_CONFIG,
} from "../../../engine/types/EngineTypes";
import { createBullet, createParticle } from "../EntityFactory";
import { hapticShoot } from "../../../utils/haptics";
import { BulletPool, ParticlePool } from "../EntityPool";
import { RandomService } from "../../../engine/utils/RandomService";
import { PhysicsUtils } from "../../../engine/utils/PhysicsUtils";
import { InputUtils } from "../../../engine/utils/ComponentUtils";

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
    private config: typeof GAME_CONFIG = GAME_CONFIG
  ) {
    super();
  }

  /**
   * Manually sets the input state. Useful for mobile touch controls.
   *
   * @param input - The new input state.
   * @deprecated Use world.getSingleton<InputStateComponent>("InputState") instead.
   */
  public setInput(_input: Partial<InputState>): void {
    // Legacy method, inputs handled by UnifiedInputSystem
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

  public update(world: World, deltaTime: number): void {
    if (this.isMultiplayer) return; // Inputs handled by React hook in multiplayer
    const ships = world.query("Ship", "Input");
    ships.forEach((entity) => {
      const input = world.getComponent<InputComponent>(entity, "Input");
      if (input) {
        this.updateShipInputState({ world, input });
      }
    });
  }

  private updateShipInputState(context: { world: World, input: InputComponent }): void {
    const { world, input } = context;
    const inputState = world.getSingleton<InputStateComponent>("InputState");
    if (inputState) {
      input.thrust = InputUtils.isPressed(inputState, "thrust");
      input.rotateLeft = InputUtils.isPressed(inputState, "rotateLeft");
      input.rotateRight = InputUtils.isPressed(inputState, "rotateRight");
      input.shoot = InputUtils.isPressed(inputState, "shoot");
      input.hyperspace = InputUtils.isPressed(inputState, "hyperspace");
    }
  }

}
