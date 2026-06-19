import { System } from "@tiny-aster/core";
import { World } from "@tiny-aster/core";
import { RandomService } from "@tiny-aster/core";
import { BirdComponent, FLAPPY_CONFIG, FlappyBirdInputComponent } from "../types/FlappyBirdTypes";
import { createEmitter } from "@tiny-aster/core";
import { TransformComponent, VelocityComponent } from "@tiny-aster/core";

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
        world.mutateComponent<BirdComponent>(entity, "Bird", b => {
            b.nearMissTimer -= deltaTime;
        });
      }

      if (input.glide && vel.dy > 0 && bird.isAlive) {
        // Reducir la gravedad aplicada (ya aplicada por MovementSystem, así que aplicamos una fuerza ascendente contraria)
        // O mejor, el MovementSystem aplica vel += grav * dt.
        // Aquí podemos restar parte de esa gravedad.
        let nextVelY = 0;
        world.mutateComponent<VelocityComponent>(entity, "Velocity", v => {
            v.dy -= FLAPPY_CONFIG.GRAVITY * 0.7 * dtSeconds;
            nextVelY = v.dy;
        });
        world.mutateComponent<BirdComponent>(entity, "Bird", b => {
            b.velocityY = nextVelY;
            b.isGliding = true;
        });

        const rng = world.getResource<RandomService>("render")!;
        if (rng.next() < 0.2) {
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
        world.mutateComponent<BirdComponent>(entity, "Bird", b => {
            b.isGliding = false;
        });
      }
    });
  }
}
