import { TransformComponent, PhysicsBody2DComponent, VelocityComponent } from "../../types/EngineTypes";

/**
 * Minimal interface for objects representing a position in 2D space.
 *
 * @public
 */
export interface PositionLike {
  /** [px] Local X coordinate. */
  x?: number;
  /** [px] Local Y coordinate. */
  y?: number;
  /** [px] Absolute World X coordinate. */
  worldX?: number;
  /** [px] Absolute World Y coordinate. */
  worldY?: number;
  [key: string]: unknown;
}

/**
 * Minimal interface for objects representing velocity in 2D space.
 *
 * @public
 */
export interface VelocityLike {
  /** [px/s] Linear velocity X. */
  dx?: number;
  /** [px/s] Linear velocity Y. */
  dy?: number;
  /** [px/s] Physics-specific linear velocity X. */
  velocityX?: number;
  /** [px/s] Physics-specific linear velocity Y. */
  velocityY?: number;
  [key: string]: unknown;
}

/**
 * Shared physical integration utilities.
 *
 * @responsibility Provide standard integration algorithms (Euler/Damping).
 * @responsibility Centralize unit conversions (ms vs seconds).
 *
 * @remarks
 * It is critical that both simulation Systems and client-side prediction logic
 * use these utilities to prevent "Implementation Drift" which leads to
 * networking desyncs.
 *
 * @public
 */
export class PhysicsUtils {
  /**
   * Performs Semi-Implicit Euler integration to update position.
   *
   * @remarks
   * Formula: `P_new = P_old + V * dt`.
   * Efficient and deterministic, but prone to "tunnelling" at extreme
   * velocities or low framerates.
   *
   * @param pos - Position object (local or world).
   * @param vel - Velocity object (standard or physics).
   * @param deltaTimeInSeconds - Elapsed time in SECONDS.
   *
   * @precondition `deltaTimeInSeconds` must be a finite positive value.
   * @postcondition Coordinates in `pos` are updated.
   * @sideEffect Mutates `pos` directly by reference.
   *
   * @conceptualRisk [PRECISION_LOSS][LOW] Accumulation of floating-point errors
   * over long sessions may cause minor divergence between clients.
   */
  public static integrateMovement(pos: PositionLike, vel: VelocityLike, deltaTimeInSeconds: number): void {
    // Priority: local coordinates (x, y) over world coordinates (worldX, worldY)
    const hasLocal = pos.x !== undefined && pos.y !== undefined;
    const xKey = hasLocal ? "x" : "worldX";
    const yKey = hasLocal ? "y" : "worldY";

    // Priority: standard delta (dx, dy) over physics velocity (velocityX, velocityY)
    const hasDelta = vel.dx !== undefined && vel.dy !== undefined;
    const dxKey = hasDelta ? "dx" : "velocityX";
    const dyKey = hasDelta ? "dy" : "velocityY";

    const currentX = (pos[xKey] as number) || 0;
    const currentY = (pos[yKey] as number) || 0;
    const vx = (vel[dxKey] as number) || 0;
    const vy = (vel[dyKey] as number) || 0;

    (pos as Record<string, number>)[xKey] = currentX + vx * deltaTimeInSeconds;
    (pos as Record<string, number>)[yKey] = currentY + vy * deltaTimeInSeconds;
  }

  /**
   * Applies friction damping to velocity.
   *
   * @remarks
   * Utilizes an exponential function based on time to ensure damping is
   * frame-rate independent.
   *
   * @param vel - Velocity object to damp.
   * @param friction - Friction coefficient (typically [0, 1]).
   * @param deltaTimeMs - Elapsed time in MILLISECONDS.
   *
   * @sideEffect Mutates `vel` directly by reference.
   */
  public static applyFriction(vel: VelocityLike, friction: number, deltaTimeMs: number): void {
    const dx = vel.dx !== undefined ? "dx" : "velocityX";
    const dy = vel.dy !== undefined ? "dy" : "velocityY";

    const dtFactor = deltaTimeMs / (1000 / 60);
    const frictionFactor = Math.pow(friction, dtFactor);
    if (vel[dx] !== undefined) (vel as Record<string, number>)[dx] = (vel[dx] as number) * frictionFactor;
    if (vel[dy] !== undefined) (vel as Record<string, number>)[dy] = (vel[dy] as number) * frictionFactor;
  }

  /**
   * Wraps coordinates around a screen boundary.
   *
   * @param pos - Transform to wrap.
   * @param width - [px] Boundary width.
   * @param height - [px] Boundary height.
   * @param minX - [px] Start X.
   * @param minY - [px] Start Y.
   */
  public static wrapBoundary(pos: TransformComponent, width: number, height: number, minX: number = 0, minY: number = 0): void {
    const maxX = minX + width;
    const maxY = minY + height;

    if (pos.x < minX) pos.x = maxX;
    else if (pos.x > maxX) pos.x = minX;
    if (pos.y < minY) pos.y = maxY;
    else if (pos.y > maxY) pos.y = minY;
  }

  /**
   * Bounces an entity off screen boundaries.
   *
   * @param pos - Transform to update.
   * @param vel - Velocity to invert.
   */
  public static bounceBoundary(
    pos: TransformComponent,
    vel: VelocityComponent,
    width: number,
    height: number,
    minX: number = 0,
    minY: number = 0,
    bounceX: boolean = true,
    bounceY: boolean = true
  ): void {
    const maxX = minX + width;
    const maxY = minY + height;

    if (bounceX) {
      if (pos.x < minX) {
        pos.x = minX;
        vel.dx *= -1;
      } else if (pos.x > maxX) {
        pos.x = maxX;
        vel.dx *= -1;
      }
    }

    if (bounceY) {
      if (pos.y < minY) {
        pos.y = minY;
        vel.dy *= -1;
      } else if (pos.y > maxY) {
        pos.y = maxY;
        vel.dy *= -1;
      }
    }
  }

  /**
   * Synchronizes mass and inertia with their respective inverse properties.
   *
   * @remarks
   * Required after manual mass changes to ensure simulation correctness,
   * as the engine uses inverse properties for impulse calculations.
   *
   * @param body - The rigid body component to update.
   * @param mass - [kg] New mass (> 0 for dynamic, 0 for static).
   * @param inertia - New rotational inertia.
   *
   * @sideEffect Mutates `inverseMass` and `inverseInertia` properties.
   */
  public static updateBodyMassProperties(body: PhysicsBody2DComponent, mass: number, inertia: number): void {
    const mutableBody = body as { -readonly [K in keyof PhysicsBody2DComponent]: PhysicsBody2DComponent[K] };
    mutableBody.mass = mass;
    mutableBody.inverseMass = mass > 0 ? 1 / mass : 0;
    mutableBody.inertia = inertia;
    mutableBody.inverseInertia = inertia > 0 ? 1 / inertia : 0;
  }
}
