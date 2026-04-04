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
    // 1. Advance the physics world
    this.adapter.update(deltaTime);

    // 2. Synchronize all RigidBody components with their Matter.js bodies
    const entities = world.query("RigidBody", "Transform");
    entities.forEach((entity) => {
      const rb = world.getComponent<RigidBodyComponent>(entity, "RigidBody");
      const transform = world.getComponent<TransformComponent>(entity, "Transform");

      if (rb && transform) {
        const bodyId = rb.bodyId as number;
        const bodyTransform = this.adapter.getBodyTransform(bodyId);

        // Sync visual transform with physics transform
        transform.x = bodyTransform.x;
        transform.y = bodyTransform.y;
        transform.rotation = bodyTransform.rotation;
      }
    });
  }
}
