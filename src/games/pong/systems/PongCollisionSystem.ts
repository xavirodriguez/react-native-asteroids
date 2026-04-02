import { World } from "../../../engine/core/World";
import { CollisionSystem } from "../../../engine/systems/CollisionSystem";
import { Entity } from "../../../engine/types/EngineTypes";

export class PongCollisionSystem extends CollisionSystem {
  protected onCollision(world: World, entityA: Entity, entityB: Entity): void {
    const paddleBall = this.matchPair(world, entityA, entityB, "Paddle", "Ball");
    if (paddleBall) {
        // Logic for bouncing on paddles should go here (omitted for brevity)
    }
  }

  update(world: World, deltaTime: number): void {
    super.update(world, deltaTime);
  }
}
