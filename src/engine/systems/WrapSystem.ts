import { System } from "../core/System";
import { World } from "../core/World";
import { PositionComponent } from "../types/EngineTypes";

/**
 * Generic system that wraps entity positions around screen boundaries.
 * Useful for games like Asteroids.
 */
export class WrapSystem extends System {
  constructor(private screenWidth: number, private screenHeight: number) {
    super();
  }

  public update(world: World, deltaTime: number): void {
    void deltaTime;
    const entities = world.query("Position");

    entities.forEach((entity) => {
      // UFOs handle their own off-screen removal, so they should not wrap
      if (world.hasComponent(entity, "Ufo")) {
        return;
      }

      const pos = world.getComponent<PositionComponent>(entity, "Position");
      if (pos) {
        this.wrapPosition(pos);
      }
    });
  }

  private wrapPosition(pos: { x: number; y: number }): void {
    if (pos.x < 0) pos.x = this.screenWidth;
    else if (pos.x > this.screenWidth) pos.x = 0;

    if (pos.y < 0) pos.y = this.screenHeight;
    else if (pos.y > this.screenHeight) pos.y = 0;
  }
}
