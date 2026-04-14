import { System } from "../core/System";
import { World } from "../core/World";
import { AnimatorComponent } from "../types/EngineTypes";

/**
 * System that manages frame progression for entities with an AnimatorComponent.
 *
 * @responsibility Manages frame-based sprite/property animation progression, handling loops and completion callbacks.
 *
 * @conceptualRisk [PRECISION_DRIFT] Accrued `elapsed` time uses floating-point modulo/addition, which can drift in long sessions.
 * @conceptualRisk [FRAME_SKIPPING] Large `deltaTime` values can cause multiple frames to be advanced in a single update cycle.
 *
 * @mutates {@link AnimatorComponent} - Updates `frame` index and `elapsed` time state.
 *
 * @dependsOn {@link AnimatorComponent}
 */
export class AnimationSystem extends System {
  public update(world: World, deltaTime: number): void {
    const animators = world.query("Animator");
    animators.forEach((entity) => {
      const anim = world.getComponent<AnimatorComponent>(entity, "Animator");
      if (!anim || !anim.animations[anim.current]) return;

      const config = anim.animations[anim.current];
      anim.elapsed += deltaTime;

      const frameDuration = 1000 / config.fps;
      const totalFrames = config.frames.length;

      if (anim.elapsed >= frameDuration) {
        const framesToAdvance = Math.floor(anim.elapsed / frameDuration);
        anim.elapsed %= frameDuration;

        const nextFrameIdx = anim.frame + framesToAdvance;

        if (nextFrameIdx >= totalFrames) {
          if (config.loop) {
            anim.frame = nextFrameIdx % totalFrames;
          } else {
            anim.frame = totalFrames - 1;
            config.onComplete?.(entity);
          }
        } else {
          anim.frame = nextFrameIdx;
        }
      }
    });
  }
}
