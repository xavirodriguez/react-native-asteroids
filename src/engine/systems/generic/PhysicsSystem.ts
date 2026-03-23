import { System } from "../../core/System";
import { World } from "../../core/World";
import { VelocityComponent } from "../../types";

export interface PhysicsConfig {
  gravity?: number;
  friction?: number;
  maxSpeed?: number;
}

/**
 * Generic physics system that applies friction, gravity, and clamps velocity.
 */
export class PhysicsSystem extends System {
  constructor(private config: PhysicsConfig = {}) {
    super();
  }

  public update(world: World, deltaTime: number): void {
    const entities = world.query("Velocity");
    const dt = deltaTime / 1000;
    const { gravity = 0, friction = 1, maxSpeed = Infinity } = this.config;

    entities.forEach((entity) => {
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
      if (!vel) return;

      // Apply Gravity
      if (gravity !== 0) {
        vel.dy += gravity * dt;
      }

      // Apply Friction
      if (friction !== 1) {
        const frictionFactor = Math.pow(friction, deltaTime / (1000 / 60));
        vel.dx *= frictionFactor;
        vel.dy *= frictionFactor;
      }

      // Clamp Velocity
      const speedSq = vel.dx * vel.dx + vel.dy * vel.dy;
      if (speedSq > maxSpeed * maxSpeed) {
        const speed = Math.sqrt(speedSq);
        vel.dx = (vel.dx / speed) * maxSpeed;
        vel.dy = (vel.dy / speed) * maxSpeed;
      }
    });
  }
}
