import { World } from "../../../engine/core/World";
import { CollisionSystem } from "../../../engine/systems/CollisionSystem";
import { Entity, TransformComponent, VelocityComponent } from "../../../engine/types/EngineTypes";
import { PONG_CONFIG } from "../types";
import { Juice } from "../../../engine/utils/Juice";
import { createEmitter } from "../../../engine/systems/ParticleSystem";

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
        Juice.squash(world, ballEntity, 0.6, 1.4, 50);

        // Juice: Recoil de la pala
        const recoilDir = paddleSide === "left" ? -1 : 1;
        const originalPaddleX = paddlePos.x;
        Juice.add(world, paddleEntity, {
          property: "x",
          target: originalPaddleX + (recoilDir * 10),
          duration: 50,
          easing: "easeOut",
          onComplete: (e) => {
            Juice.add(world, e, { property: "x", target: originalPaddleX, duration: 150, easing: "elasticOut" });
          }
        });

        // Spin Logic
        const paddleComp = world.getComponent<any>(paddleEntity, "Paddle");
        const ballComp = world.getComponent<any>(ballEntity, "Ball");
        if (paddleComp && ballComp) {
          const spin = Math.max(-1, Math.min(1, paddleComp.lastVelocityY / 1000));
          if (Math.abs(spin) > 0.3) {
            ballComp.spinFactor = spin * 0.8;
            ballComp.spinDecay = 0.02;

            createEmitter(world, {
              position: { x: ballPos.x, y: ballPos.y },
              rate: 0, burst: 6,
              color: ["#FFFF00", "#88FFFF"],
              size: {min:1, max:3},
              speed: {min:40, max:100},
              angle: {min:0, max:360},
              lifetime: {min:0.1, max:0.3},
              loop: false
            });
          }

          // Charged Smash
          if (Math.abs(paddleComp.lastVelocityY) > 600) {
            const charge = Math.min(1, Math.abs(paddleComp.lastVelocityY) / 1000);
            ballVel.dx *= (1 + 0.2 * charge);
            Juice.shake(world, charge * 5, 100);

            const eventBus = world.getResource<EventBus>("EventBus");
            if (eventBus) eventBus.emit("pong:charged_smash", { chargeLevel: charge });
          }
        }

        // Juice: Hit flash
        Juice.flash(world, paddleEntity, 5);

        // Juice: Screen shake (pequeño)
        Juice.shake(world, 3, 100);
    }
  }

}
