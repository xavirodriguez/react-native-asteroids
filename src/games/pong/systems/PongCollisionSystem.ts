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

  update(world: World, deltaTime: number): void {
    super.update(world, deltaTime);
    this.handleWallBounce(world);
  }

  private handleWallBounce(world: World): void {
    const balls = world.query("Position", "Velocity", "Collider", "Render").filter(e => {
        const render = world.getComponent<any>(e, "Render");
        return render.shape === "circle";
    });

    balls.forEach(ball => {
      const pos = world.getComponent<PositionComponent>(ball, "Position")!;
      const vel = world.getComponent<VelocityComponent>(ball, "Velocity")!;

      // Wall bounce (Y axis)
      if (pos.y < 0 || pos.y > PONG_CONFIG.HEIGHT) {
        vel.dy *= -1;
      }
    });
  }
}
