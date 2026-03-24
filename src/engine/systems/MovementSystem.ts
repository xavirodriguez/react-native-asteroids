import { System } from "../core/System";
import { World } from "../core/World";
import { Component } from "../core/Component";

/**
 * Generic system responsible for updating entity positions based on their velocity.
 */
export class MovementSystem extends System {
  constructor(private screenWidth: number, private screenHeight: number) {
    super();
  }

  public update(world: World, deltaTime: number): void {
    const entities = world.query("Position", "Velocity");

    entities.forEach((entity) => {
      const pos = world.getComponent<Component & { x: number; y: number }>(entity, "Position");
      const vel = world.getComponent<Component & { dx: number; dy: number }>(entity, "Velocity");

      if (pos && vel) {
        const dt = deltaTime / 1000;
        pos.x += vel.dx * dt;
        pos.y += vel.dy * dt;

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
