import { World, ComponentType } from "../../../index";
import { System } from "../../../index";
import { Entity, TransformComponent, CollisionEventsComponent, Collider2DComponent, RenderComponent } from "../../../index";
import { IFlappyBirdGame } from "../types/GameInterfaces";
import { FlappyBirdState, BirdComponent, PipeComponent, FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";
import { Juice } from "../../../index";
import { createEmitter } from "../../../index";
import { EventBus } from "../../../index";

/**
 * System that reacts to collision events between the bird and pipes or ground.
 */
export class FlappyBirdCollisionSystem extends System<FlappyBirdComponentRegistry> {
  private _game: IFlappyBirdGame;

  constructor(game: IFlappyBirdGame) {
    super();
    this._game = game;
  }

  public override update(world: World<FlappyBirdComponentRegistry>, _deltaTime: number): void {
    const entitiesWithEvents = world.query("CollisionEvents");

    for (const entity of entitiesWithEvents) {
      const eventsComp = world.getComponent(entity, "CollisionEvents")!;

      for (const event of eventsComp.collisions) {
        // Ensure each collision pair is processed only once
        if (entity > event.otherEntity) continue;
        this.resolveCollision(world, entity, event.otherEntity);
      }
    }

    // Still need to handle near miss logic which is not a physical collision
    this.handleNearMissLogic(world);
  }

  private resolveCollision(world: World<FlappyBirdComponentRegistry>, entityA: Entity, entityB: Entity): void {
    const matchPipe = this.matchPair(world, entityA, entityB, "Bird", "Pipe");
    if (matchPipe) {
        this.triggerGameOver(world);
        return;
    }

    const matchGround = this.matchPair(world, entityA, entityB, "Bird", "Ground" as any);
    if (matchGround) {
        this.triggerGameOver(world);
        return;
    }
  }

  private handleNearMissLogic(world: World<FlappyBirdComponentRegistry>): void {
    const birds = world.query("Bird", "Transform", "Collider2D");
    const pipes = world.query("Pipe", "Transform", "Collider2D");

    for (const bird of birds) {
      const birdComp = world.getComponent(bird, "Bird")!;
      if (!birdComp.isAlive) continue;

      const birdPos = world.getComponent(bird, "Transform")!;
      const birdCol = world.getComponent(bird, "Collider2D")!; // radius is in shape
      const birdRadius = birdCol.shape.type === "circle" ? birdCol.shape.radius : 0;

      for (const pipe of pipes) {
        const pipePos = world.getComponent(pipe, "Transform")!;
        const pipeComp = world.getComponent(pipe, "Pipe")!;
        const pipeCol = world.getComponent(pipe, "Collider2D")!;

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
             world.mutateComponent(bird, "Bird", b => {
                b.nearMissTimer = 300;
             });

             world.mutateSingleton("FlappyState", gs => {
                 gs.score += 50;
             });

             const eventBus = world.getResource<EventBus>("EventBus");
             if (eventBus) eventBus.emitDeferred("flappy:near_miss" as any, { points: 50 } as any);

             Juice.shake(world, 2, 100);
             createEmitter(world, {
                type: "near_miss",
                x: birdPos.x,
                y: birdPos.y,
                rate: 0,
                burst: true,
                count: 5,
                color: ["#FFD700"],
                size: [2, 4],
                speed: [40, 80],
                angle: [0, 360],
                lifetime: [0.3, 0.5],
                loop: false
             });
           }
        }
      }
    }
  }

  private triggerGameOver(world: World<FlappyBirdComponentRegistry>): void {
    const gameState = world.getSingleton("FlappyState");
    if (gameState && !gameState.isGameOver) {
      world.mutateSingleton("FlappyState", gs => {
          gs.isGameOver = true;
      });

      const birds = world.query("Bird");
      birds.forEach(birdEntity => {
        world.mutateComponent(birdEntity, "Bird", b => {
            b.isAlive = false;
        });

        world.mutateComponent(birdEntity, "Render", render => {
            render.hitFlashFrames = 8;
        });

        Juice.add(world, birdEntity, {
          property: "scaleX",
          target: 0.5,
          duration: 100,
          easing: "easeOut"
        });
        Juice.add(world, birdEntity, {
          property: "scaleX",
          target: 0,
          duration: 200,
          easing: "elasticOut",
          delay: 100
        });
        Juice.add(world, birdEntity, {
          property: "scaleY",
          target: -0.5,
          duration: 100,
          easing: "easeOut"
        });
        Juice.add(world, birdEntity, {
          property: "scaleY",
          target: 0,
          duration: 200,
          easing: "elasticOut",
          delay: 100
        });
      });
    }
  }

  private matchPair<T1 extends ComponentType<FlappyBirdComponentRegistry>, T2 extends ComponentType<FlappyBirdComponentRegistry>>(
    world: World<FlappyBirdComponentRegistry>,
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
