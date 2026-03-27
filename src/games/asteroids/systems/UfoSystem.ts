import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { PositionComponent } from "../../../engine/types/EngineTypes";
import { UfoComponent } from "../../../types/GameTypes";

/**
 * System to handle UFO-specific behaviors like sinusoidal movement.
 */
export class UfoSystem extends System {
  public update(world: World, deltaTime: number): void {
    const ufos = world.query("Ufo", "Position");

    ufos.forEach((entity) => {
      const ufo = world.getComponent<UfoComponent>(entity, "Ufo");
      const pos = world.getComponent<PositionComponent>(entity, "Position");

      if (ufo && pos) {
        ufo.time += deltaTime / 1000;
        // Sinusoidal vertical movement: baseY + sin(time * frequency) * amplitude
        pos.y = ufo.baseY + Math.sin(ufo.time * 2) * 50;
      }
    });
  }
}
