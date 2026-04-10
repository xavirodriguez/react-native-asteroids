import { World } from "../core/World";
import { Entity, RenderComponent } from "../types/EngineTypes";
import { JuiceSystem } from "../systems/JuiceSystem";

/**
 * Biblioteca centralizada de utilidades estáticas para añadir "juice" (efectos visuales reactivos) al motor.
 * Facilita la creación de animaciones procedimentales comunes como parpadeos, sacudidas y squash/stretch.
 *
 * @responsibility Proveer una interfaz simplificada para disparar efectos visuales complejos.
 * @packageDocumentation
 */
export class Juice {
  /**
   * Aplica un efecto de parpadeo blanco (hit flash) a una entidad.
   * Útil para indicar daño o impactos de forma inmediata.
   *
   * @param world - El mundo ECS.
   * @param entity - ID de la entidad a flashear.
   * @param frames - Duración del efecto en fotogramas de renderizado.
   */
  public static flash(world: World, entity: Entity, frames: number = 5): void {
    const render = world.getComponent<RenderComponent>(entity, "Render");
    if (render) {
      render.hitFlashFrames = frames;
    }
  }

  /**
   * Aplica un temblor de pantalla (Screen Shake).
   * Intenta localizar una entidad de estado global para aplicar el componente de sacudida.
   *
   * @param world - El mundo ECS.
   * @param intensity - Magnitud máxima del desplazamiento en píxeles.
   * @param duration - Tiempo total de la sacudida en milisegundos.
   *
   * @sideEffect Añade o sobrescribe el componente `ScreenShake` en una entidad de estado.
   */
  public static shake(world: World, intensity: number = 5, duration: number = 200): void {
    let [shakeEntity] = world.query("ScreenShake");

    if (shakeEntity === undefined) {
      // Intentamos reutilizar una entidad de estado existente o creamos una nueva
      const states = ["GameState", "FlappyState", "PongState", "AsteroidsState"];
      for (const stateType of states) {
        const [entity] = world.query(stateType);
        if (entity !== undefined) {
          shakeEntity = entity;
          break;
        }
      }

      if (shakeEntity === undefined) {
        shakeEntity = world.createEntity();
      }
    }

    world.addComponent(shakeEntity, {
      type: "ScreenShake",
      intensity,
      duration,
      remaining: duration
    });
  }

  /**
   * Efecto de escalado elástico (pop).
   * La entidad se agranda rápidamente y luego regresa a su tamaño original con un rebote elástico.
   */
  public static pop(world: World, entity: Entity, scale: number = 1.2, duration: number = 100): void {
    JuiceSystem.add(world, entity, {
      property: "scaleX",
      target: scale,
      duration: duration / 2,
      easing: "easeOut",
      onComplete: (e) => {
        JuiceSystem.add(world, e, { property: "scaleX", target: 1, duration: duration, easing: "elasticOut" });
      }
    });
    JuiceSystem.add(world, entity, {
      property: "scaleY",
      target: scale,
      duration: duration / 2,
      easing: "easeOut",
      onComplete: (e) => {
        JuiceSystem.add(world, e, { property: "scaleY", target: 1, duration: duration, easing: "elasticOut" });
      }
    });
  }

  /**
   * Helper estático para añadir una animación de Juice genérica a una entidad.
   */
  public static add(world: World, entity: Entity, anim: any): void {
    JuiceSystem.add(world, entity, anim);
  }

  /**
   * Efecto de Squash & Stretch.
   * Deforma la escala X e Y de forma inversa para simular compresión física.
   *
   * @param sx - Escala X objetivo.
   * @param sy - Escala Y objetivo.
   */
  public static squash(world: World, entity: Entity, sx: number = 1.5, sy: number = 0.5, duration: number = 100): void {
    JuiceSystem.add(world, entity, {
      property: "scaleX",
      target: sx,
      duration: duration,
      easing: "easeOut",
      onComplete: (e) => {
        JuiceSystem.add(world, e, { property: "scaleX", target: 1, duration: duration * 2, easing: "elasticOut" });
      }
    });
    JuiceSystem.add(world, entity, {
      property: "scaleY",
      target: sy,
      duration: duration,
      easing: "easeOut",
      onComplete: (e) => {
        JuiceSystem.add(world, e, { property: "scaleY", target: 1, duration: duration * 2, easing: "elasticOut" });
      }
    });
  }
}
