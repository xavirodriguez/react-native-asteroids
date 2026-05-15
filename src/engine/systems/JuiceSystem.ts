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
  /** Optional callback executed when the animation finishes. */
  onComplete?: (entity: Entity) => void;
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
 *
 * Responsibility: Animate component properties in an elastic or interpolated way.
 * Responsibility: Update the progress of each `JuiceAnimation`.
 * Responsibility: Interpolate and apply values to `VisualOffsetComponent` or `RenderComponent`.
 * Responsibility: Notify completion through `onComplete` callbacks.
 *
 * @remarks
 * It is a key piece for **"smooth reconciliation"** in networking. When the server corrects
 * a ship's position, this system gradually interpolates the visual error (`VisualOffset`)
 * towards zero, preventing the player from perceiving sudden jumps.
 *
 * Queries: Juice, VisualOffset, Render
 * Mutates: VisualOffset.x, VisualOffset.y, VisualOffset.scaleX, VisualOffset.scaleY, VisualOffset.rotation
 * Mutates: Render.rotation, Render.opacity
 * Execution Order: Presentation Phase. Must be executed after Simulation to override visuals.
 *
 * @remarks
 * The system uses a real-time based integrator. Recommended for aesthetic effects
 * that should not interfere with collision or physics logic.
 *
 * Conceptual Risk: [DETERMINISM][LOW] JuiceSystem now mutates VisualOffsetComponent instead of Transform,
 * eliminating the risk of desynchronization in the physics simulation.
 * Conceptual Risk: [MUTATION][LOW] Animations are removed from the array during reverse iteration;
 * the design is safe against local structural mutations.
 */
export class JuiceSystem extends System {
  /**
   * Updates procedural Juice animations.
   *
   * API status: Public
   *
   * @param world - The ECS world.
   * @param deltaTime - Elapsed time in milliseconds [ms].
   *
   * Precondition: Entities must possess a `JuiceComponent`.
   * Postcondition: Interpolated values are applied to `VisualOffsetComponent` or `RenderComponent`.
   */
  public update(world: World, deltaTime: number): void {
    const entities = world.query("Juice");

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const juice = world.getComponent<JuiceComponent>(entity, "Juice");
      let offset = world.getComponent<VisualOffsetComponent>(entity, "VisualOffset");
      const render = world.getComponent<RenderComponent>(entity, "Render");

      if (!juice) continue;

      // Ensure VisualOffset exists if we have animations that need it
      if (!offset && juice.animations.some(a => a.property !== "opacity")) {
        offset = world.addComponent(entity, {
          type: "VisualOffset", x: 0, y: 0, rotation: 0, scaleX: 0, scaleY: 0
        } as VisualOffsetComponent);
      }

      for (let j = juice.animations.length - 1; j >= 0; j--) {
        const anim = juice.animations[j];

        // Initialize start value if needed
        if (anim.startValue === undefined) {
          anim.startValue = this.getPropertyValue(anim.property, offset, render);
        }

        anim.elapsed += deltaTime;
        const progress = Math.min(anim.elapsed / anim.duration, 1);
        const easedProgress = this.applyEasing(progress, anim.easing || "linear");

        const currentValue = anim.startValue + (anim.target - anim.startValue) * easedProgress;
        this.setPropertyValue(anim.property, currentValue, offset, render);

        if (progress >= 1) {
          juice.animations.splice(j, 1);
          if (anim.onComplete) anim.onComplete(entity);
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
   * Static helper to add an animation to an entity.
   *
   * API status: Public
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
