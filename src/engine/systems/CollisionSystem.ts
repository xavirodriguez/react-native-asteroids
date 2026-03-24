import { System } from "../core/System";
import { World } from "../core/World";
import { PositionComponent, ColliderComponent, Entity } from "../types/EngineTypes";

/**
 * Generic Collision System for the TinyAsterEngine.
 * Handles circle-to-circle collision detection.
 */
export abstract class CollisionSystem extends System {
  /**
   * Updates the collision state.
   */
  public update(world: World, deltaTime: number): void {
    void deltaTime;
    const colliders = world.query("Position", "Collider");
    if (colliders.length < 2) return;

    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        const entityA = colliders[i];
        const entityB = colliders[j];

        if (this.isColliding(world, entityA, entityB)) {
          this.onCollision(world, entityA, entityB);
        }
      }
    }
  }

  /**
   * Circle-to-circle collision check.
   */
  protected isColliding(world: World, entityA: Entity, entityB: Entity): boolean {
    const posA = world.getComponent<PositionComponent>(entityA, "Position");
    const posB = world.getComponent<PositionComponent>(entityB, "Position");
    const colA = world.getComponent<ColliderComponent>(entityA, "Collider");
    const colB = world.getComponent<ColliderComponent>(entityB, "Collider");

    if (!posA || !posB || !colA || !colB) return false;

    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    const distanceSq = dx * dx + dy * dy;
    const radiusSum = colA.radius + colB.radius;

    return distanceSq < radiusSum * radiusSum;
  }

  /**
   * Abstract hook called when a collision is detected.
   * Concrete games implement this to handle specific logic.
   */
  protected abstract onCollision(world: World, entityA: Entity, entityB: Entity): void;
}
