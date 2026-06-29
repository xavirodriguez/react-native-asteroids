import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { VisualOffsetComponent, RenderComponent, CoreComponentRegistry } from "../ecs/CoreComponents";

export class JuiceSystem extends System<CoreComponentRegistry> {
    public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
        if (world.isReSimulating) return;

        const juiceEntities = world.query("Juice");

        for (const entity of juiceEntities) {
            const juice = world.getComponent(entity, "Juice")!;
            const offset = world.getComponent(entity, "VisualOffset");
            const render = world.getComponent(entity, "Render");

            let hasChanges = false;
            const animations = [...juice.animations].map(a => ({...a}));

            for (let i = animations.length - 1; i >= 0; i--) {
                const anim = animations[i];
                anim.elapsed += deltaTime;

                if (anim.delay && anim.elapsed < anim.delay) continue;

                const effectiveElapsed = anim.elapsed - (anim.delay || 0);
                const progress = Math.min(1, effectiveElapsed / anim.duration);
                const easedProgress = this.getEasedValue(progress, anim.easing);

                if (anim.startValue === undefined) {
                    anim.startValue = this.getCurrentValue(anim.property, offset, render);
                }

                const value = anim.startValue + (anim.target - anim.startValue) * easedProgress;
                this.applyValue(world, entity, anim.property, value);
                hasChanges = true;

                if (progress >= 1) {
                    if (anim.repeat && anim.repeat > 0) {
                        anim.elapsed = 0;
                        anim.repeat--;
                    } else {
                        animations.splice(i, 1);
                    }
                }
            }

            if (hasChanges) {
                world.mutateComponent(entity, "Juice", j => {
                    j.animations = animations as any;
                });
            }
        }
    }

    private getCurrentValue(prop: string, offset?: import("../index").DeepReadonly<VisualOffsetComponent>, render?: import("../index").DeepReadonly<RenderComponent>): number {
        if (offset && prop in offset) return (offset as any)[prop];
        if (render && prop in render) return (render as any)[prop];
        return 0;
    }

    private applyValue(world: World<CoreComponentRegistry>, entity: number, prop: string, value: number): void {
        if (prop === "scaleX" || prop === "scaleY" || prop === "x" || prop === "y") {
            world.mutateComponent(entity, "VisualOffset", o => {
                (o as any)[prop] = value;
            });
        } else if (prop === "opacity" || prop === "rotation") {
            world.mutateComponent(entity, "Render", r => {
                (r as any)[prop] = value;
            });
        }
    }

    private getEasedValue(t: number, easing?: string): number {
        switch (easing) {
            case "easeIn": return t * t;
            case "easeOut": return t * (2 - t);
            case "easeInOut": return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case "elasticOut":
                const p = 0.3;
                return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
            default: return t;
        }
    }
}
