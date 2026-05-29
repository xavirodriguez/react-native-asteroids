import { System } from "../../core/System";
import { World } from "../../core/World";
import { TransformComponent, VelocityComponent, SpatialNodeComponent, CoreComponentRegistry } from "../../core/CoreComponents";
import { PhysicsUtils } from "../utils/PhysicsUtils";
import { ComponentRegistry } from "../../core/Component";
import { EventRegistry } from "../../core/EventBus";

/**
 * Sistema genérico encargado de actualizar las posiciones de las entidades basado en su velocidad.
 */
export class MovementSystem<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = any
> extends System<TComponents, TEvents> {
  public update(world: World<TComponents, TEvents, any>, deltaTime: number): void {
    const query = world.query("Transform" as any, "Velocity" as any);
    const dtSeconds = deltaTime / 1000;

    for (const entity of query) {
      const node = world.getComponent(entity, "SpatialNode" as any) as any as SpatialNodeComponent;
      const hasBoundary = world.hasComponent(entity, "Boundary" as any);

      // Simulation Culling: Skip if SpatialNode exists and is inactive
      // Note: "Asteroid" and "Ufo" are game-specific.
      // Core system should ideally use a generic "AlwaysSimulate" tag if needed.
      // For now, we'll check by string for compatibility.
      const isDynamicAsteroidElement = world.hasComponent(entity, "Asteroid" as any) || world.hasComponent(entity, "Ufo" as any);

      if (node && !node.active && !hasBoundary && !isDynamicAsteroidElement) {
        continue;
      }

      const pos = world.getComponent(entity, "Transform" as any) as any as TransformComponent;
      const vel = world.getComponent(entity, "Velocity" as any) as any as VelocityComponent;

      if (pos && vel) {
        if (world.hasComponent(entity, "ManualMovement" as any)) {
          continue;
        }

        world.mutateComponent(entity, "Transform" as any, (p: any) => {
          PhysicsUtils.integrateMovement(p as TransformComponent, vel, dtSeconds);
        });
      }
    }
  }
}
