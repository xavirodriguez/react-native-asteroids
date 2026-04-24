import { System } from "../../../engine/System";
import { World } from "../../../engine";
import { VelocityComponent, InputStateComponent } from "../../../engine/EngineTypes";
import { FlappyBirdInputComponent, BirdComponent, FLAPPY_CONFIG } from "../types/FlappyBirdTypes";
import { Juice } from "../../../engine/Juice";
import { hapticShoot } from "../../../utils/haptics";
import { InputBufferSystem } from "../../../engine/InputBufferSystem";
import { InputUtils } from "../../../engine/ComponentUtils";

/**
 * System that handles player input and bird flap mechanics.
 */
export class FlappyBirdInputSystem extends System {

  constructor(private config: typeof FLAPPY_CONFIG = FLAPPY_CONFIG) {
    super();
  }

  private isMultiplayer = false;

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public update(world: World, deltaTime: number): void {
    if (this.isMultiplayer) return;

    const inputState = world.getSingleton<InputStateComponent>("InputState");
    const flapRequested = inputState ? InputUtils.isPressed(inputState, "flap") : false;

    const entities = world.query("Bird", "FlappyInput", "Velocity");

    entities.forEach((entity) => {
      const input = world.getComponent<FlappyBirdInputComponent>(entity, "FlappyInput");
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
      const bird = world.getComponent<BirdComponent>(entity, "Bird");

      if (input && vel && bird && bird.isAlive) {
        // Sync input state
        input.flap = flapRequested;
        input.glide = flapRequested; // Using same button for now as per design

        if (input.flapCooldownRemaining > 0) {
          input.flapCooldownRemaining -= deltaTime;
        }

        // Apply flap
        if (input.flap) {
          InputBufferSystem.buffer(world, entity, "flap");
        }

        if (input.flapCooldownRemaining <= 0 && (input.flap || InputBufferSystem.consume(world, entity, "flap"))) {
          vel.dy = this.config.FLAP_STRENGTH;
          input.flapCooldownRemaining = this.config.FLAP_COOLDOWN;
          hapticShoot();

          // Juice: Squash al aletear
          Juice.squash(world, entity, 1.2, 0.8, 50);
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
