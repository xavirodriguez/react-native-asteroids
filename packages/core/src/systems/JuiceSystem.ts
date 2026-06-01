import { Entity, RenderComponent, VisualOffsetComponent, JuiceAnimation, JuiceComponent } from "../ecs/CoreComponents";
import { System } from "../ecs/System";
import { World } from "../ecs/World";

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
    if (world.isReSimulating) return;

    const entities = world.query("Juice");
    const completedEvents: Array<{ event: string, entity: Entity }> = [];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const juice = world.getMutableComponent<JuiceComponent>(entity, "Juice");
      if (!juice) continue;

      const animations = juice.animations;
      if (animations.length === 0) continue;

      let hasOpacityAnim = false;
      let hasOtherAnim = false;

      for (const anim of animations) {
        if (anim.property === "opacity") hasOpacityAnim = true;
        else hasOtherAnim = true;
      }

      // Ensure VisualOffset exists if we have animations that need it
      if (hasOtherAnim && !world.hasComponent(entity, "VisualOffset")) {
        world.getCommandBuffer().addComponent(entity, {
          type: "VisualOffset", x: 0, y: 0, rotation: 0, scaleX: 0, scaleY: 0
        } as VisualOffsetComponent);
        continue;
      }

      const offset = hasOtherAnim ? world.getComponent<VisualOffsetComponent>(entity, "VisualOffset") : undefined;
      const render = hasOpacityAnim ? world.getComponent<RenderComponent>(entity, "Render") : undefined;

      const animationsToRemove: number[] = [];

      for (let j = 0; j < animations.length; j++) {
        const anim = animations[j];
        anim.elapsed += deltaTime;

        // Handle delay
        if (anim.delay && anim.elapsed < anim.delay) {
          continue;
        }

        const activeTime = anim.elapsed - (anim.delay || 0);
        const totalDuration = anim.duration;
        const progress = Math.min(activeTime / totalDuration, 1);

        // Initialize start value if needed
        if (anim.startValue === undefined) {
          anim.startValue = this.getPropertyValue(anim.property, offset, render);
        }

        const easedProgress = this.applyEasing(progress, anim.easing || "linear");
        const currentValue = anim.startValue + (anim.target - anim.startValue) * easedProgress;

        if (anim.property === "opacity") {
          world.mutateComponent<RenderComponent>(entity, "Render", r => {
            if (!r.data) r.data = {};
            r.data.opacity = currentValue;
          });
        } else if (hasOtherAnim) {
          world.mutateComponent<VisualOffsetComponent>(entity, "VisualOffset", vOff => {
            this.setPropertyValue(anim.property, currentValue, vOff);
          });
        }

        if (progress >= 1) {
          if (anim.repeat && anim.repeat > 0) {
              anim.repeat--;
              anim.elapsed = anim.delay || 0;
              if (anim.yoyo) {
                  const oldStart = anim.startValue;
                  anim.startValue = anim.target;
                  anim.target = oldStart;
              }
          } else {
              animationsToRemove.push(j);
              if (anim.onCompleteEvent) {
                  completedEvents.push({ event: anim.onCompleteEvent, entity });
              }
          }
        }
      }

      // Update the Juice component animations list
      if (animationsToRemove.length > 0) {
        // Remove completed animations (in reverse order to maintain indices)
        for (let k = animationsToRemove.length - 1; k >= 0; k--) {
          animations.splice(animationsToRemove[k], 1);
        }
      }
    }

    // Dispatch events outside update loop
    if (completedEvents.length > 0) {
      const bus = world.getResource<import("../ecs/EventBus").EventBus>("EventBus");
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
   * Static helper to add an animation to an entity using deferred commands.
   * Ensures safety during world updates and respects ECS lifecycle.
   *
   * API status: Public
   */
  public static add(world: World, entity: Entity, anim: Omit<JuiceAnimation, "elapsed">): void {
    const commands = world.getCommandBuffer();

    // Check if component already exists to decide between addComponent or mutateComponent
    const juice = world.getComponent<JuiceComponent>(entity, "Juice");

    if (!juice) {
      // Defer addition if it doesn't exist
      commands.addComponent(entity, {
        type: "Juice",
        animations: [{ ...anim, elapsed: 0 }]
      } as JuiceComponent);
    } else {
      // Defer mutation if it exists
      commands.mutateComponent<JuiceComponent>(entity, "Juice", (jComp) => {
        jComp.animations.push({ ...anim, elapsed: 0 });
      });
    }
  }
}
export type { JuiceAnimation, JuiceComponent };
