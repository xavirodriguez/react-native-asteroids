import { System } from "../../../engine/System";
import { World } from "../../../engine";
import { TransformComponent, VelocityComponent } from "../../../engine/EngineTypes";

export interface BallComponent {
  type: "Ball";
  spinFactor: number;
  spinDecay: number;
}

export interface PaddleComponent {
  type: "Paddle";
  side: "left" | "right";
  previousY: number;
  lastVelocityY: number;
}

export class PongSpinSystem extends System {
  public update(world: World, deltaTime: number): void {
    const balls = world.query("Ball", "Velocity");
    const dtSeconds = deltaTime / 1000;

    balls.forEach(entity => {
      const ball = world.getComponent<BallComponent>(entity, "Ball")!;
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;

      if (ball.spinFactor !== 0) {
        // Apply curve effect
        vel.dy += ball.spinFactor * 500 * dtSeconds;
        ball.spinFactor *= (1 - ball.spinDecay);

        if (Math.abs(ball.spinFactor) < 0.01) {
          ball.spinFactor = 0;
        }
      }
    });

    const paddles = world.query("Paddle", "Transform");
    paddles.forEach(entity => {
      const paddle = world.getComponent<PaddleComponent>(entity, "Paddle")!;
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;

      paddle.lastVelocityY = (pos.y - paddle.previousY) / dtSeconds;
      paddle.previousY = pos.y;
    });
  }
}
