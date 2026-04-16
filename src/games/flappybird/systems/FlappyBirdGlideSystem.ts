import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { BirdComponent, FLAPPY_CONFIG, FlappyBirdInputComponent } from "../types/FlappyBirdTypes";
import { createEmitter } from "../../../engine/systems/ParticleSystem";
import { TransformComponent, VelocityComponent } from "../../../engine/types/EngineTypes";
import { RandomService } from "../../../engine/utils/RandomService";

export class FlappyBirdGlideSystem extends System {
  public update(world: World, deltaTime: number): void {
    const birds = world.query("Bird", "FlappyInput", "Transform", "Velocity");
    const dtSeconds = deltaTime / 1000;

    birds.forEach(entity => {
      const bird = world.getComponent<BirdComponent>(entity, "Bird")!;
      const input = world.getComponent<FlappyBirdInputComponent>(entity, "FlappyInput")!;
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;

      if (bird.nearMissTimer > 0) {
        bird.nearMissTimer -= deltaTime;
      }

      if (input.glide && vel.dy > 0 && bird.isAlive) {
        // Reducir la gravedad aplicada (ya aplicada por MovementSystem, así que aplicamos una fuerza ascendente contraria)
        // O mejor, el MovementSystem aplica vel += grav * dt.
        // Aquí podemos restar parte de esa gravedad.
        vel.dy -= FLAPPY_CONFIG.GRAVITY * 0.7 * dtSeconds;
        bird.velocityY = vel.dy;
        bird.isGliding = true;

        if (RandomService.getInstance("render").next() < 0.2) {
            createEmitter(world, {
                position: { x: pos.x - 10, y: pos.y },
                rate: 0,
                burst: 1,
                color: ["#AADDFF"],
                size: { min: 1, max: 2 },
                speed: { min: 10, max: 30 },
                angle: { min: 160, max: 200 },
                lifetime: { min: 0.2, max: 0.4 },
                loop: false
            });
        }
      } else {
        bird.isGliding = false;
      }
    });
  }
}
