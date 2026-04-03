import { World } from "../../../engine/core/World";
import { CollisionSystem } from "../../../engine/systems/CollisionSystem";
import { Entity, PositionComponent, VelocityComponent } from "../../../engine/types/EngineTypes";
import { PONG_CONFIG } from "../types";

export class PongCollisionSystem extends CollisionSystem {
  protected onCollision(world: World, entityA: Entity, entityB: Entity): void {
    const paddleBall = this.matchPair(world, entityA, entityB, "Paddle", "Ball");
    if (paddleBall) {
        // Logic for bouncing on paddles should go here (omitted for brevity)
    }
  }

}
