import { System, World, TransformComponent, VelocityComponent } from "@tiny-aster/core";
import { BallComponent, PaddleComponent, PongComponentRegistry } from "../types";

export class PongSpinSystem extends System<PongComponentRegistry> {
  public update(world: World<PongComponentRegistry>, deltaTime: number): void {
    const balls = world.query("Ball", "Velocity");
    const dtSeconds = deltaTime / 1000;

    balls.forEach(entity => {
      const ball = world.getComponent(entity, "Ball")!;

      if (ball && ball.spinFactor !== 0) {
        world.mutateComponent(entity, "Velocity", (vel: VelocityComponent) => {
          // Apply curve effect
          vel.vy += ball.spinFactor * 500 * dtSeconds;
        });

        world.mutateComponent(entity, "Ball", (b: BallComponent) => {
          b.spinFactor *= (1 - b.spinDecay);
          if (Math.abs(b.spinFactor) < 0.01) {
            b.spinFactor = 0;
          }
        });
      }
    });

    const paddles = world.query("Paddle", "Transform");
    paddles.forEach(entity => {
      const pos = world.getComponent(entity, "Transform")!;

      world.mutateComponent(entity, "Paddle", (paddle: PaddleComponent) => {
        paddle.lastVelocityY = (pos.y - paddle.previousY) / dtSeconds;
        paddle.previousY = pos.y;
      });
    });
  }
}
