/**
 * @packageDocumentation
 * Runtime debug visualization system.
 * Renders overlays for FPS, colliders, velocities, and entity IDs.
 */

import { System } from "../../core/System";
import { World } from "../../core/World";
import { DebugConfigComponent } from "./DebugTypes";
import { TransformComponent, Collider2DComponent, VelocityComponent } from "../../core/CoreComponents";

/**
 * System that renders debug information over the game.
 *
 * @remarks
 * This system should be updated and rendered last to ensure it overlays all other
 * game and interface elements. It relies on a singleton {@link DebugConfigComponent}
 * to determine which debug features are enabled.
 *
 * @responsibility Track and display the current Frames Per Second (FPS).
 * @responsibility Draw wireframes for active colliders (circles and boxes).
 * @responsibility Visualize velocity vectors for moving entities.
 * @responsibility Label entities with their unique numerical IDs.
 */
export class DebugSystem extends System {
  /** Current frames per second count. */
  private fps: number = 0;
  /** Number of frames rendered since the last second boundary. */
  private frameCount: number = 0;
  /** Timestamp of the last second boundary. */
  private lastTime: number = 0;

  /**
   * Updates the internal FPS counter.
   *
   * @param world - The ECS world.
   * @param _deltaTime - Delta time (unused for FPS calculation as we use Date.now()).
   */
  public update(world: World, _deltaTime: number): void {
    const config = world.getSingleton<DebugConfigComponent>("DebugConfig");
    if (!config) return;

    this.frameCount++;
    const now = Date.now();
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }
  }

  /**
   * Renders debug overlays to the canvas context.
   *
   * @param ctx - Canvas 2D rendering context.
   * @param world - The ECS world.
   *
   * @remarks
   * For each active entity, this method performs component lookups filtered
   * by the current debug configuration.
   *
   * @sideEffect Draws text and paths to the canvas.
   * @performance Can be expensive with many entities, especially when drawing all colliders.
   */
  public renderDebug(ctx: CanvasRenderingContext2D, world: World): void {
    const config = world.getSingleton<DebugConfigComponent>("DebugConfig");
    if (!config) return;

    if (config.showFPS) {
        ctx.fillStyle = "lime";
        ctx.font = "12px monospace";
        ctx.fillText(`FPS: ${this.fps}`, 10, 20);
    }

    const entities = world.getAllEntities();

    for (const entity of entities) {
        const pos = world.getComponent<TransformComponent>(entity, "Transform");
        if (!pos) continue;

        if (config.showColliders) {
            const collider = world.getComponent<Collider2DComponent>(entity, "Collider2D");
            if (collider) {
                ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                if (collider.shape.type === "circle") {
                    ctx.arc(pos.x + collider.offsetX, pos.y + collider.offsetY, collider.shape.radius, 0, Math.PI * 2);
                } else if (collider.shape.type === "aabb") {
                    ctx.rect(pos.x + collider.offsetX - collider.shape.halfWidth, pos.y + collider.offsetY - collider.shape.halfHeight, collider.shape.halfWidth * 2, collider.shape.halfHeight * 2);
                }
                ctx.stroke();
            }
        }

        if (config.showVelocities) {
            const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
            if (vel) {
                ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(pos.x + vel.dx * 0.2, pos.y + vel.dy * 0.2);
                ctx.stroke();
            }
        }

        if (config.showEntityIds) {
            ctx.fillStyle = "white";
            ctx.font = "10px monospace";
            ctx.fillText(`#${entity}`, pos.x, pos.y - 10);
        }
    }
  }
}
