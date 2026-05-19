import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent } from "../../../engine/types/EngineTypes";
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
      const ufo = world.getComponent<UfoComponent>(entity, "Ufo");

      if (pos && ufo) {
        world.mutateComponent(entity, "Ufo", (u: UfoComponent) => {
          u.time += dt;
        });

        // Update vertical position with sine wave oscillation
        world.mutateComponent(entity, "Transform", (t: TransformComponent) => {
          t.y = ufo.baseY + Math.sin(ufo.time * 2) * 30;
        });

        // UFOs that go off-screen horizontally are removed
        if (pos.x < -50 || pos.x > GAME_CONFIG.SCREEN_WIDTH + 50) {
          world.getCommandBuffer().removeEntity(entity);
        }
      }
    });
  }
}
