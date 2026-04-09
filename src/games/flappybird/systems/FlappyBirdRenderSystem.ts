import { World } from "../../../engine/core/World";
import { RenderUpdateSystem } from "../../../engine/systems/RenderUpdateSystem";
import { RenderComponent } from "../../../engine/types/EngineTypes";
import { BirdComponent } from "../types/FlappyBirdTypes";

/**
 * System that handles specific render updates for Flappy Bird, like bird rotation.
 */
export class FlappyBirdRenderSystem extends RenderUpdateSystem {
  constructor() {
    super(8); // Short trail length
  }

  public update(world: World, deltaTime: number): void {
    super.update(world, deltaTime);
    this.updateBirdRotation(world);
  }

  private updateBirdRotation(world: World): void {
    const birds = world.query("Bird", "Render");
    birds.forEach((entity) => {
      const bird = world.getComponent<BirdComponent>(entity, "Bird");
      const render = world.getComponent<RenderComponent>(entity, "Render");

      if (bird && render) {
        // Points up when moving up, points down when falling
        const targetRotation = Math.atan2(bird.velocityY, 200) * 0.8;

        // Framerate-independent lerp: 1 - exp(-speed * dt)
        const lerpSpeed = 10;
        const dtSeconds = deltaTime / 1000;
        const lerpFactor = 1 - Math.exp(-lerpSpeed * dtSeconds);

        render.rotation += (targetRotation - render.rotation) * lerpFactor;
      }
    });
  }
}
