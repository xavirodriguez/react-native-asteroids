import { System } from "../core/System";
import { World } from "../core/World";
import { AnimatorComponent } from "../types/EngineTypes";

/**
 * Sistema que gestiona la progresión de frames para entidades con AnimatorComponent.
 *
 * @responsibility Gestionar la progresión de animaciones basadas en frames.
 * @responsibility Manejar bucles (loops) y callbacks de finalización (onComplete).
 *
 * @queries Animator
 * @mutates {@link AnimatorComponent} - Actualiza el índice de `frame` y el tiempo `elapsed`.
 * @executionOrder Fase: Presentation.
 *
 * @remarks
 * El sistema calcula cuántos frames deben avanzar basándose en los FPS de la animación
 * y el `deltaTime` acumulado. Soporta skipping de frames si el tick es lento.
 *
 * @conceptualRisk [PRECISION_DRIFT] El tiempo `elapsed` acumulado usa suma/módulo de punto
 * flotante, lo que puede derivar en sesiones muy largas.
 * @conceptualRisk [FRAME_SKIPPING] Valores grandes de `deltaTime` pueden causar que se
 * salten múltiples frames en un solo ciclo de actualización.
 */
export class AnimationSystem extends System {
  /**
   * Actualiza el frame de animación basado en el tiempo transcurrido.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   *
   * @precondition Las entidades deben poseer un {@link AnimatorComponent}.
   * @postcondition El frame actual y el tiempo transcurrido del animator son actualizados.
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
