import { System } from "../../core/System";
import { World } from "../../core/World";
import { Entity, PositionComponent, ColliderComponent } from "../../types";
import { EventBus } from "../../utils/EventBus";

export interface CollisionEvent {
  entityA: Entity;
  entityB: Entity;
  world: World;
}

/**
 * Generic collision detection system.
 * Detects circular collisions and emits 'collision' events through an EventBus.
 */
export class CollisionSystem extends System {
  constructor(private eventBus: EventBus) {
    super();
  }

  public update(world: World, deltaTime: number): void {
    void deltaTime;
    const colliders = world.query("Position", "Collider");
    if (colliders.length < 2) return;

    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        const entityA = colliders[i];
        const entityB = colliders[j];

        if (this.isColliding(world, entityA, entityB)) {
          this.eventBus.emit<CollisionEvent>("collision", { entityA, entityB, world });
        }
      }
    }
  }

  private isColliding(world: World, entityA: Entity, entityB: Entity): boolean {
    const posA = world.getComponent<PositionComponent>(entityA, "Position");
    const posB = world.getComponent<PositionComponent>(entityB, "Position");
    const colA = world.getComponent<ColliderComponent>(entityA, "Collider");
    const colB = world.getComponent<ColliderComponent>(entityB, "Collider");

    if (!posA || !posB || !colA || !colB) return false;

    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    const squaredDistance = dx * dx + dy * dy;
    const radiusSum = colA.radius + colB.radius;

    return squaredDistance < radiusSum * radiusSum;
  }
}
