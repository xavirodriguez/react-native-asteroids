import { Component, Entity, TransformComponent, RenderComponent, VisualOffsetComponent } from "../types/EngineTypes";
import { System } from "../core/System";
import { World } from "../core/World";

/**
 * Configuración de una animación individual gestionada por el JuiceSystem.
 */
export interface JuiceAnimation {
  /** Propiedad del Transform o Render que será animada. */
  property: "scaleX" | "scaleY" | "rotation" | "x" | "y" | "opacity";
  /** Valor final deseado tras completar la duración. */
  target: number;
  /** Duración total de la animación en milisegundos. */
  duration: number;
  /** Tiempo transcurrido desde el inicio de la animación en milisegundos. */
  elapsed: number;
  /** Valor capturado al inicio de la animación para interpolación. */
  startValue?: number;
  /** Función de suavizado para la interpolación. Por defecto "linear". */
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "elasticOut";
  /** Callback opcional ejecutado al finalizar la animación. */
  onComplete?: (entity: Entity) => void;
}

/**
 * Componente que almacena una cola de animaciones procedimentales (tweens).
 */
export interface JuiceComponent extends Component {
  type: "Juice";
  /** Lista de animaciones activas sobre la entidad. */
  animations: JuiceAnimation[];
}

/**
 * Helper para crear un JuiceComponent inicializado.
 * @returns Instancia de JuiceComponent con lista de animaciones vacía.
 */
export function createJuiceComponent(): JuiceComponent {
  return {
    type: "Juice",
    animations: [],
  };
}

/**
 * Sistema encargado de procesar animaciones procedimentales (Juice) sobre las entidades.
 * Permite efectos visuales reactivos (pop, squash, stretch, fade) sin lógica de estado compleja.
 *
 * @responsibility Actualizar el progreso de cada {@link JuiceAnimation}.
 * @responsibility Interpolar y aplicar valores a {@link VisualOffsetComponent} o {@link RenderComponent}.
 * @responsibility Notificar la finalización mediante callbacks {@link JuiceAnimation.onComplete}.
 *
 * @queries Juice, VisualOffset, Render
 * @mutates VisualOffset.x, VisualOffset.y, VisualOffset.scaleX, VisualOffset.scaleY, VisualOffset.rotation
 * @mutates Render.rotation, Render.opacity
 * @executionOrder Fase: Presentation. Debe ejecutarse después de Simulation para sobreescribir visuales.
 *
 * @remarks
 * El sistema utiliza un integrador basado en tiempo real (ms).
 * Se recomienda para efectos no críticos que no afecten la lógica de colisiones.
 *
 * @conceptualRisk [DETERMINISM][LOW] JuiceSystem ahora muta VisualOffsetComponent en lugar de Transform,
 * eliminando el riesgo de desincronización en la simulación física.
 * @conceptualRisk [MUTATION][LOW] Las animaciones se eliminan del array durante la iteración
 * inversa; el diseño es seguro ante mutaciones estructurales locales.
 */
export class JuiceSystem extends System {
  public update(world: World, deltaTime: number): void {
    const entities = world.query("Juice");

    entities.forEach((entity) => {
      const juice = world.getComponent<JuiceComponent>(entity, "Juice");
      let offset = world.getComponent<VisualOffsetComponent>(entity, "VisualOffset");
      const render = world.getComponent<RenderComponent>(entity, "Render");

      if (!juice) return;

      // Ensure VisualOffset exists if we have animations that need it
      if (!offset && juice.animations.some(a => a.property !== "opacity")) {
        offset = world.addComponent(entity, {
          type: "VisualOffset", x: 0, y: 0, rotation: 0, scaleX: 0, scaleY: 0
        } as VisualOffsetComponent);
      }

      for (let i = juice.animations.length - 1; i >= 0; i--) {
        const anim = juice.animations[i];

        // Inicializar valor de inicio si es necesario
        if (anim.startValue === undefined) {
          anim.startValue = this.getPropertyValue(anim.property, offset, render);
        }

        anim.elapsed += deltaTime;
        const progress = Math.min(anim.elapsed / anim.duration, 1);
        const easedProgress = this.applyEasing(progress, anim.easing || "linear");

        const currentValue = anim.startValue + (anim.target - anim.startValue) * easedProgress;
        this.setPropertyValue(anim.property, currentValue, offset, render);

        if (progress >= 1) {
          juice.animations.splice(i, 1);
          if (anim.onComplete) anim.onComplete(entity);
        }
      }
    });
  }

  private getPropertyValue(prop: string, offset?: VisualOffsetComponent, render?: RenderComponent): number {
    switch (prop) {
      case "scaleX": return offset?.scaleX ?? 0;
      case "scaleY": return offset?.scaleY ?? 0;
      case "rotation": return offset?.rotation ?? 0;
      case "x": return offset?.x ?? 0;
      case "y": return offset?.y ?? 0;
      case "opacity": return (render?.data?.opacity as number) ?? 1;
      default: return 0;
    }
  }

  private setPropertyValue(prop: string, value: number, offset?: VisualOffsetComponent, render?: RenderComponent): void {
    switch (prop) {
      case "scaleX": if (offset) offset.scaleX = value; break;
      case "scaleY": if (offset) offset.scaleY = value; break;
      case "rotation":
        if (offset) offset.rotation = value;
        break;
      case "x": if (offset) offset.x = value; break;
      case "y": if (offset) offset.y = value; break;
      case "opacity":
        if (render) {
            if (!render.data) render.data = {};
            render.data.opacity = value;
        }
        break;
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
