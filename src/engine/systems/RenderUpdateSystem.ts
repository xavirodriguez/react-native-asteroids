import { System } from "../core/System";
import { World } from "../core/World";
import { RenderComponent, TransformComponent } from "../core/CoreComponents";

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
    const entities = world.query("Transform", "Render");
    entities.forEach((entity) => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const render = world.getComponent<RenderComponent>(entity, "Render");

      if (pos && render && render.trailPositions) {
        render.trailPositions.push({ x: pos.x, y: pos.y });
        if (render.trailPositions.length > this.trailMaxLength) {
          render.trailPositions.shift();
        }
      }
    });

    // Support game-specific trail components (like Asteroids Ship)
    const shipEntities = world.query("Transform", "Ship");
    shipEntities.forEach((entity) => {
        const pos = world.getComponent<TransformComponent>(entity, "Transform");
        const ship = world.getComponent<any>(entity, "Ship");

        if (pos && ship && ship.trailPositions) {
            ship.trailPositions.push({ x: pos.x, y: pos.y });
            if (ship.trailPositions.length > this.trailMaxLength) {
                ship.trailPositions.shift();
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
