import { PhysicsUtils } from "./PhysicsUtils";

const GAME_CONFIG = {
  SHIP_THRUST: 200,
  SHIP_ROTATION_SPEED: 3,
  SHIP_FRICTION: 0.99,
};

/**
 * Shared logic for ship movement and physics application.
 * Server-side version (simplified).
 */
export const ShipPhysics = {
  applyRotation(render: any, input: any, dtSeconds: number, config: any = GAME_CONFIG): void {
    if (input.rotateLeft) render.rotation -= config.SHIP_ROTATION_SPEED * dtSeconds;
    if (input.rotateRight) render.rotation += config.SHIP_ROTATION_SPEED * dtSeconds;
  },

  applyThrust(world: any, position: any, velocity: any, render: any, input: any, dtSeconds: number, config: any = GAME_CONFIG): void {
    if (input.thrust) {
      velocity.dx += Math.cos(render.rotation) * config.SHIP_THRUST * dtSeconds;
      velocity.dy += Math.sin(render.rotation) * config.SHIP_THRUST * dtSeconds;
    }
  },

  applyFriction(velocity: any, dtMs: number, config: any = GAME_CONFIG): void {
    PhysicsUtils.applyFriction(velocity, config.SHIP_FRICTION, dtMs);
  }
};
