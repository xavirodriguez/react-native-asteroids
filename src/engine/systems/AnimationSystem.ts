import { System } from "../core/System";
import { World } from "../core/World";
import { AnimatorComponent } from "../types/EngineTypes";

/**
 * System managing frame progression for entities with an Animator component.
 *
 * @responsibility Handle frame progression for sprite or property animations.
 * @responsibility Manage loops and execute completion hooks.
 *
 * @remarks
 * El sistema calcula cuántos frames deben avanzar basándose en los FPS de la animación
 * y el `deltaTime` acumulado. Soporta skipping de frames si el tick es lento.
 *
 * ### Execution Order:
 * Typically runs in the `Presentation` phase.
 *
 * @conceptualRisk [PRECISION_DRIFT] Accumulated `elapsed` time uses
 * floating-point arithmetic, which may drift in extremely long sessions.
 * @conceptualRisk [FRAME_SKIPPING] High `deltaTime` spikes can cause multiple
 * frames to be skipped in a single update.
 *
 * @public
 */
export class AnimationSystem extends System {
  /**
   * Updates animation frames for all active animators.
   *
   * @param world - Target ECS world.
   * @param deltaTime - [ms] Elapsed time since last update.
   *
   * @postcondition The `frame` index and `elapsed` time of {@link AnimatorComponent} are updated.
   */
  public update(world: World, deltaTime: number): void {
    const animators = world.query("Animator");
    for (let i = 0; i < animators.length; i++) {
      const entity = animators[i];
      const anim = world.getComponent<AnimatorComponent>(entity, "Animator");
      if (!anim || !anim.animations[anim.current]) continue;

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
    }
  }
}
