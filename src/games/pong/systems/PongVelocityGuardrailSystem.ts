import { World } from "../../../engine/core/World";
import { System } from "../../../engine/core/System";
import { VelocityComponent } from "../../../engine/types/EngineTypes";
import { PongConfig } from "../types/PongConfigSchema";

/**
 * System that ensures ball velocity remains within safe bounds.
 * Prevents Infinity and extreme speeds that could corrupt the game state.
 */
export class PongVelocityGuardrailSystem extends System {
  private config?: PongConfig;

  public update(world: World, _deltaTime: number): void {
    if (!this.config) {
      this.config = world.getResource<PongConfig>("GameConfig")!;
    }

    const balls = world.query("Ball", "Velocity");
    const maxSpeed = this.config.BALL_SPEED_START * 10;

    balls.forEach(entity => {
      world.mutateComponent<VelocityComponent>(entity, "Velocity", vel => {
        // 1. Check for non-finite values
        if (!Number.isFinite(vel.dx) || !Number.isFinite(vel.dy)) {
          // If corrupted, reset to a safe initial speed
          vel.dx = vel.dx < 0 || Object.is(vel.dx, -0) ? -this.config!.BALL_SPEED_START : this.config!.BALL_SPEED_START;
          vel.dy = 0;

          if (world.debugMode) {
             console.warn(`[PongVelocityGuardrailSystem] Fixed non-finite velocity for entity ${entity}`);
          }
        }

        // 2. Clamp magnitude
        const speedSq = vel.dx * vel.dx + vel.dy * vel.dy;
        if (speedSq > maxSpeed * maxSpeed) {
          const speed = Math.sqrt(speedSq);
          const factor = maxSpeed / speed;
          vel.dx *= factor;
          vel.dy *= factor;

          if (world.debugMode) {
            console.debug(`[PongVelocityGuardrailSystem] Clamped velocity for entity ${entity} to ${maxSpeed}`);
          }
        }
      });
    });
  }
}
