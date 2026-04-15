import { World } from "../../../engine/core/World";
import { CollisionSystem } from "../../../engine/systems/CollisionSystem";
import { Entity, TransformComponent, ColliderComponent } from "../../../engine/types/EngineTypes";
import { IFlappyBirdGame } from "../types/GameInterfaces";
import { FLAPPY_CONFIG, FlappyBirdState, BirdComponent } from "../types/FlappyBirdTypes";
import { JuiceSystem } from "../../../engine/systems/JuiceSystem";
import { Juice } from "../../../engine/utils/Juice";
import { createEmitter } from "../../../engine/systems/ParticleSystem";

/**
 * System that handles collisions between the bird and pipes or ground.
 */
export class FlappyBirdCollisionSystem extends CollisionSystem {
  private game: IFlappyBirdGame;

  constructor(game: IFlappyBirdGame) {
    super();
    this.game = game;
  }

  public override update(world: World, _deltaTime: number): void {
    const birds = world.query("Bird", "Transform", "Collider");
    const pipes = world.query("Pipe", "Transform");

    for (const bird of birds) {
      for (const pipe of pipes) {
        this.handleBirdPipeCollision({ world, pair: { entityA: bird, entityB: pipe } });
      }
    }

    // Dedicated ground collision check (Y-axis only)
    this.checkGroundCollision(world);
  }

  private checkGroundCollision(world: World): void {
    const birds = world.query("Bird", "Transform", "Collider");
    const grounds = world.query("Ground", "Transform", "Collider");

    if (grounds.length === 0) return;
    const groundPos = world.getComponent<TransformComponent>(grounds[0], "Transform")!;
    const groundCol = world.getComponent<ColliderComponent>(grounds[0], "Collider")!;
    const groundTop = groundPos.y - groundCol.radius;

    for (const bird of birds) {
      const birdPos = world.getComponent<TransformComponent>(bird, "Transform")!;
      const birdCol = world.getComponent<ColliderComponent>(bird, "Collider")!;

      // If bird center Y + radius exceeds ground top edge Y
      if (birdPos.y + birdCol.radius >= groundTop) {
        this.triggerGameOver(world);
        break;
      }
    }
  }

  protected onCollision(world: World, entityA: Entity, entityB: Entity): void {
    const pair = { entityA, entityB };

    this.handleBirdPipeCollision({ world, pair });
    // handleBirdGroundCollision is now handled in checkGroundCollision
  }

  private handleBirdPipeCollision(context: {
    world: World;
    pair: { entityA: Entity; entityB: Entity };
  }): boolean {
    const { world, pair } = context;
    const match = this.matchPair(world, pair.entityA, pair.entityB, "Bird", "Pipe");

    if (match) {
      const bird = match.Bird;
      const pipe = match.Pipe;

      const birdPos = world.getComponent<TransformComponent>(bird, "Transform")!;
      const birdCol = world.getComponent<ColliderComponent>(bird, "Collider")!;
      const pipePos = world.getComponent<TransformComponent>(pipe, "Transform")!;
      const pipeComp = world.getComponent(pipe, "Pipe") as any;

      const halfGap = pipeComp.gapSize / 2;
      const pipeWidth = FLAPPY_CONFIG.PIPE_WIDTH;
      const isTopPipe = pipePos.y < pipeComp.gapY;

      // Bird AABB (approximate)
      const birdLeft = birdPos.x - birdCol.radius;
      const birdRight = birdPos.x + birdCol.radius;
      const birdTop = birdPos.y - birdCol.radius;
      const birdBottom = birdPos.y + birdCol.radius;

      // Pipe AABB
      const pipeLeft = pipePos.x - pipeWidth / 2;
      const pipeRight = pipePos.x + pipeWidth / 2;
      let pipeTop: number;
      let pipeBottom: number;

      if (isTopPipe) {
        pipeTop = 0;
        pipeBottom = pipeComp.gapY - halfGap;
      } else {
        pipeTop = pipeComp.gapY + halfGap;
        pipeBottom = FLAPPY_CONFIG.SCREEN_HEIGHT;
      }

      // AABB Collision check
      if (
        birdRight > pipeLeft &&
        birdLeft < pipeRight &&
        birdBottom > pipeTop &&
        birdTop < pipeBottom
      ) {
        this.triggerGameOver(world);
        return true;
      } else {
        // Near Miss logic
        const horizontalDist = Math.max(0, pipeLeft - birdRight, birdLeft - pipeRight);
        const verticalDist = Math.max(0, pipeTop - birdBottom, birdTop - pipeBottom);
        const dist = horizontalDist + verticalDist;

        if (dist > 0 && dist < 12 && birdComp.isAlive) {
           const birdC = world.getComponent<BirdComponent>(bird, "Bird")!;
           if (birdC.nearMissTimer <= 0) {
             birdC.nearMissTimer = 300;
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
    return false;
  }

  private triggerGameOver(world: World): void {
    const gameState = world.getSingleton<FlappyBirdState>("FlappyState");
    if (gameState && !gameState.isGameOver) {
      gameState.isGameOver = true;

      // Juice: Squash de impacto en todos los pájaros vivos
      const birds = world.query("Bird");
      birds.forEach(birdEntity => {
        const bird = world.getComponent<BirdComponent>(birdEntity, "Bird");
        if (bird) bird.isAlive = false;

        // Apply visual feedback
        const render = world.getComponent<any>(birdEntity, "Render");
        if (render) render.hitFlashFrames = 8;

        JuiceSystem.add(world, birdEntity, {
          property: "scaleX",
          target: 1.5,
          duration: 100,
          easing: "easeOut",
          onComplete: (e) => {
            JuiceSystem.add(world, e, {
              property: "scaleX",
              target: 1,
              duration: 200,
              easing: "elasticOut"
            });
          }
        });
        JuiceSystem.add(world, birdEntity, {
          property: "scaleY",
          target: 0.5,
          duration: 100,
          easing: "easeOut",
          onComplete: (e) => {
            JuiceSystem.add(world, e, {
              property: "scaleY",
              target: 1,
              duration: 200,
              easing: "elasticOut"
            });
          }
        });
      });

      // We don't pause immediately to let the game-over UI handle the state
      // and allow the player to see the impact.
    }
  }
}
