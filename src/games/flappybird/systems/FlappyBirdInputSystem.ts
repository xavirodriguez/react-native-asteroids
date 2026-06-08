import { System } from "@tiny-aster/core";
import { World } from "@tiny-aster/core";
import { VelocityComponent, InputStateComponent } from "@tiny-aster/core";
import { FlappyBirdInputComponent, BirdComponent, FLAPPY_CONFIG } from "../types/FlappyBirdTypes";
import { Juice } from "@tiny-aster/core";
import { hapticShoot } from "../../../utils/haptics";
import { InputBufferSystem } from "@tiny-aster/core";
import { InputUtils } from "@tiny-aster/core";

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
        let shouldFlap = false;

        // Sync input state & timers
        world.mutateComponent<FlappyBirdInputComponent>(entity, "FlappyInput", mutableInput => {
          mutableInput.flap = flapRequested;
          mutableInput.glide = flapRequested; // Using same button for now as per design

          if (mutableInput.flapCooldownRemaining > 0) {
            mutableInput.flapCooldownRemaining -= deltaTime;
          }

          // Apply flap buffer
          if (mutableInput.flap) {
            InputBufferSystem.buffer(world, entity, "flap");
          }

          if (mutableInput.flapCooldownRemaining <= 0 && (mutableInput.flap || InputBufferSystem.consume(world, entity, "flap"))) {
            shouldFlap = true;
            mutableInput.flapCooldownRemaining = this.config.FLAP_COOLDOWN;
          }
        });

        if (shouldFlap) {
          world.mutateComponent<VelocityComponent>(entity, "Velocity", mutableVel => {
            mutableVel.dy = this.config.FLAP_STRENGTH;
          });
          hapticShoot();
          // Juice: Squash al aletear
          Juice.squash(world, entity, 1.2, 0.8, 50);
        }

        // Apply gravity
        const dt = deltaTime / 1000;
        let nextVelY = 0;
        world.mutateComponent<VelocityComponent>(entity, "Velocity", v => {
          v.dy += (this.config.GRAVITY || FLAPPY_CONFIG.GRAVITY) * dt;
          nextVelY = v.dy;
        });

        // Sync bird component velocityY
        world.mutateComponent<BirdComponent>(entity, "Bird", b => {
          b.velocityY = nextVelY;
        });
      }
    });
  }
}
