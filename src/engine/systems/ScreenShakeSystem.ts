import { System } from "../core/System";
import { World } from "../core/World";
import { ScreenShakeComponent } from "../types/EngineTypes";

/**
 * Generic Screen Shake System for the TinyAsterEngine.
 * Manages the countdown of shake duration.
 */
export class ScreenShakeSystem extends System {
  /**
   * Updates screen shake timer.
   */
  public update(world: World, deltaTime: number): void {
    void deltaTime;
    const shakeEntity = world.query("ScreenShake")[0];
    if (shakeEntity === undefined) return;

    const shake = world.getComponent<ScreenShakeComponent>(shakeEntity, "ScreenShake");
    if (shake?.config && shake.config.duration > 0) {
      shake.config.duration--;
      if (shake.config.duration <= 0) {
        shake.config = null;
      }
    }
  }
}
