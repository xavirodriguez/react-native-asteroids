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
    // Buscamos una entidad que tenga GameState o creamos una para el shake si no existe
    const [gameStateEntity] = world.query("GameState");
    const [flappyStateEntity] = world.query("FlappyState");
    const target = gameStateEntity ?? flappyStateEntity;

    if (target !== undefined) {
      world.addComponent(target, {
        type: "ScreenShake",
        intensity,
        duration,
        remaining: duration
      });
    }
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
