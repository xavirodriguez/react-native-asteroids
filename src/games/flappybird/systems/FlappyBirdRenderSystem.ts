import { World } from "@tiny-aster/core";
import { RenderUpdateSystem } from "@tiny-aster/core";
import { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";

/**
 * System that handles specific render updates for Flappy Bird, like bird rotation.
 */
export class FlappyBirdRenderSystem extends RenderUpdateSystem {
  constructor() {
    super(); // No arguments expected
  }

  public override update(world: World<FlappyBirdComponentRegistry>, deltaTime: number): void {
    super.update(world, deltaTime);
    this.updateBirdRotation(world, deltaTime);
  }

  private updateBirdRotation(world: World<FlappyBirdComponentRegistry>, deltaTime: number): void {
    const birds = world.query("Bird", "Render");
    for (let i = 0; i < birds.length; i++) {
      const entity = birds[i];
      const bird = world.getComponent(entity, "Bird");
      const render = world.getComponent(entity, "Render");

      if (bird && render) {
        // Points up when moving up, points down when falling
        const targetRotation = Math.atan2(bird.velocityY, 200) * 0.8;

        // Framerate-independent lerp: 1 - exp(-speed * dt)
        const lerpSpeed = 10;
        const dtSeconds = deltaTime / 1000;
        const lerpFactor = 1 - Math.exp(-lerpSpeed * dtSeconds);

        world.mutateComponent(entity, "Render", r => {
          r.rotation += (targetRotation - r.rotation) * lerpFactor;
        });
      }
    }
  }
}
