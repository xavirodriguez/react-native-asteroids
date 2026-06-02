import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { TransformComponent, VelocityComponent, SpatialNodeComponent } from "../../ecs/CoreComponents";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Sistema genérico encargado de actualizar las posiciones de las entidades basado en su velocidad.
 * Implementa un integrador lineal simple (Euler explicit).
 */
export class MovementSystem extends System {
  /**
   * Actualiza la posición y rotación de todas las entidades que poseen Transform y Velocity.
   *
   * @param world - El mundo ECS que contiene las entidades.
   * @param deltaTime - Tiempo transcurrido desde el último tick en milisegundos.
   */
  public update(world: World, deltaTime: number): void {
    const query = world.getQuery("Transform", "Velocity");
    const dtSeconds = deltaTime / 1000;

    query.forEach((entity) => {

      const node = world.getComponent<SpatialNodeComponent>(entity, "SpatialNode");
      const hasBoundary = world.hasComponent(entity, "Boundary");

      // Simulation Culling: Skip if SpatialNode exists and is inactive
      // BUT: Do not skip if it has a BoundaryComponent (it needs to wrap/bounce even if off-screen)
      // or if it has a "KeepAlive" tag/component (can be extended by games).
      const isKeepAlive = world.hasComponent(entity, "KeepAlive");

      if (node && !node.active && !hasBoundary && !isKeepAlive) {
        if (world.debugMode) {
          console.debug(`[MovementSystem] Skipping entity ${entity} due to inactive SpatialNode (culling).`);
        }
        return;
      }

      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");

      if (pos && vel) {
        if (world.hasComponent(entity, "ManualMovement")) {
          if (world.debugMode) {
            console.debug(`[MovementSystem] Skipping entity ${entity} due to ManualMovementComponent.`);
          }
          return;
        }

        if (world.debugMode) {
          console.debug(`[MovementSystem] Integrating entity ${entity}: pos(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}), vel(${vel.dx.toFixed(2)}, ${vel.dy.toFixed(2)}), dt: ${dtSeconds.toFixed(4)}s, active: ${node?.active ?? 'N/A'}, hasBoundary: ${hasBoundary}`);
        }

        world.mutateComponent<TransformComponent>(entity, "Transform", (p) => {
          PhysicsUtils.integrateMovement(p as any, vel, dtSeconds);
        });
      }
    });
  }
}
