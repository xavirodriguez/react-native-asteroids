import { System } from "../../core/System";
import { World } from "../../core/World";
import { DebugConfigComponent } from "./DebugTypes";
import { TransformComponent, Collider2DComponent, VelocityComponent } from "../../core/CoreComponents";

/**
 * Sistema de depuración para visualización de métricas y componentes internos.
 *
 * @conceptualRisk [DETERMINISM][LOW] El uso de `Date.now()` para el cálculo de FPS
 * es aceptable en un sistema de depuración, pero debe evitarse en la lógica de juego.
 */
export class DebugSystem extends System {
  private fps: number = 0;
  private frameCount: number = 0;
  private lastTime: number = 0;

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
