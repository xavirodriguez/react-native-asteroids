import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent, PreviousTransformComponent } from "../core/CoreComponents";

/**
 * System that captures the current transform state before it is modified by simulation.
 * Should run at the very beginning of the update cycle.
 */
export class InterpolationPrepSystem extends System {
  public update(world: World, _deltaTime: number): void {
    const entities = world.query("Transform");

    entities.forEach(entity => {
      const transform = world.getComponent<TransformComponent>(entity, "Transform")!;
      let prev = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");

      if (!prev) {
        prev = {
          type: "PreviousTransform",
          x: transform.x,
          y: transform.y,
          rotation: transform.rotation
        };
        world.addComponent(entity, prev);
      } else {
        prev.x = transform.x;
        prev.y = transform.y;
        prev.rotation = transform.rotation;
      }
    });
  }
}
