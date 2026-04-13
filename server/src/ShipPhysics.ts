import { PhysicsUtils } from "./PhysicsUtils";
import { RenderComponent, VelocityComponent, Component, TransformComponent } from "../../src/engine/core/CoreComponents";
import { World } from "../../src/engine/core/World";

const GAME_CONFIG = {
  SHIP_THRUST: 200,
  SHIP_ROTATION_SPEED: 3,
  SHIP_FRICTION: 0.99,
};

type ShipConfig = typeof GAME_CONFIG;
type ShipInput = Component & { rotateLeft: boolean; rotateRight: boolean; thrust: boolean };

/**
 * Shared logic for ship movement and physics application.
 * Server-side version (simplified).
 */
export const ShipPhysics = {
  applyRotation(render: RenderComponent, input: ShipInput, dtSeconds: number, config: ShipConfig = GAME_CONFIG): void {
    if (input.rotateLeft) render.rotation -= config.SHIP_ROTATION_SPEED * dtSeconds;
    if (input.rotateRight) render.rotation += config.SHIP_ROTATION_SPEED * dtSeconds;
  },

  applyThrust(_world: World, _position: TransformComponent, velocity: VelocityComponent, render: RenderComponent, input: ShipInput, dtSeconds: number, config: ShipConfig = GAME_CONFIG): void {
    if (input.thrust) {
      velocity.dx += Math.cos(render.rotation) * config.SHIP_THRUST * dtSeconds;
      velocity.dy += Math.sin(render.rotation) * config.SHIP_THRUST * dtSeconds;
    }
  },

  applyFriction(velocity: VelocityComponent, dtMs: number, config: ShipConfig = GAME_CONFIG): void {
    PhysicsUtils.applyFriction(velocity, config.SHIP_FRICTION, dtMs);
  }
};
