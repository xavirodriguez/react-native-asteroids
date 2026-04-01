import { World } from "../../../engine/core/World";
import { RenderUpdateSystem } from "../../../engine/systems/RenderUpdateSystem";
import { RenderComponent } from "../../../engine/types/EngineTypes";
import { BirdComponent } from "../types/FlappyBirdTypes";

/**
 * System that handles specific render updates for Flappy Bird, like bird rotation.
 */
export class FlappyBirdRenderSystem extends RenderUpdateSystem {
  constructor() {
    super(8); // Set short trail length for the bird
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
        render.rotation = Math.atan2(bird.velocityY, 200) * 0.6;
      }
    });
  }
}
