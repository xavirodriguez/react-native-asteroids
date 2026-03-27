import { System } from "../core/System";
import { World } from "../core/World";
import { PositionComponent, RenderComponent } from "../types/EngineTypes";

/**
 * Generic rendering-related updates (rotation, trails, flashes).
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
    world.version++;
  }

  protected updateTrails(world: World): void {
    const entities = world.query("Position", "Render");
    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      const render = world.getComponent<RenderComponent>(entity, "Render");

      if (pos && render && render.trailPositions) {
        render.trailPositions.push({ x: pos.x, y: pos.y });
        if (render.trailPositions.length > this.trailMaxLength) {
          render.trailPositions.shift();
        }
      }

      // Improvement 2: Ship trail
      if (world.hasComponent(entity, "Ship")) {
        const shipComp = world.getComponent<ShipComponent>(entity, "Ship");
        if (pos && shipComp) {
          if (!shipComp.trailPositions) shipComp.trailPositions = [];

          // Only add to trail if moving
          shipComp.trailPositions.push({ x: pos.x, y: pos.y });

          if (shipComp.trailPositions.length > 12) {
            shipComp.trailPositions.shift();
          }
        }
      }

      // Improvement 16: Bullet streaks
      if (world.hasComponent(entity, "Bullet")) {
        if (pos && render) {
          if (!render.trailPositions) render.trailPositions = [];
          render.trailPositions.push({ x: pos.x, y: pos.y });
          if (render.trailPositions.length > 6) {
            render.trailPositions.shift();
          }
        }
      }

      // Improvement 20: Motion blur tracking (fast entities)
      if (render && pos && !world.hasComponent(entity, "Bullet") && !world.hasComponent(entity, "Ship")) {
        const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
        if (vel) {
          const speed = Math.sqrt(vel.dx * vel.dx + vel.dy * vel.dy);
          if (speed > 200) {
            if (!render.trailPositions) render.trailPositions = [];
            render.trailPositions.push({ x: pos.x, y: pos.y });
            if (render.trailPositions.length > 4) {
              render.trailPositions.shift();
            }
          } else if (render.trailPositions && render.trailPositions.length > 0) {
            render.trailPositions.shift(); // Fade out when slow
          }
        }
      }
    });
  }

  private updateRotation(world: World, deltaTime: number): void {
    const entities = world.query("Render");
    entities.forEach((entity) => {
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (render && render.angularVelocity) {
        render.rotation += render.angularVelocity * (deltaTime / 16.67);
      }
    });
  }

  private updateHitFlashes(world: World): void {
    const entities = world.query("Render");
    entities.forEach((entity) => {
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (render && render.hitFlashFrames && render.hitFlashFrames > 0) {
        render.hitFlashFrames--;
      }
    });
  }
}
