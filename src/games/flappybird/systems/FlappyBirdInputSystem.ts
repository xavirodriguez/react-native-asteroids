import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { InputManager } from "../../../engine/input/InputManager";
import { VelocityComponent, TransformComponent } from "../../../engine/types/EngineTypes";
import { FlappyBirdInput, FlappyBirdInputComponent, BirdComponent, FLAPPY_CONFIG } from "../types/FlappyBirdTypes";
import { Juice } from "../../../engine/utils/Juice";
import { hapticShoot } from "../../../utils/haptics";

/**
 * System that handles player input and bird flap mechanics.
 */
export class FlappyBirdInputSystem extends System {
  private inputManager: InputManager<FlappyBirdInput>;

  constructor(inputManager: InputManager<FlappyBirdInput>) {
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
          vel.dy = FLAPPY_CONFIG.FLAP_STRENGTH;
          input.flapCooldownRemaining = FLAPPY_CONFIG.FLAP_COOLDOWN;
          hapticShoot();

          // Juice: Squash al aletear
          Juice.squash(world, entity, 1.2, 0.8, 50);
        }

        // Apply gravity
        const dt = deltaTime / 1000;
        vel.dy += FLAPPY_CONFIG.GRAVITY * dt;

        // Sync bird component velocityY
        bird.velocityY = vel.dy;
      }
    });
  }
}
