import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { AnimatorComponent } from "../ecs/CoreComponents";
import { EventBus } from "../events/EventBus";

/**
 * System responsible for updating frame-based animations.
 *
 * API status: Public
 */
export class AnimationSystem extends System {
  /**
   * Updates animations.
   *
   * @param world - The ECS world.
   * @param deltaTime - Elapsed time in milliseconds [ms].
   */
  public update(world: World, deltaTime: number): void {
    if (world.isReSimulating) return;

    const query = world.getQuery("Animator");

    query.forEach((entity) => {
      const anim = world.getComponent<AnimatorComponent>(entity, "Animator");
      if (!anim || !anim.current) return;

      const currentAnim = anim.animations[anim.current];
      if (!currentAnim) return;

      const frameDuration = 1000 / currentAnim.frameRate;

      world.mutateComponent<AnimatorComponent>(entity, "Animator", (a) => {
        a.elapsed += deltaTime;

        if (a.elapsed >= frameDuration) {
          const framesToAdvance = Math.floor(a.elapsed / frameDuration);
          a.elapsed %= frameDuration;
          a.frame += framesToAdvance;

          const totalFrames = currentAnim.frames.length;

          if (a.frame >= totalFrames) {
            if (currentAnim.loop) {
              a.frame %= totalFrames;
            } else {
              a.frame = totalFrames - 1;

              if (currentAnim.onCompleteEvent) {
                const bus = world.getResource<EventBus>("EventBus");
                if (bus) {
                  bus.emitDeferred(currentAnim.onCompleteEvent, { entity });
                }
              }
            }
          }
        }
      });
    });
  }
}
