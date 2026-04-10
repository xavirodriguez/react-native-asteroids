import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { RenderComponent } from "../../../engine/types/EngineTypes";
import { SquashStretchComponent } from "../types";

export class PongJuiceSystem extends System {
  public update(world: World, deltaTime: number): void {
    const entities = world.query("SquashStretch", "Render");

    entities.forEach((entity) => {
      const squash = world.getComponent<SquashStretchComponent>(entity, "SquashStretch")!;
      const render = world.getComponent<RenderComponent>(entity, "Render")!;

      squash.timer -= 1; // Decrement by frame (could be time-based but prompt says frames)

      if (squash.timer <= 0) {
        world.removeComponent(entity, "SquashStretch");
        if (!render.data) render.data = {};
        render.data.scaleX = 1.0;
        render.data.scaleY = 1.0;
        return;
      }

      // Interpolar scaleX y scaleY de vuelta a 1.0 usando lerp
      const t = 1 - squash.timer / squash.duration;
      const currentScaleX = squash.scaleX + (1.0 - squash.scaleX) * t;
      const currentScaleY = squash.scaleY + (1.0 - squash.scaleY) * t;

      if (!render.data) render.data = {};
      render.data.scaleX = currentScaleX;
      render.data.scaleY = currentScaleY;
    });
  }
}
