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
        // Dynamic pitch based on velocity
        // Valor negativo = mira arriba (flap), Valor positivo = pica hacia abajo (caída)
        const rotation = Math.max(-0.5, Math.min(bird.velocityY * 0.005, 1.2));
        render.rotation = rotation;
      }
    });
  }
}
