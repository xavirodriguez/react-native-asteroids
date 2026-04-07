import { System } from "../../core/System";
import { World } from "../../core/World";
import { TransformComponent, RigidBodyComponent } from "../../types/EngineTypes";
import { IPhysicsAdapter } from "../../core/types/SystemTypes";

/**
 * PhysicsSystem: Orchestrates the physics simulation and syncs results to the ECS.
 */
export class PhysicsSystem implements System {
  constructor(private adapter: IPhysicsAdapter) {}

  update(world: World, deltaTime: number): void {
    // 1. Sync ECS state to physics bodies before step
    const entities = world.query("RigidBody", "Transform");
    entities.forEach((entity) => {
      const rb = world.getComponent<RigidBodyComponent>(entity, "RigidBody");
      const transform = world.getComponent<TransformComponent>(entity, "Transform");

      if (rb && transform && !rb.isStatic) {
          // If the ECS transform was changed externally, sync it to the physics body
          // This is a simple implementation; in more complex engines we might track 'dirty' states.
          this.adapter.setPosition(rb.bodyId, { x: transform.x, y: transform.y });
          this.adapter.setRotation(rb.bodyId, transform.rotation);
      }
    });

    // 2. Advance the physics world
    this.adapter.update(deltaTime);

    // 3. Synchronize all RigidBody components with their Matter.js bodies
    entities.forEach((entity) => {
      const rb = world.getComponent<RigidBodyComponent>(entity, "RigidBody");
      const transform = world.getComponent<TransformComponent>(entity, "Transform");

      if (rb && transform) {
        const bodyTransform = this.adapter.getBodyTransform(rb.bodyId);

        // Sync visual transform with physics transform
        transform.x = bodyTransform.x;
        transform.y = bodyTransform.y;
        transform.rotation = bodyTransform.rotation;
      }
    });
  }
}
