import { World } from "../../../engine/core/World";
import { CollisionSystem } from "../../../engine/systems/CollisionSystem";
import { Entity, TransformComponent, VelocityComponent, RenderComponent } from "../../../engine/types/EngineTypes";
import { PONG_CONFIG } from "../types";
import { JuiceSystem } from "../../../engine/systems/JuiceSystem";

export class PongCollisionSystem extends CollisionSystem {
  protected onCollision(world: World, entityA: Entity, entityB: Entity): void {
    const paddleBall = this.matchPair(world, entityA, entityB, "Paddle", "Ball");
    if (paddleBall) {
        const { Paddle: paddleEntity, Ball: ballEntity } = paddleBall;
        const ballPos = world.getComponent<TransformComponent>(ballEntity, "Transform")!;
        const ballVel = world.getComponent<VelocityComponent>(ballEntity, "Velocity")!;
        const paddlePos = world.getComponent<TransformComponent>(paddleEntity, "Transform")!;

        // Reverse ball direction on x-axis
        ballVel.dx *= -1;

        // Add some vertical influence based on where the ball hit the paddle
        // Normalize hit position from -1 (top) to 1 (bottom)
        const relativeHitY = (ballPos.y - paddlePos.y) / (PONG_CONFIG.PADDLE_HEIGHT / 2);

        // Map relativeHitY to a dy. Max angle should be around 45-60 degrees.
        ballVel.dy = relativeHitY * PONG_CONFIG.BALL_SPEED_START;

        // Increase speed slightly
        ballVel.dx *= PONG_CONFIG.BALL_SPEED_INC;
        ballVel.dy *= PONG_CONFIG.BALL_SPEED_INC;

        // Reposition ball to prevent multiple collisions
        const paddleSide = world.getComponent<any>(paddleEntity, "Paddle").side;
        if (paddleSide === "left") {
          ballPos.x = paddlePos.x + PONG_CONFIG.PADDLE_WIDTH / 2 + PONG_CONFIG.BALL_SIZE + 1;
        } else {
          ballPos.x = paddlePos.x - PONG_CONFIG.PADDLE_WIDTH / 2 - PONG_CONFIG.BALL_SIZE - 1;
        }

        // Juice: Squash de la bola
        JuiceSystem.add(world, ballEntity, {
          property: "scaleX",
          target: 0.6,
          duration: 50,
          easing: "easeOut",
          onComplete: (e) => {
            JuiceSystem.add(world, e, { property: "scaleX", target: 1, duration: 150, easing: "elasticOut" });
          }
        });
        JuiceSystem.add(world, ballEntity, {
          property: "scaleY",
          target: 1.4,
          duration: 50,
          easing: "easeOut",
          onComplete: (e) => {
            JuiceSystem.add(world, e, { property: "scaleY", target: 1, duration: 150, easing: "elasticOut" });
          }
        });

        // Juice: Recoil de la pala
        const recoilDir = paddleSide === "left" ? -1 : 1;
        const originalPaddleX = paddlePos.x;
        JuiceSystem.add(world, paddleEntity, {
          property: "x",
          target: originalPaddleX + (recoilDir * 10),
          duration: 50,
          easing: "easeOut",
          onComplete: (e) => {
            JuiceSystem.add(world, e, { property: "x", target: originalPaddleX, duration: 150, easing: "elasticOut" });
          }
        });

        // Juice: Hit flash
        const paddleRender = world.getComponent<RenderComponent>(paddleEntity, "Render");
        if (paddleRender) {
          paddleRender.hitFlashFrames = 5;
        }

        // Juice: Screen shake (pequeño)
        const gameStateEntity = world.query("GameState")[0];
        if (gameStateEntity !== undefined) {
          world.addComponent(gameStateEntity, {
            type: "ScreenShake",
            intensity: 3,
            duration: 100,
            remaining: 100
          });
        }
    }
  }

}
