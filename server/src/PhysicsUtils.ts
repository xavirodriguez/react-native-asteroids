import { TransformComponent, VelocityComponent } from "../../src/engine/core/CoreComponents";

/**
 * Shared physics integration utilities to ensure consistency between
 * engine systems and game-level predictions.
 */
export class PhysicsUtils {
  /**
   * Applies linear integration to update position based on velocity.
   */
  public static integrateMovement(pos: TransformComponent, vel: VelocityComponent, deltaTimeInSeconds: number): void {
    pos.x += vel.dx * deltaTimeInSeconds;
    pos.y += vel.dy * deltaTimeInSeconds;
  }

  /**
   * Applies friction damping to velocity.
   * @param friction - The friction coefficient (e.g., 0.99)
   * @param deltaTimeMs - Elapsed time in milliseconds.
   */
  public static applyFriction(vel: VelocityComponent, friction: number, deltaTimeMs: number): void {
    const dtFactor = deltaTimeMs / (1000 / 60);
    const frictionFactor = Math.pow(friction, dtFactor);
    vel.dx *= frictionFactor;
    vel.dy *= frictionFactor;
  }

  /**
   * Wraps coordinates around a screen boundary.
   */
  public static wrapBoundary(pos: TransformComponent, width: number, height: number): void {
    if (pos.x < 0) pos.x = width;
    else if (pos.x > width) pos.x = 0;
    if (pos.y < 0) pos.y = height;
    else if (pos.y > height) pos.y = 0;
  }
}
