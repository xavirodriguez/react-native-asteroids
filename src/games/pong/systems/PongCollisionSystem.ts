import { World } from "../../../engine/core/World";
import { System } from "../../../engine/core/System";
import { PositionComponent, VelocityComponent } from "../../../engine/types/EngineTypes";
import { PONG_CONFIG } from "../types";

export class PongCollisionSystem extends System {
  update(world: World, _deltaTime: number): void {
    const balls = world.query("Position", "Velocity", "Collider", "Render").filter(e => {
        const render = world.getComponent<any>(e, "Render");
        return render.shape === "circle";
    });

    balls.forEach(ball => {
      const pos = world.getComponent<PositionComponent>(ball, "Position")!;
      const vel = world.getComponent<VelocityComponent>(ball, "Velocity")!;

      // Wall bounce (Y axis)
      if (pos.y < 0 || pos.y > PONG_CONFIG.HEIGHT) {
        vel.dy *= -1;
      }

      // Logic for bouncing on paddles should go here (omitted for brevity)
    });
  }
}
