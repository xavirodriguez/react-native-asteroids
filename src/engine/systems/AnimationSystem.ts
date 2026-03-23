import { System } from "../core/System";
import { World } from "../core/World";
import { AnimationComponent } from "../../types/GameTypes";

/**
 * System that processes visual animations by updating Animation components.
 * This removes calculation logic (like Math.sin) from the rendering layer.
 */
export class AnimationSystem extends System {
  private time = 0;

  public update(world: World, deltaTime: number): void {
    this.time += deltaTime / 1000;
    const entities = world.query("Animation");

    entities.forEach((entity) => {
      const anim = world.getComponent<AnimationComponent>(entity, "Animation");
      if (!anim) return;

      switch (anim.waveType) {
        case "sine":
          anim.currentValue = Math.sin(this.time * anim.frequency * Math.PI * 2) * anim.amplitude;
          break;
        case "blink":
          anim.currentValue = Math.floor(this.time * anim.frequency) % 2 === 0 ? anim.amplitude : 0;
          break;
        case "linear":
          anim.currentValue = (this.time * anim.frequency) % anim.amplitude;
          break;
      }
    });
  }
}
