import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent, VelocityComponent } from "../../../engine/types/EngineTypes";
import { UfoComponent, GAME_CONFIG } from "../types/AsteroidTypes";

/**
 * System responsible for UFO-specific movement logic.
 * UFOs move across the screen and have a sinusoidal vertical oscillation.
 */
export class UfoSystem extends System {
  public update(world: World, deltaTime: number): void {
    const ufos = world.query("Ufo", "Transform", "Velocity");
    const dt = deltaTime / 1000;

    ufos.forEach((entity) => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
      const ufo = world.getComponent<UfoComponent>(entity, "Ufo");

      if (pos && vel && ufo) {
        ufo.time += dt;

        // Update vertical position with sine wave oscillation
        // Oscillation amplitude: 30, frequency: 2 rad/s
        pos.y = ufo.baseY + Math.sin(ufo.time * 2) * 30;

        // UFOs that go off-screen horizontally are removed
        if (pos.x < -50 || pos.x > GAME_CONFIG.SCREEN_WIDTH + 50) {
          world.removeEntity(entity);
        }
      }
    });
  }
}
