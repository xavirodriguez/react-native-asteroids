import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { VelocityComponent, InputStateComponent } from "../../../engine/types/EngineTypes";
import { FlappyBirdInputComponent, BirdComponent, FLAPPY_CONFIG } from "../types/FlappyBirdTypes";
import { Juice } from "../../../engine/utils/Juice";
import { hapticShoot } from "../../../utils/haptics";
import { InputBufferSystem } from "../../../engine/systems/InputBufferSystem";
import { InputUtils } from "../../../engine/utils/ComponentUtils";

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
        const mutableInput = world.getMutableComponent<FlappyBirdInputComponent>(entity, "FlappyInput")!;
        const mutableVel = world.getMutableComponent<VelocityComponent>(entity, "Velocity")!;
        const mutableBird = world.getMutableComponent<BirdComponent>(entity, "Bird")!;

        // Sync input state
        mutableInput.flap = flapRequested;
        mutableInput.glide = flapRequested; // Using same button for now as per design

        if (mutableInput.flapCooldownRemaining > 0) {
          mutableInput.flapCooldownRemaining -= deltaTime;
        }

        // Apply flap
        if (mutableInput.flap) {
          InputBufferSystem.buffer(world, entity, "flap");
        }

        if (mutableInput.flapCooldownRemaining <= 0 && (mutableInput.flap || InputBufferSystem.consume(world, entity, "flap"))) {
          mutableVel.dy = this.config.FLAP_STRENGTH;
          mutableInput.flapCooldownRemaining = this.config.FLAP_COOLDOWN;
          hapticShoot();

          // Juice: Squash al aletear
          Juice.squash(world, entity, 1.2, 0.8, 50);
        }

        // Apply gravity
        const dt = deltaTime / 1000;
        mutableVel.dy += (this.config.GRAVITY || FLAPPY_CONFIG.GRAVITY) * dt;

        // Sync bird component velocityY
        mutableBird.velocityY = mutableVel.dy;
      }
    });
  }
}
