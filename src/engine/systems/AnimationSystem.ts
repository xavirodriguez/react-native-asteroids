import { System } from "../core/System";
import { World } from "../core/World";
import { AnimatorComponent } from "../types/EngineTypes";

/**
 * Sistema que gestiona la progresión de fotogramas (frames) para entidades con un componente Animator.
 *
 * @responsibility Incrementar el tiempo transcurrido en las animaciones activas.
 * @responsibility Cambiar el índice de fotograma actual basado en los FPS configurados.
 * @responsibility Gestionar el bucle (loop) o la finalización de secuencias animadas.
 * @queries Animator
 * @mutates Animator
 * @executionOrder Fase: Presentation.
 *
 * @conceptualRisk [FPS_INCONSISTENCY][LOW] Si la tasa de fotogramas del sistema varía bruscamente,
 * las animaciones pueden saltar fotogramas para mantenerse al día con el tiempo real.
 */
export class AnimationSystem extends System {
  /**
   * Actualiza el estado de todos los animadores en el mundo.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   *
   * @invariant Una animación sin `loop` permanecerá en el último fotograma al finalizar.
   */
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
