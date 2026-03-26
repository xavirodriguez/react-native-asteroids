import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { PositionComponent, UfoComponent } from "../../../types/GameTypes";

/**
 * System responsible for UFO-specific movement (sinusoidal).
 */
export class UfoSystem extends System {
  public update(world: World, deltaTime: number): void {
    const ufos = world.query("Ufo", "Position");
    ufos.forEach((entity) => {
      const ufo = world.getComponent<UfoComponent>(entity, "Ufo");
      const pos = world.getComponent<PositionComponent>(entity, "Position");

      if (ufo && pos) {
        ufo.time += deltaTime / 1000;
        // Apply sinusoidal movement to the Y axis relative to the base Y
        pos.y = ufo.baseY + Math.sin(ufo.time * 2) * 40;
      }
    });
  }
}
