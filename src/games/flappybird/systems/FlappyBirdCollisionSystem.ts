import { World } from "../../../engine/core/World";
import { CollisionSystem } from "../../../engine/systems/CollisionSystem";
import { Entity, PositionComponent, ColliderComponent } from "../../../engine/types/EngineTypes";
import { IFlappyBirdGame } from "../types/GameInterfaces";
import { getGameState } from "../GameUtils";
import { FLAPPY_CONFIG } from "../types/FlappyBirdTypes";

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
    const birds = world.query("Bird", "Position", "Collider");
    const pipes = world.query("Pipe", "Position");

    for (const bird of birds) {
      for (const pipe of pipes) {
        this.handleBirdPipeCollision({ world, pair: { entityA: bird, entityB: pipe } });
      }
    }

    // Dedicated ground collision check (Y-axis only)
    this.checkGroundCollision(world);
  }

  private checkGroundCollision(world: World): void {
    const birds = world.query("Bird", "Position", "Collider");
    const grounds = world.query("Ground", "Position", "Collider");

    if (birds.length === 0 || grounds.length === 0) return;

    const birdPos = world.getComponent<PositionComponent>(birds[0], "Position")!;
    const birdCol = world.getComponent<ColliderComponent>(birds[0], "Collider")!;
    const groundPos = world.getComponent<PositionComponent>(grounds[0], "Position")!;
    const groundCol = world.getComponent<ColliderComponent>(grounds[0], "Collider")!;

    // If bird center Y + radius exceeds ground top edge Y
    const groundTop = groundPos.y - groundCol.radius;
    if (birdPos.y + birdCol.radius >= groundTop) {
      this.triggerGameOver(world);
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

      const birdPos = world.getComponent<PositionComponent>(bird, "Position")!;
      const birdCol = world.getComponent<ColliderComponent>(bird, "Collider")!;
      const pipePos = world.getComponent<PositionComponent>(pipe, "Position")!;
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
      }
    }
    return false;
  }

  private triggerGameOver(world: World): void {
    const gameState = getGameState(world);
    if (!gameState.isGameOver) {
      gameState.isGameOver = true;
      this.game.pause();
    }
  }

  private matchPair<T1 extends string, T2 extends string>(
    world: World,
    e1: Entity,
    e2: Entity,
    type1: T1,
    type2: T2
  ): Record<T1 | T2, Entity> | undefined {
    if (world.hasComponent(e1, type1) && world.hasComponent(e2, type2)) {
      return { [type1]: e1, [type2]: e2 } as Record<T1 | T2, Entity>;
    }
    if (world.hasComponent(e2, type1) && world.hasComponent(e1, type2)) {
      return { [type1]: e2, [type2]: e1 } as Record<T1 | T2, Entity>;
    }
    return undefined;
  }
}
