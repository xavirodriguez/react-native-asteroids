import { System } from "../core/System";
import { World } from "../core/World";
import { RenderComponent, TransformComponent, TrailComponent } from "../core/CoreComponents";

/**
 * Sistema de preparación visual y efectos cosméticos.
 */
export class RenderUpdateSystem extends System {
  protected trailMaxLength: number;

  constructor(trailMaxLength: number = 10) {
    super();
    this.trailMaxLength = trailMaxLength;
  }

  public update(world: World, deltaTime: number): void {
    this.updateTrails(world);
    this.updateRotation(world, deltaTime);
    this.updateHitFlashes(world);
    world.notifyStateChange();
  }

  protected updateTrails(world: World): void {
    const entities = world.query("Transform", "Trail");
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      if (!pos) continue;

      world.mutateComponent<TrailComponent>(entity, "Trail", trail => {
        trail.currentIndex = (trail.currentIndex + 1) % trail.maxLength;
        if (!trail.points[trail.currentIndex]) {
          trail.points[trail.currentIndex] = { x: pos.x, y: pos.y };
        } else {
          const point = trail.points[trail.currentIndex];
          point.x = pos.x;
          point.y = pos.y;
        }
        if (trail.count < trail.maxLength) {
          trail.count++;
        }
      });
    }
  }

  private updateRotation(world: World, deltaTime: number): void {
    const entities = world.query("Render");
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const render = world.getComponent<RenderComponent>(entity, "Render");

      if (render && render.angularVelocity) {
        const offset = world.getComponent<import("../core/CoreComponents").VisualOffsetComponent>(entity, "VisualOffset");
        if (!offset) {
          world.getCommandBuffer().addComponent(entity, {
            type: "VisualOffset", x: 0, y: 0, rotation: 0, scaleX: 0, scaleY: 0
          } as import("../core/CoreComponents").VisualOffsetComponent);
        } else {
          world.mutateComponent(entity, "VisualOffset", (v: import("../core/CoreComponents").VisualOffsetComponent) => {
            v.rotation += render.angularVelocity! * (deltaTime / 16.67);
          });
        }
      }
    }
  }

  private updateHitFlashes(world: World): void {
    const entities = world.query("Render");
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      world.mutateComponent<RenderComponent>(entity, "Render", render => {
        if (render.hitFlashFrames && render.hitFlashFrames > 0) {
          render.hitFlashFrames--;
        }
      });
    }
  }
}
