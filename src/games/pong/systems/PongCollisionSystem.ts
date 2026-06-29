import { World, ComponentType } from "@tiny-aster/core";
import { System } from "@tiny-aster/core";
import { TransformComponent, VelocityComponent, CollisionEventsComponent } from "@tiny-aster/core";
import { PongConfig } from "../types/PongConfigSchema";
import { Juice } from "@tiny-aster/core";
import { createEmitter } from "@tiny-aster/core";
import { EventBus } from "@tiny-aster/core";
import { type PaddleComponent, type BallComponent, type PongComponentRegistry } from "../types";

export class PongCollisionSystem extends System<PongComponentRegistry> {
  private config?: PongConfig;

  constructor(config?: PongConfig) {
    super();
    this.config = config;
  }

  public update(world: World<PongComponentRegistry>, _deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<PongConfig>("GameConfig")!;
    }
    const entitiesWithEvents = world.query("CollisionEvents");

    for (const entity of entitiesWithEvents) {
      const eventsComp = world.getComponent(entity, "CollisionEvents")!;

      for (const event of eventsComp.collisions) {
        // Ensure each collision pair is processed only once
        if (entity > event.otherEntity) continue;
        this.resolveCollision(world, entity, event.otherEntity);
      }
    }
  }

  private resolveCollision(world: World<PongComponentRegistry>, entityA: number, entityB: number): void {
    const paddleBall = this.matchPair(world, entityA, entityB, "Paddle", "Ball");
    if (paddleBall) {
        const { Paddle: paddleEntity, Ball: ballEntity } = paddleBall;
        const ballPos = world.getComponent(ballEntity, "Transform")!;
        const paddlePos = world.getComponent(paddleEntity, "Transform")!;
        const paddleComp = world.getComponent(paddleEntity, "Paddle")!;

        world.mutateComponent(ballEntity, "Velocity", (ballVel: VelocityComponent) => {
            // Guard: Only reflect if moving towards the paddle's face
            // AND ensure it hasn't already passed the paddle's horizontal center line too far
            const isMovingTowardsPaddle = (paddleComp.side === "left" && ballVel.vx < 0) ||
                                          (paddleComp.side === "right" && ballVel.vx > 0);

            const isCorrectSide = (paddleComp.side === "left" && ballPos.x >= paddlePos.x) ||
                                  (paddleComp.side === "right" && ballPos.x <= paddlePos.x);

            if (isMovingTowardsPaddle && isCorrectSide) {
                // Reverse ball direction on x-axis
                ballVel.vx *= -1;

                // Add some vertical influence based on where the ball hit the paddle
                const relativeHitY = (ballPos.y - paddlePos.y) / (this.config!.PADDLE_HEIGHT / 2);
                ballVel.vy = relativeHitY * this.config!.BALL_SPEED_START;

                // Increase speed slightly
                ballVel.vx *= this.config!.BALL_SPEED_INC;
                ballVel.vy *= this.config!.BALL_SPEED_INC;

                // Clamp local speed to avoid sudden spikes
                const maxLocalSpeed = this.config!.BALL_SPEED_START * 3;
                const currentSpeedSq = ballVel.vx * ballVel.vx + ballVel.vy * ballVel.vy;
                if (currentSpeedSq > maxLocalSpeed * maxLocalSpeed) {
                  const scale = maxLocalSpeed / Math.sqrt(currentSpeedSq);
                  ballVel.vx *= scale;
                  ballVel.vy *= scale;
                }

                // Spin Logic & Charged Smash
                let charge = 0;
                let shouldCreateEmitter = false;
                const spin = Math.max(-1, Math.min(1, paddleComp.lastVelocityY / 1000));

                world.mutateComponent(ballEntity, "Ball", (ballComp: BallComponent) => {
                    if (Math.abs(spin) > 0.3) {
                      ballComp.spinFactor = spin * 0.8;
                      ballComp.spinDecay = 0.02;
                      shouldCreateEmitter = true;
                    }

                    if (Math.abs(paddleComp.lastVelocityY) > 600) {
                      charge = Math.min(1, Math.abs(paddleComp.lastVelocityY) / 1000);
                      const eventBus = world.getResource<EventBus>("EventBus");
                      if (eventBus) eventBus.emitDeferred("pong:charged_smash" as any, { chargeLevel: charge } as any);
                    }

                    // Ghost Ball Mutator
                    if (this.config!.BALL_INVISIBLE_AFTER_HIT_TICKS) {
                      ballComp.visibilityTimer = this.config!.BALL_INVISIBLE_AFTER_HIT_TICKS;
                    }
                });

                if (shouldCreateEmitter) {
                  createEmitter(world as any, {
                    position: { x: ballPos.x, y: ballPos.y },
                    rate: 0, burst: true,
                    color: ["#FFFF00", "#88FFFF"],
                    size: [1, 3],
                    speed: [40, 100],
                    angle: [0, 360],
                    lifetime: [0.1, 0.3],
                    loop: false,
                    count: 6,
                    type: "circle",
                    x: ballPos.x,
                    y: ballPos.y
                  });
                }

                if (charge > 0) {
                  ballVel.vx *= (1 + 0.2 * charge);
                  Juice.shake(world, charge * 5, 100);
                }
            }

        });

        // Reposition ball to prevent multiple collisions
        world.mutateComponent(ballEntity, "Transform", (bPos: TransformComponent) => {
            if (paddleComp.side === "left") {
              bPos.x = paddlePos.x + this.config!.PADDLE_WIDTH / 2 + this.config!.BALL_SIZE + 1;
            } else {
              bPos.x = paddlePos.x - this.config!.PADDLE_WIDTH / 2 - this.config!.BALL_SIZE - 1;
            }
            bPos.dirty = true;
        });

        // Juice
        Juice.squash(world, ballEntity, 0.6, 1.4, 50);

        const recoilDir = paddleComp.side === "left" ? -1 : 1;
        Juice.add(world, paddleEntity, {
          property: "x",
          target: recoilDir * 10,
          duration: 50,
          easing: "easeOut"
        });

        Juice.add(world, paddleEntity, {
          property: "x",
          target: 0,
          duration: 150,
          easing: "elasticOut",
          delay: 50
        });

        Juice.flash(world, paddleEntity, 5);
        Juice.shake(world, 3, 100);
    }
  }

  private matchPair<T1 extends ComponentType<PongComponentRegistry>, T2 extends ComponentType<PongComponentRegistry>>(
    world: World<PongComponentRegistry>,
    entityA: number,
    entityB: number,
    type1: T1,
    type2: T2
  ): Record<T1 | T2, number> | undefined {
    if (world.hasComponent(entityA, type1) && world.hasComponent(entityB, type2)) {
      return { [type1]: entityA, [type2]: entityB } as Record<T1 | T2, number>;
    }
    if (world.hasComponent(entityB, type1) && world.hasComponent(entityA, type2)) {
      return { [type1]: entityB, [type2]: entityA } as Record<T1 | T2, number>;
    }
    return undefined;
  }
}
