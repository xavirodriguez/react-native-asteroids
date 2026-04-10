import { World } from "../../../engine/core/World";
import { CollisionSystem } from "../../../engine/systems/CollisionSystem";
import { Entity, TransformComponent, VelocityComponent, RenderComponent } from "../../../engine/types/EngineTypes";
import { PONG_CONFIG } from "../types";
import { Juice } from "../../../engine/utils/Juice";

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

        // Fase 2.2: Charged Shot
        const paddleVel = world.getComponent<VelocityComponent>(paddleEntity, "Velocity")!;
        const speed = Math.abs(paddleVel.dy);
        if (speed > PONG_CONFIG.CHARGE_THRESHOLD) {
          const chargeLevel = Math.min(speed / 10, 1);
          ballVel.dx *= (1 + 0.15 * chargeLevel);
          ballVel.dy += paddleVel.dy * 0.3;
          world.addComponent(ballEntity, { type: "ChargedShot", chargeLevel } as any);

          // Partículas de electricidad
          const { createEmitter } = require("../../../engine/systems/ParticleSystem");
          createEmitter(world, {
            position: { x: ballPos.x, y: ballPos.y },
            rate: 0,
            burst: 8,
            lifetime: { min: 0.2, max: 0.4 },
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            size: { min: 1, max: 2 },
            color: ["#FFFF00", "#88FFFF"],
            loop: false
          });
        }

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

        // Juice: Hit flash
        Juice.flash(world, paddleEntity, 5);

        // Juice: Screen shake (pequeño)
        Juice.shake(world, 3, 100);

        // Fase 1.3: Squash & Stretch
        world.addComponent(ballEntity, {
          type: "SquashStretch",
          scaleX: 1.4,
          scaleY: 0.6,
          timer: 8,
          duration: 8
        } as any);

        world.addComponent(paddleEntity, {
          type: "SquashStretch",
          scaleX: 0.85,
          scaleY: 1.15,
          timer: 6,
          duration: 6
        } as any);
    } else {
      // Wall collision or other
      const ballWall = this.matchPair(world, entityA, entityB, "Ball", "Boundary"); // Boundary doesn't have a component usually but let's assume check
      // For simplicity, we can just check if any ball is in the pair
      const ball = world.getComponent(entityA, "Ball") ? entityA : world.getComponent(entityB, "Ball") ? entityB : null;
      if (ball) {
        // Reset charged shot on wall hit? Prompt says "pared o otra pala"
        world.removeComponent(ball, "ChargedShot");
      }
    }
  }

}
