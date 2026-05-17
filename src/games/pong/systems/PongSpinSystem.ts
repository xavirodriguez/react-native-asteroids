import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent, VelocityComponent } from "../../../engine/types/EngineTypes";
import { BallComponent, PaddleComponent } from "../types";

export class PongSpinSystem extends System {
  public update(world: World, deltaTime: number): void {
    const balls = world.query("Ball", "Velocity");
    const dtSeconds = deltaTime / 1000;

    balls.forEach(entity => {
      const ball = world.getComponent<BallComponent>(entity, "Ball")!;

      if (ball.spinFactor !== 0) {
        world.mutateComponent<VelocityComponent>(entity, "Velocity", vel => {
          // Apply curve effect
          vel.dy += ball.spinFactor * 500 * dtSeconds;
        });

        world.mutateComponent<BallComponent>(entity, "Ball", b => {
          b.spinFactor *= (1 - b.spinDecay);
          if (Math.abs(b.spinFactor) < 0.01) {
            b.spinFactor = 0;
          }
        });
      }
    });

    const paddles = world.query("Paddle", "Transform");
    paddles.forEach(entity => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;

      world.mutateComponent<PaddleComponent>(entity, "Paddle", paddle => {
        paddle.lastVelocityY = (pos.y - paddle.previousY) / dtSeconds;
        paddle.previousY = pos.y;
      });
    });
  }
}
