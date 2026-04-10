import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { BirdComponent, FLAPPY_CONFIG, FlappyBirdInputComponent } from "../types/FlappyBirdTypes";
import { createEmitter } from "../../../engine/systems/ParticleSystem";
import { TransformComponent } from "../../../engine/types/EngineTypes";

export class FlappyBirdGlideSystem extends System {
  public update(world: World, deltaTime: number): void {
    const birds = world.query("Bird", "FlappyInput", "Transform");
    const dtSeconds = deltaTime / 1000;

    birds.forEach(entity => {
      const bird = world.getComponent<BirdComponent>(entity, "Bird")!;
      const input = world.getComponent<FlappyBirdInputComponent>(entity, "FlappyInput")!;
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;

      if (bird.nearMissTimer > 0) {
        bird.nearMissTimer -= deltaTime;
      }

      if (input.glide && bird.velocityY > 0 && bird.isAlive) {
        // Reducir la gravedad aplicada (ya aplicada por MovementSystem, así que aplicamos una fuerza ascendente contraria)
        // O mejor, el MovementSystem aplica vel += grav * dt.
        // Aquí podemos restar parte de esa gravedad.
        bird.velocityY -= FLAPPY_CONFIG.GRAVITY * 0.7 * dtSeconds;
        bird.isGliding = true;

        if (Math.random() < 0.2) {
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
