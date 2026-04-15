import { World } from "../core/World";
import { Entity, RenderComponent } from "../types/EngineTypes";
import { JuiceSystem } from "../systems/JuiceSystem";

/**
 * Biblioteca centralizada de efectos visuales y "juice" para el motor.
 */
export class Juice {
  /**
   * Aplica un efecto de parpadeo blanco (hit flash) a una entidad.
   */
  public static flash(world: World, entity: Entity, frames: number = 5): void {
    const render = world.getComponent<RenderComponent>(entity, "Render");
    if (render) {
      render.hitFlashFrames = frames;
    }
  }

  /**
   * Aplica un temblor de pantalla.
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
   * Helper estático para añadir una animación a una entidad.
   */
  public static add(world: World, entity: Entity, anim: Omit<import("../systems/JuiceSystem").JuiceAnimation, "elapsed">): void {
    JuiceSystem.add(world, entity, anim);
  }

  /**
   * Efecto de squash & stretch.
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
