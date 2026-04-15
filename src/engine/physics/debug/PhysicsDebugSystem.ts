import { System } from "../../core/System";
import { World } from "../../core/World";
import { Collider2DComponent, TransformComponent, CollisionEventsComponent } from "../../types/EngineTypes";

/**
 * System that collects and processes debug information for physics rendering.
 * Facilitates visualization of colliders, normals, and contact points.
 */
export class PhysicsDebugSystem extends System {
  public enabled = false;

  /**
   * Color configuration for different states
   */
  public colors = {
      collider: "#00FF00",
      trigger: "#FFFF00",
      contact: "#FF0000",
      normal: "#0000FF"
  };

  update(world: World, _deltaTime: number): void {
    if (!this.enabled) return;

    const entities = world.query("Transform", "Collider2D");

    entities.forEach(entity => {
      const transform = world.getComponent<TransformComponent>(entity, "Transform")!;
      const collider = world.getComponent<Collider2DComponent>(entity, "Collider2D")!;

      // In a real environment, this system would emit drawing commands
      // or populate a specific RenderComponent for debug visuals.
      this.drawDebugShape(transform, collider);
    });

    const eventEntities = world.query("CollisionEvents");
    eventEntities.forEach(entity => {
      const events = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents")!;
      events.collisions.forEach(c => {
          this.drawContactPoints(c);
      });
    });
  }

  private drawDebugShape(_t: TransformComponent, _c: Collider2DComponent) {
      // Logic for drawing shapes (abstracted for the specific renderer)
  }

  private drawContactPoints(_collision: import("../../core/CoreComponents").CollisionEvent) {
      // Logic for drawing contact points and normals
  }
}
