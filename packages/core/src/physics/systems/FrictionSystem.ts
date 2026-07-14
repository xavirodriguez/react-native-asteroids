import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";

/**
 * System that applies friction to entity velocity.
 *
 * @remarks
 * This system reduces velocity based on a friction factor and deltaTime.
 * It is intended for use with a fixed timestep to ensure consistent deceleration
 * across different frame rates.
 */
import { Entity } from "../../ecs/Entity";

export class FrictionSystem extends System<CoreComponentRegistry> {
  private candidateEntities: Entity[] | null = null;

  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

  update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const resourceCandidates = world.getResource<Entity[]>("SpatialCullingCandidates");
    const candidatesList = this.candidateEntities !== null ? this.candidateEntities : (resourceCandidates !== undefined ? resourceCandidates : null);

    if (candidatesList !== null) {
      for (const entity of candidatesList) {
        const f = world.getComponent(entity, "Friction");
        if (!f) continue;
        const v = world.getComponent(entity, "Velocity");
        if (!v) continue;

        world.mutateComponent(entity, "Velocity", (vel) => {
          const factor = Math.max(0, 1 - f.value * deltaTime);
          vel.vx *= factor;
          vel.vy *= factor;
          if (vel.angularVelocity) {
            vel.angularVelocity *= factor;
          }
        });
      }
    } else {
      const entities = world.query("Velocity", "Friction");
      for (const entity of entities) {
        const f = world.getComponent(entity, "Friction")!;
        world.mutateComponent(entity, "Velocity", (v) => {
          const factor = Math.max(0, 1 - f.value * deltaTime);
          v.vx *= factor;
          v.vy *= factor;
          if (v.angularVelocity) {
            v.angularVelocity *= factor;
          }
        });
      }
    }
  }
}
