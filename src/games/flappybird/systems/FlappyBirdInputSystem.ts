import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { InputManager } from "../../../engine/input/InputManager";
import { VelocityComponent } from "../../../engine/types/EngineTypes";
import { FlappyBirdInput, FlappyBirdInputComponent, BirdComponent, FLAPPY_CONFIG } from "../types/FlappyBirdTypes";
import { hapticShoot } from "../../../utils/haptics";

/**
 * System that handles player input and bird flap mechanics.
 */
export class FlappyBirdInputSystem extends System {
  private inputManager: InputManager<FlappyBirdInput>;

  constructor(inputManager: InputManager<FlappyBirdInput>, private config: typeof FLAPPY_CONFIG = FLAPPY_CONFIG) {
    super();
    this.inputManager = inputManager;
  }

  private isMultiplayer = false;

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public update(world: World, deltaTime: number): void {
    if (this.isMultiplayer) return;
    const inputs = this.inputManager.getCombinedInputs();
    const entities = world.query("Bird", "FlappyInput", "Velocity");

    entities.forEach((entity) => {
      const input = world.getComponent<FlappyBirdInputComponent>(entity, "FlappyInput");
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
      const bird = world.getComponent<BirdComponent>(entity, "Bird");

      if (input && vel && bird && bird.isAlive) {
        // Sync input state
        input.flap = inputs.flap;

        if (input.flapCooldownRemaining > 0) {
          input.flapCooldownRemaining -= deltaTime;
        }

        // Apply flap
        if (input.flap && input.flapCooldownRemaining <= 0) {
          vel.dy = this.config.FLAP_STRENGTH;
          input.flapCooldownRemaining = this.config.FLAP_COOLDOWN;
          hapticShoot();
        }

        // Apply gravity
        const dt = deltaTime / 1000;
        vel.dy += this.config.GRAVITY * dt;

        // Sync bird component velocityY
        bird.velocityY = vel.dy;
      }
    });
  }
}
