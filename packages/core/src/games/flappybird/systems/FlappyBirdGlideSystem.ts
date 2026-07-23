import { System } from "../../../index";
import { World } from "../../../index";
import { RandomService } from "../../../index";
import { FLAPPY_CONFIG } from "../types/FlappyBirdTypes";
import { createEmitter } from "../../../index";

import { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";

export class FlappyBirdGlideSystem extends System<FlappyBirdComponentRegistry> {
  public update(world: World<FlappyBirdComponentRegistry>, deltaTime: number): void {
    const birds = world.query("Bird", "FlappyInput", "Transform", "Velocity");
    const dtSeconds = deltaTime / 1000;

    birds.forEach(entity => {
      const bird = world.getComponent(entity, "Bird")!;
      const input = world.getComponent(entity, "FlappyInput")!;
      const pos = world.getComponent(entity, "Transform")!;
      const vel = world.getComponent(entity, "Velocity")!;

      if (bird.nearMissTimer > 0) {
        world.mutateComponent(entity, "Bird", b => {
            b.nearMissTimer -= deltaTime;
        });
      }

      if (input.glide && vel.vy > 0 && bird.isAlive) {
        // Reducir la gravedad aplicada (ya aplicada por MovementSystem, así que aplicamos una fuerza ascendente contraria)
        // O mejor, el MovementSystem aplica vel += grav * dt.
        // Aquí podemos restar parte de esa gravedad.
        let nextVelY = 0;
        world.mutateComponent(entity, "Velocity", v => {
            v.vy -= FLAPPY_CONFIG.GRAVITY * 0.7 * dtSeconds;
            nextVelY = v.vy;
        });
        world.mutateComponent(entity, "Bird", b => {
            b.velocityY = nextVelY;
            b.isGliding = true;
        });

        const rng = world.getResource<RandomService>("render")!;
        if (rng.next() < 0.2) {
            createEmitter(world as any, {
                type: "glide",
                x: pos.x - 10,
                y: pos.y,
                rate: 0,
                burst: true,
                count: 1,
                color: ["#AADDFF"],
                size: [1, 2],
                speed: [10, 30],
                angle: [160, 200],
                lifetime: [0.2, 0.4],
                loop: false
            });
        }
      } else {
        world.mutateComponent(entity, "Bird", b => {
            b.isGliding = false;
        });
      }
    });
  }
}
