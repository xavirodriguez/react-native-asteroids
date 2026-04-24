import { World } from "../../../engine";
import { System } from "../../../engine/System";
import { Entity, TransformComponent, CollisionEventsComponent, Collider2DComponent, RenderComponent } from "../../../engine/EngineTypes";
import { IFlappyBirdGame } from "../types/GameInterfaces";
import { FlappyBirdState, BirdComponent } from "../types/FlappyBirdTypes";
import { JuiceSystem } from "../../../engine/JuiceSystem";
import { Juice } from "../../../engine/Juice";
import { createEmitter } from "../../../engine/ParticleSystem";
import { EventBus } from "../../../engine/EventBus";

/**
 * System that reacts to collision events between the bird and pipes or ground.
 */
export class FlappyBirdCollisionSystem extends System {
  private _game: IFlappyBirdGame;

  constructor(game: IFlappyBirdGame) {
    super();
    this._game = game;
  }

  public override update(world: World, _deltaTime: number): void {
    const entitiesWithEvents = world.query("CollisionEvents");

    for (const entity of entitiesWithEvents) {
      const eventsComp = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents")!;

      for (const event of eventsComp.collisions) {
        // Ensure each collision pair is processed only once
        if (entity > event.otherEntity) continue;
        this.resolveCollision(world, entity, event.otherEntity);
      }
    }

    // Still need to handle near miss logic which is not a physical collision
    this.handleNearMissLogic(world);
  }

  private resolveCollision(world: World, entityA: Entity, entityB: Entity): void {
    const matchPipe = this.matchPair(world, entityA, entityB, "Bird", "Pipe");
    if (matchPipe) {
        this.triggerGameOver(world);
        return;
    }

    const matchGround = this.matchPair(world, entityA, entityB, "Bird", "Ground");
    if (matchGround) {
        this.triggerGameOver(world);
        return;
    }
  }

  private handleNearMissLogic(world: World): void {
    const birds = world.query("Bird", "Transform", "Collider2D");
    const pipes = world.query("Pipe", "Transform", "Collider2D");

    for (const bird of birds) {
      const birdComp = world.getComponent<BirdComponent>(bird, "Bird")!;
      if (!birdComp.isAlive) continue;

      const birdPos = world.getComponent<TransformComponent>(bird, "Transform")!;
      const birdCol = world.getComponent<Collider2DComponent>(bird, "Collider2D")!; // radius is in shape
      const birdRadius = birdCol.shape.type === "circle" ? birdCol.shape.radius : 0;

      for (const pipe of pipes) {
        const pipePos = world.getComponent<TransformComponent>(pipe, "Transform")!;
        const pipeComp = world.getComponent<PipeComponent>(pipe, "Pipe")!;
        const pipeCol = world.getComponent<Collider2DComponent>(pipe, "Collider2D")!;

        const pipeWidth = pipeCol.shape.type === "aabb" ? pipeCol.shape.halfWidth * 2 : 0;
        const halfPipeHeight = pipeCol.shape.type === "aabb" ? pipeCol.shape.halfHeight : 0;
        const isTopPipe = pipePos.y < pipeComp.gapY;

        // Bird AABB
        const birdLeft = birdPos.x - birdRadius;
        const birdRight = birdPos.x + birdRadius;
        const birdTop = birdPos.y - birdRadius;
        const birdBottom = birdPos.y + birdRadius;

        // Pipe AABB
        const pipeLeft = pipePos.x - pipeWidth / 2;
        const pipeRight = pipePos.x + pipeWidth / 2;
        let pipeTop: number;
        let pipeBottom: number;

        if (isTopPipe) {
          pipeTop = pipePos.y - halfPipeHeight;
          pipeBottom = pipePos.y + halfPipeHeight;
        } else {
          pipeTop = pipePos.y - halfPipeHeight;
          pipeBottom = pipePos.y + halfPipeHeight;
        }

        const horizontalDist = Math.max(0, pipeLeft - birdRight, birdLeft - pipeRight);
        const verticalDist = Math.max(0, pipeTop - birdBottom, birdTop - pipeBottom);
        const dist = horizontalDist + verticalDist;

        if (dist > 0 && dist < 12) {
           if (birdComp.nearMissTimer <= 0) {
             birdComp.nearMissTimer = 300;
             const gameState = world.getSingleton<FlappyBirdState>("FlappyState");
             if (gameState) gameState.score += 50;

             const eventBus = world.getResource<EventBus>("EventBus");
             if (eventBus) eventBus.emit("flappy:near_miss", { points: 50 });

             Juice.shake(world, 2, 100);
             createEmitter(world, {
                position: { x: birdPos.x, y: birdPos.y },
                rate: 0, burst: 5,
                color: ["#FFD700"],
                size: {min:2, max:4},
                speed: {min:40, max:80},
                angle: {min:0, max:360},
                lifetime: {min:0.3, max:0.5},
                loop: false
             });
           }
        }
      }
    }
  }

  private triggerGameOver(world: World): void {
    const gameState = world.getSingleton<FlappyBirdState>("FlappyState");
    if (gameState && !gameState.isGameOver) {
      gameState.isGameOver = true;

      const birds = world.query("Bird");
      birds.forEach(birdEntity => {
        const bird = world.getComponent<BirdComponent>(birdEntity, "Bird");
        if (bird) bird.isAlive = false;

        const render = world.getComponent<RenderComponent>(birdEntity, "Render");
        if (render) render.hitFlashFrames = 8;

        JuiceSystem.add(world, birdEntity, {
          property: "scaleX",
          target: 0.5,
          duration: 100,
          easing: "easeOut",
          onComplete: (e) => {
            JuiceSystem.add(world, e, {
              property: "scaleX",
              target: 0,
              duration: 200,
              easing: "elasticOut"
            });
          }
        });
        JuiceSystem.add(world, birdEntity, {
          property: "scaleY",
          target: -0.5,
          duration: 100,
          easing: "easeOut",
          onComplete: (e) => {
            JuiceSystem.add(world, e, {
              property: "scaleY",
              target: 0,
              duration: 200,
              easing: "elasticOut"
            });
          }
        });
      });
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
