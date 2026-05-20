import { Component, Entity, RenderComponent, VisualOffsetComponent } from "../types/EngineTypes";
import { System } from "../core/System";
import { World } from "../core/World";

/**
 * Configuration for an individual animation managed by the JuiceSystem.
 *
 * API status: Public
 */
export interface JuiceAnimation {
  /** Property of the Transform or Render that will be animated. */
  property: "scaleX" | "scaleY" | "rotation" | "x" | "y" | "opacity";
  /** Desired final value after completing the duration. */
  target: number;
  /** Total duration of the animation in milliseconds [ms]. */
  duration: number;
  /** Time elapsed since the start of the animation in milliseconds [ms]. */
  elapsed: number;
  /** Value captured at the start of the animation for interpolation. */
  startValue?: number;
  /** Easing function for interpolation. Defaults to "linear". */
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "elasticOut";
  /**
   * Identificador de evento a disparar al finalizar.
   * @remarks Reemplaza callbacks para compatibilidad con snapshots.
   */
  onCompleteEvent?: string;
}

/**
 * Component that stores a queue of procedural animations (tweens).
 *
 * API status: Public
 */
export interface JuiceComponent extends Component {
  type: "Juice";
  /** List of active animations on the entity. */
  animations: JuiceAnimation[];
}

/**
 * Helper to create an initialized JuiceComponent.
 *
 * API status: Public
 *
 * @returns Instance of JuiceComponent with an empty animation list.
 */
export function createJuiceComponent(): JuiceComponent {
  return {
    type: "Juice",
    animations: [],
  };
}

/**
 * System responsible for processing procedural animations (Juice) on entities.
 *
 * API status: Public
 */
export class JuiceSystem extends System {
  /**
   * Updates procedural Juice animations.
   *
   * API status: Public
   *
   * @param world - The ECS world.
   * @param deltaTime - Elapsed time in milliseconds [ms].
   */
  public update(world: World, deltaTime: number): void {
    const entities = world.query("Juice");
    const completedEvents: Array<{ event: string, entity: Entity }> = [];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const juice = world.getComponent<JuiceComponent>(entity, "Juice");
      const offset = world.getComponent<VisualOffsetComponent>(entity, "VisualOffset");
      const render = world.getComponent<RenderComponent>(entity, "Render");

      if (!juice) continue;

      // Ensure VisualOffset exists if we have animations that need it
      if (!offset && juice.animations.some(a => a.property !== "opacity")) {
        world.getCommandBuffer().addComponent(entity, {
          type: "VisualOffset", x: 0, y: 0, rotation: 0, scaleX: 0, scaleY: 0
        } as VisualOffsetComponent);
        // We skip this frame for this entity because mutateComponent below would fail
        // since the component is not yet in the world.
        continue;
      }

      world.mutateComponent<JuiceComponent>(entity, "Juice", jComp => {
        for (let j = jComp.animations.length - 1; j >= 0; j--) {
          const anim = jComp.animations[j];

          // Initialize start value if needed
          if (anim.startValue === undefined) {
            anim.startValue = this.getPropertyValue(anim.property, offset, render);
          }

          anim.elapsed += deltaTime;
          const progress = Math.min(anim.elapsed / anim.duration, 1);
          const easedProgress = this.applyEasing(progress, anim.easing || "linear");

          const currentValue = anim.startValue + (anim.target - anim.startValue) * easedProgress;

          if (anim.property === "opacity") {
            const renderComp = world.getComponent<RenderComponent>(entity, "Render");
            if (renderComp) {
              world.mutateComponent<RenderComponent>(entity, "Render", r => {
                if (!r.data) r.data = {};
                r.data.opacity = currentValue;
              });
            }
          } else {
            const offsetComp = world.getComponent<VisualOffsetComponent>(entity, "VisualOffset");
            if (offsetComp) {
              world.mutateComponent<VisualOffsetComponent>(entity, "VisualOffset", off => {
                this.setPropertyValue(anim.property, currentValue, off);
              });
            }
          }

          if (progress >= 1) {
            jComp.animations.splice(j, 1);
            if (anim.onCompleteEvent) {
                completedEvents.push({ event: anim.onCompleteEvent, entity });
            }
          }
        }
      });
    }

    // Dispatch events outside world.mutateComponent
    if (completedEvents.length > 0) {
      const bus = world.getResource<import("../core/EventBus").EventBus>("EventBus");
      if (bus) {
        for (const item of completedEvents) {
          bus.emitDeferred(item.event, { entity: item.entity });
        }
      }
    }
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

  private setPropertyValue(prop: string, value: number, offset: VisualOffsetComponent): void {
    switch (prop) {
      case "scaleX": offset.scaleX = value; break;
      case "scaleY": offset.scaleY = value; break;
      case "rotation": offset.rotation = value; break;
      case "x": offset.x = value; break;
      case "y": offset.y = value; break;
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
   * Static helper to add an animation to an entity.
   *
   * API status: Public
   */
  public static add(world: World, entity: Entity, anim: Omit<JuiceAnimation, "elapsed">): void {
    const commands = world.getCommandBuffer();
    let juice = world.getComponent<JuiceComponent>(entity, "Juice");

    if (!juice) {
      juice = createJuiceComponent();
      // If we are in update(), we must use CommandBuffer
      commands.addComponent(entity, juice);
    }

    commands.mutateComponent(entity, "Juice", (jComp: JuiceComponent) => {
        jComp.animations.push({ ...anim, elapsed: 0 });
    });
  }
}
