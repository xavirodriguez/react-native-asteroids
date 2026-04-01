import { World } from "../../../engine/core/World";
import { CollisionSystem } from "../../../engine/systems/CollisionSystem";
import { Entity } from "../../../engine/types/EngineTypes";
import { IFlappyBirdGame } from "../types/GameInterfaces";
import { getGameState } from "../GameUtils";

/**
 * System that handles collisions between the bird and pipes or ground.
 */
export class FlappyBirdCollisionSystem extends CollisionSystem {
  private game: IFlappyBirdGame;

  constructor(game: IFlappyBirdGame) {
    super();
    this.game = game;
  }

  protected onCollision(world: World, entityA: Entity, entityB: Entity): void {
    const pair = { entityA, entityB };

    if (this.handleBirdPipeCollision({ world, pair })) return;
    this.handleBirdGroundCollision({ world, pair });
  }

  private handleBirdPipeCollision(context: {
    world: World;
    pair: { entityA: Entity; entityB: Entity };
  }): boolean {
    const { world, pair } = context;
    const match = this.matchPair(world, pair.entityA, pair.entityB, "Bird", "Pipe");

    if (match) {
      this.triggerGameOver(world);
      return true;
    }
    return false;
  }

  private handleBirdGroundCollision(context: {
    world: World;
    pair: { entityA: Entity; entityB: Entity };
  }): boolean {
    const { world, pair } = context;
    const match = this.matchPair(world, pair.entityA, pair.entityB, "Bird", "Ground");

    if (match) {
      this.triggerGameOver(world);
      return true;
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
