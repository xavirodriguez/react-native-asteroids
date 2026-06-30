import { World } from "../ecs/World";
import { Entity } from "../ecs/Entity";
import { RenderComponent, JuiceComponent } from "../ecs/CoreComponents";

/**
 * Static utility for applying juice effects (squash, stretch, shake, flash).
 * Works in tandem with the JuiceSystem.
 */
export class Juice {
  /**
   * Adds a temporary color flash to an entity.
   */
  public static flash(world: World<any>, entity: Entity, frames: number = 5): void {
    world.mutateComponent(entity, "Render" as any, (render: RenderComponent) => {
      render.hitFlashFrames = frames;
    });
  }

  /**
   * Shakes the screen (world singleton Camera2D if available, or ScreenShake resource).
   */
  public static shake(world: World<any>, intensity: number, duration: number): void {
    const shake = world.getSingleton("ScreenShake" as any) as any;
    if (shake) {
        world.mutateSingleton("ScreenShake" as any, (s: any) => {
            s.intensity = Math.max(s.intensity, intensity);
            s.duration = Math.max(s.duration, duration);
            s.remaining = Math.max(s.remaining, duration);
        });
    } else {
        // Fallback to resource-based shake if component not found
        const res = world.getResource("ScreenShake") as any;
        if (res) {
            res.intensity = Math.max(res.intensity, intensity);
            res.duration = Math.max(res.duration, duration);
            res.remaining = Math.max(res.remaining, duration);
        }
    }
  }

  /**
   * Adds a general juice animation to an entity.
   */
  public static add(world: World<any>, entity: Entity, anim: {
    property: string;
    target: number;
    duration: number;
    easing?: string;
    delay?: number;
    repeat?: number;
  }): void {
    if (!world.hasComponent(entity, "Juice" as any)) {
        world.addComponent(entity, { type: "Juice", active: true, animations: [] } as any);
    }
    if (!world.hasComponent(entity, "VisualOffset" as any)) {
        world.addComponent(entity, { type: "VisualOffset", offsetX: 0, offsetY: 0 } as any);
    }

    world.mutateComponent(entity, "Juice" as any, (juice: JuiceComponent) => {
        juice.animations.push({
            ...anim,
            elapsed: 0
        });
    });
  }

  /**
   * Simple squash and stretch animation.
   */
  public static squash(world: World<any>, entity: Entity, sx: number, sy: number, duration: number): void {
    this.add(world, entity, {
        property: "scaleX",
        target: sx,
        duration: duration / 2,
        easing: "easeOut"
    });
    this.add(world, entity, {
        property: "scaleX",
        target: 1,
        duration: duration / 2,
        delay: duration / 2,
        easing: "elasticOut"
    });
    this.add(world, entity, {
        property: "scaleY",
        target: sy,
        duration: duration / 2,
        easing: "easeOut"
    });
    this.add(world, entity, {
        property: "scaleY",
        target: 1,
        duration: duration / 2,
        delay: duration / 2,
        easing: "elasticOut"
    });
  }
}
