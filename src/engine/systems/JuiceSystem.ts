import { Component, Entity, TransformComponent, RenderComponent } from "../types/EngineTypes";
import { System } from "../core/System";
import { World } from "../core/World";

export interface JuiceAnimation {
  property: "scaleX" | "scaleY" | "rotation" | "x" | "y" | "opacity";
  target: number;
  duration: number; // en ms
  elapsed: number;
  startValue?: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "elasticOut";
  onComplete?: (entity: Entity) => void;
}

export interface JuiceComponent extends Component {
  type: "Juice";
  animations: JuiceAnimation[];
}

/**
 * Helper para crear un JuiceComponent inicializado.
 */
export function createJuiceComponent(): JuiceComponent {
  return {
    type: "Juice",
    animations: [],
  };
}

export class JuiceSystem extends System {
  public update(world: World, deltaTime: number): void {
    const entities = world.query("Juice");

    entities.forEach((entity) => {
      const juice = world.getComponent<JuiceComponent>(entity, "Juice");
      const transform = world.getComponent<TransformComponent>(entity, "Transform");
      const render = world.getComponent<RenderComponent>(entity, "Render");

      if (!juice) return;

      for (let i = juice.animations.length - 1; i >= 0; i--) {
        const anim = juice.animations[i];

        // Inicializar valor de inicio si es necesario
        if (anim.startValue === undefined) {
          anim.startValue = this.getPropertyValue(anim.property, transform, render);
        }

        anim.elapsed += deltaTime;
        const progress = Math.min(anim.elapsed / anim.duration, 1);
        const easedProgress = this.applyEasing(progress, anim.easing || "linear");

        const currentValue = anim.startValue + (anim.target - anim.startValue) * easedProgress;
        this.setPropertyValue(anim.property, currentValue, transform, render);

        if (progress >= 1) {
          juice.animations.splice(i, 1);
          if (anim.onComplete) anim.onComplete(entity);
        }
      }
    });
  }

  private getPropertyValue(prop: string, transform?: TransformComponent, render?: RenderComponent): number {
    switch (prop) {
      case "scaleX": return transform?.scaleX ?? 1;
      case "scaleY": return transform?.scaleY ?? 1;
      case "rotation": return transform?.rotation ?? render?.rotation ?? 0;
      case "x": return transform?.x ?? 0;
      case "y": return transform?.y ?? 0;
      case "opacity": return (render as any)?.opacity ?? 1;
      default: return 0;
    }
  }

  private setPropertyValue(prop: string, value: number, transform?: TransformComponent, render?: RenderComponent): void {
    if (!transform && !render) return;

    switch (prop) {
      case "scaleX": if (transform) transform.scaleX = value; break;
      case "scaleY": if (transform) transform.scaleY = value; break;
      case "rotation":
        if (transform) transform.rotation = value;
        if (render) render.rotation = value;
        break;
      case "x": if (transform) transform.x = value; break;
      case "y": if (transform) transform.y = value; break;
      case "opacity": if (render) (render as any).opacity = value; break;
    }
  }

  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case "easeIn": return t * t;
      case "easeOut": return t * (2 - t);
      case "easeInOut": return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case "elasticOut": {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
      }
      default: return t;
    }
  }

  /**
   * Helper estático para añadir una animación a una entidad.
   */
  public static add(world: World, entity: Entity, anim: Omit<JuiceAnimation, "elapsed">): void {
    let juice = world.getComponent<JuiceComponent>(entity, "Juice");
    if (!juice) {
      juice = createJuiceComponent();
      world.addComponent(entity, juice);
    }
    juice.animations.push({ ...anim, elapsed: 0 });
  }
}
