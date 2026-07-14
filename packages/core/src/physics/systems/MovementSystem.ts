import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";

/**
 * System that applies velocity to entity transforms.
 *
 * @remarks
 * This system performs basic semi-implicit Euler integration. It is designed for arcade-style
 * movement and is intended to be used with a fixed timestep to support
 * reproducible behavior under consistent conditions.
 *
 * @warning
 * **Floating-Point Drift**: As this system relies on standard floating-point arithmetic,
 * small precision errors will accumulate over time. The exact trajectory may vary slightly
 * across different JavaScript engines, WASM runtimes, or platforms.
 */
import { Entity } from "../../ecs/Entity";

export class MovementSystem extends System<CoreComponentRegistry> {
  private candidateEntities: Entity[] | null = null;

  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

  update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const resourceCandidates = world.getResource<Entity[]>("SpatialCullingCandidates");
    const candidatesList = this.candidateEntities !== null ? this.candidateEntities : (resourceCandidates !== undefined ? resourceCandidates : null);

    if (candidatesList !== null) {
      for (const entity of candidatesList) {
        const v = world.getComponent(entity, "Velocity");
        if (!v) continue;
        const t = world.getComponent(entity, "Transform");
        if (!t) continue;

        world.mutateComponent(entity, "Transform", (trans) => {
          trans.x += v.vx * deltaTime;
          trans.y += v.vy * deltaTime;
          if (v.angularVelocity) {
            trans.rotation += v.angularVelocity * deltaTime;
          }
        });
      }
    } else {
      const entities = world.query("Transform", "Velocity");
      for (const entity of entities) {
        const v = world.getComponent(entity, "Velocity")!;
        world.mutateComponent(entity, "Transform", (t) => {
          t.x += v.vx * deltaTime;
          t.y += v.vy * deltaTime;
          if (v.angularVelocity) {
            t.rotation += v.angularVelocity * deltaTime;
          }
        });
      }
    }
  }
}
