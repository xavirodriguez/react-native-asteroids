import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent, PreviousTransformComponent, CoreComponentRegistry } from "../core/CoreComponents";
import { ComponentRegistry } from "../core/Component";
import { EventRegistry } from "../core/EventBus";

/**
 * System that snapshots current Transform state into PreviousTransform.
 * Used for visual interpolation between simulation ticks.
 */
export class InterpolationPrepSystem<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = any
> extends System<TComponents, TEvents> {
  public update(world: World<TComponents, TEvents, any>, _deltaTime: number): void {
    const query = world.query("Transform" as any, "PreviousTransform" as any);

    for (const entity of query) {
      const transform = world.getComponent(entity, "Transform" as any) as any as TransformComponent;
      const prevTransform = world.getComponent(entity, "PreviousTransform" as any) as any as PreviousTransformComponent;

      if (transform && prevTransform) {
        world.mutateComponent(entity, "PreviousTransform" as any, (p: any) => {
          const pt = p as PreviousTransformComponent;
          pt.x = transform.x;
          pt.y = transform.y;
          pt.rotation = transform.rotation;
          pt.worldX = transform.worldX;
          pt.worldY = transform.worldY;
          pt.worldRotation = transform.worldRotation;
        });
      }
    }
  }
}
