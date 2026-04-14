import { World } from "../../../engine/core/World";
import { TransformComponent, VelocityComponent, RenderComponent } from "../../../engine/types/EngineTypes";
import { InputComponent, GAME_CONFIG } from "../types/AsteroidTypes";
import { PhysicsUtils } from "../../../engine/utils/PhysicsUtils";
import { RandomService } from "../../../engine/utils/RandomService";
import { createParticle } from "../EntityFactory";
import { SimulationContext } from "../../../simulation/DeterministicSimulation";

/**
 * Shared logic for ship movement and physics application.
 * Can be used by both the client and server/prediction.
 */
export const ShipPhysics = {
  applyRotation(render: RenderComponent, input: InputComponent, dtSeconds: number, config: typeof GAME_CONFIG = GAME_CONFIG): void {
    if (input.rotateLeft) render.rotation -= config.SHIP_ROTATION_SPEED * dtSeconds;
    if (input.rotateRight) render.rotation += config.SHIP_ROTATION_SPEED * dtSeconds;
  },

  applyThrust(world: World, position: TransformComponent, velocity: VelocityComponent, render: RenderComponent, input: InputComponent, dtSeconds: number, ctx?: SimulationContext, config: typeof GAME_CONFIG = GAME_CONFIG): void {
    if (input.thrust) {
      velocity.dx += Math.cos(render.rotation) * config.SHIP_THRUST * dtSeconds;
      velocity.dy += Math.sin(render.rotation) * config.SHIP_THRUST * dtSeconds;

      if (ctx?.isResimulating) return;

      // Particles are visual only, use render random
      const renderRandom = RandomService.getInstance("render");
      const currentSpeed = Math.sqrt(velocity.dx * velocity.dx + velocity.dy * velocity.dy);
      const intensity = Math.min(1.5, 0.5 + currentSpeed / 200);

      const particleCount = Math.floor((3 + Math.floor(renderRandom.next() * 3)) * intensity);
      for (let i = 0; i < particleCount; i++) {
        const angle = render.rotation + Math.PI + (renderRandom.next() - 0.5) * 0.4;
        const speed = (50 + renderRandom.next() * 80) * intensity;

        let color = "#FF8800";
        if (currentSpeed > 200) color = "#44AAFF";
        if (currentSpeed > 350) color = "#FFFFFF";

        createParticle({
          world,
          x: position.x - Math.cos(render.rotation) * 10,
          y: position.y - Math.sin(render.rotation) * 10,
          dx: Math.cos(angle) * speed + velocity.dx * 0.5,
          dy: Math.sin(angle) * speed + velocity.dy * 0.5,
          color: color,
          ttl: 300 + renderRandom.next() * 200,
          size: (1 + renderRandom.next() * 2) * intensity,
        });
      }
    }
  },

  applyFriction(velocity: VelocityComponent, dtMs: number, config: typeof GAME_CONFIG = GAME_CONFIG): void {
    PhysicsUtils.applyFriction(velocity, config.SHIP_FRICTION, dtMs);
  }
};
