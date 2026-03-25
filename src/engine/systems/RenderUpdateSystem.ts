import { System } from "../core/System";
import { World } from "../core/World";
import { PositionComponent, RenderComponent } from "../types/EngineTypes";
import { ShipComponent } from "../../types/GameTypes";

/**
 * Generic rendering-related updates (rotation, trails, flashes).
 */
export class RenderUpdateSystem extends System {
  private trailMaxLength: number;

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

  private updateTrails(world: World): void {
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
          if (!shipComp.trail) shipComp.trail = [];
          shipComp.trail.push({ x: pos.x, y: pos.y });
          if (shipComp.trail.length > this.trailMaxLength) {
            shipComp.trail.shift();
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
