import { System } from "../../core/System";
import { World } from "../../core/World";
import { DebugConfigComponent } from "./DebugTypes";
import { PositionComponent, ColliderComponent, VelocityComponent } from "../../core/CoreComponents";

export class DebugSystem extends System {
  private fps: number = 0;
  private frameCount: number = 0;
  private lastTime: number = 0;

  public update(world: World, deltaTime: number): void {
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
        const pos = world.getComponent<PositionComponent>(entity, "Position") ||
                    world.getComponent<any>(entity, "Transform");
        if (!pos) continue;

        if (config.showColliders) {
            const collider = world.getComponent<ColliderComponent>(entity, "Collider");
            if (collider) {
                ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, collider.radius, 0, Math.PI * 2);
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
