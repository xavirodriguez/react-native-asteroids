import { World } from "@tiny-aster/core";
import { System } from "@tiny-aster/core";
import { VelocityComponent } from "@tiny-aster/core";
import { PongConfig } from "../types/PongConfigSchema";
import { type PongComponentRegistry } from "../types";

/**
 * System that ensures ball velocity remains within safe bounds.
 * Prevents Infinity and extreme speeds that could corrupt the game state.
 */
export class PongVelocityGuardrailSystem extends System<PongComponentRegistry> {
  private config?: PongConfig;

  public update(world: World<PongComponentRegistry>, _deltaTime: number): void {
    if (!this.config) {
      this.config = world.getResource<PongConfig>("GameConfig")!;
    }

    const balls = world.query("Ball", "Velocity");
    const maxSpeed = this.config.BALL_SPEED_START * 10;

    balls.forEach(entity => {
      world.mutateComponent(entity, "Velocity", (vel: VelocityComponent) => {
        // 1. Check for non-finite values
        if (!Number.isFinite(vel.vx) || !Number.isFinite(vel.vy)) {
          // If corrupted, reset to a safe initial speed
          vel.vx = vel.vx < 0 || Object.is(vel.vx, -0) ? -this.config!.BALL_SPEED_START : this.config!.BALL_SPEED_START;
          vel.vy = 0;

          if (world.debugMode) {
             console.warn(`[PongVelocityGuardrailSystem] Fixed non-finite velocity for entity ${entity}`);
          }
        }

        // 2. Clamp magnitude
        const speedSq = vel.vx * vel.vx + vel.vy * vel.vy;
        if (speedSq > maxSpeed * maxSpeed) {
          const speed = Math.sqrt(speedSq);
          const factor = maxSpeed / speed;
          vel.vx *= factor;
          vel.vy *= factor;

          if (world.debugMode) {
            console.debug(`[PongVelocityGuardrailSystem] Clamped velocity for entity ${entity} to ${maxSpeed}`);
          }
        }
      });
    });
  }
}
