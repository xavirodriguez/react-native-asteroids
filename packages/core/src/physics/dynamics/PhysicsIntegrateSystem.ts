import { System } from "../../core/System";
import { World } from "../../core/World";
import { TransformComponent, PhysicsBody2DComponent } from "../../types/EngineTypes";

/**
 * System for physical integration using Semi-Implicit Euler.
 *
 * @remarks
 * Designed to apply forces and gravity to velocity, and integrate velocity
 * into position and rotation. It aims to support simulation stability
 * within the fixed time-step loop.
 *
 * Runs in `SystemPhase.Simulation`.
 *
 * @public
 */
export class PhysicsIntegrateSystem extends System {
  private gravityX = 0;
  private gravityY = 9.81 * 100; // Standard gravity scaled to pixels

  /**
   * Configures global gravity applied to all dynamic bodies.
   *
   * @param x - [px/s^2] Gravity X component.
   * @param y - [px/s^2] Gravity Y component.
   */
  setGravity(x: number, y: number) {
    this.gravityX = x;
    this.gravityY = y;
  }

  /**
   * Updates the physics integration.
   */
  update(world: World, deltaTime: number): void {
    const dt = deltaTime / 1000;
    if (dt <= 0) return;

    const entities = world.query("Transform", "PhysicsBody2D");

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      // 1. Update Velocities (v = v + a * dt)
      world.mutateComponent<PhysicsBody2DComponent>(entity, "PhysicsBody2D", (body) => {
        if (body.bodyType === "static") return;

        // Apply forces (including gravity)
        if (body.bodyType === "dynamic") {
          body.velocityX += (body.forceX * body.inverseMass + this.gravityX * body.gravityScale) * dt;
          body.velocityY += (body.forceY * body.inverseMass + this.gravityY * body.gravityScale) * dt;

          if (!body.fixedRotation) {
            body.angularVelocity += (body.torque * body.inverseInertia) * dt;
          }
        }
      });

      // 2. Update Positions (x = x + v * dt)
      world.mutateComponent<TransformComponent>(entity, "Transform", (transform) => {
        const body = world.getComponent<PhysicsBody2DComponent>(entity, "PhysicsBody2D")!;
        if (body.bodyType === "static") return;

        transform.x += body.velocityX * dt;
        transform.y += body.velocityY * dt;
        transform.rotation += body.angularVelocity * dt;
      });
    }
  }
}
