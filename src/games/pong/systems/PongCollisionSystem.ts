import { World } from "../../../engine/core/World";
import { System } from "../../../engine/core/System";
import { Entity, TransformComponent, VelocityComponent, CollisionEventsComponent } from "../../../engine/types/EngineTypes";
import { PongConfig } from "../types/PongConfigSchema";
import { Juice } from "../../../engine/utils/Juice";
import { createEmitter } from "../../../engine/systems/ParticleSystem";
import { EventBus } from "../../../engine/core/EventBus";
import { PaddleComponent } from "../types";

export class PongCollisionSystem extends System {
  private config?: PongConfig;

  constructor(config?: PongConfig) {
    super();
    this.config = config;
  }

  public update(world: World, _deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<PongConfig>("GameConfig")!;
    }
    const entitiesWithEvents = world.query("CollisionEvents");

    for (const entity of entitiesWithEvents) {
      const eventsComp = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents")!;

      for (const event of eventsComp.collisions) {
        // Ensure each collision pair is processed only once
        if (entity > event.otherEntity) continue;
        this.resolveCollision(world, entity, event.otherEntity);
      }
    }
  }

  private resolveCollision(world: World, entityA: Entity, entityB: Entity): void {
    const paddleBall = this.matchPair(world, entityA, entityB, "Paddle", "Ball");
    if (paddleBall) {
        const { Paddle: paddleEntity, Ball: ballEntity } = paddleBall;
        const ballPos = world.getComponent<TransformComponent>(ballEntity, "Transform")!;
        const paddlePos = world.getComponent<TransformComponent>(paddleEntity, "Transform")!;
        const paddleComp = world.getComponent<PaddleComponent>(paddleEntity, "Paddle")!;

        world.mutateComponent<VelocityComponent>(ballEntity, "Velocity", ballVel => {
            // Reverse ball direction on x-axis
            ballVel.dx *= -1;

            // Add some vertical influence based on where the ball hit the paddle
            const relativeHitY = (ballPos.y - paddlePos.y) / (this.config!.PADDLE_HEIGHT / 2);
            ballVel.dy = relativeHitY * this.config!.BALL_SPEED_START;

            // Increase speed slightly
            ballVel.dx *= this.config!.BALL_SPEED_INC;
            ballVel.dy *= this.config!.BALL_SPEED_INC;

            // Spin Logic & Charged Smash
            world.mutateComponent(ballEntity, "Ball", ballComp => {
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

                if (Math.abs(paddleComp.lastVelocityY) > 600) {
                  const charge = Math.min(1, Math.abs(paddleComp.lastVelocityY) / 1000);
                  ballVel.dx *= (1 + 0.2 * charge);
                  Juice.shake(world, charge * 5, 100);

                  const eventBus = world.getResource<EventBus>("EventBus");
                  if (eventBus) eventBus.emitDeferred("pong:charged_smash", { chargeLevel: charge });
                }

                // Ghost Ball Mutator
                if (this.config!.BALL_INVISIBLE_AFTER_HIT_TICKS) {
                  ballComp.visibilityTimer = this.config!.BALL_INVISIBLE_AFTER_HIT_TICKS;
                }
            });
        });

        // Reposition ball to prevent multiple collisions
        world.mutateComponent<TransformComponent>(ballEntity, "Transform", bPos => {
            if (paddleComp.side === "left") {
              bPos.x = paddlePos.x + this.config!.PADDLE_WIDTH / 2 + this.config!.BALL_SIZE + 1;
            } else {
              bPos.x = paddlePos.x - this.config!.PADDLE_WIDTH / 2 - this.config!.BALL_SIZE - 1;
            }
        });

        // Juice
        Juice.squash(world, ballEntity, 0.6, 1.4, 50);

        const recoilDir = paddleComp.side === "left" ? -1 : 1;
        Juice.add(world, paddleEntity, {
          property: "x",
          target: recoilDir * 10,
          duration: 50,
          easing: "easeOut",
          onComplete: (e) => {
            Juice.add(world, e, { property: "x", target: 0, duration: 150, easing: "elasticOut" });
          }
        });

        Juice.flash(world, paddleEntity, 5);
        Juice.shake(world, 3, 100);
    }
  }

  private matchPair<T1 extends string, T2 extends string>(
    world: World,
    entityA: Entity,
    entityB: Entity,
    type1: T1,
    type2: T2
  ): Record<T1 | T2, Entity> | undefined {
    if (world.hasComponent(entityA, type1) && world.hasComponent(entityB, type2)) {
      return { [type1]: entityA, [type2]: entityB } as Record<T1 | T2, Entity>;
    }
    if (world.hasComponent(entityB, type1) && world.hasComponent(entityA, type2)) {
      return { [type1]: entityB, [type2]: entityA } as Record<T1 | T2, Entity>;
    }
    return undefined;
  }
}
