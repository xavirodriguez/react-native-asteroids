import { System } from "../index";
import { World } from "../index";
import { UIElementComponent } from "./UITypes";
import { Entity } from "../ecs/Entity";

export interface UITweenComponent {
    type: "UITween";
    property: "opacity" | "offsetX" | "offsetY";
    startValue: number;
    endValue: number;
    duration: number;
    currentTime: number;
    easing: "linear" | "easeIn" | "easeOut";
    onComplete?: (world: World, entity: Entity) => void;
    loop?: boolean;
}

export class UITweenSystem extends System {
    public update(world: World, deltaTime: number): void {
        const entities = world.query("UIElement", "UITween");

        for (const entity of entities) {
            const tween = world.getComponent<UITweenComponent>(entity, "UITween")!;

            const newTime = tween.currentTime + deltaTime;
            const progress = Math.min(1, newTime / tween.duration);
            const easedProgress = this.ease(progress, tween.easing);

            const value = tween.startValue + (tween.endValue - tween.startValue) * easedProgress;

            world.mutateComponent<UIElementComponent>(entity, "UIElement", (el) => {
                switch (tween.property) {
                    case "opacity":
                        el.opacity = value;
                        break;
                    case "offsetX":
                        el.offsetX = value;
                        break;
                    case "offsetY":
                        el.offsetY = value;
                        break;
                }
            });

            world.mutateComponent<UITweenComponent>(entity, "UITween", (t) => {
                t.currentTime = newTime;
                if (progress >= 1 && t.loop) {
                    t.currentTime = 0;
                }
            });

            if (progress >= 1 && !tween.loop) {
                const tc = tween as any;
                if (tc.onComplete) {
                   tc.onComplete(world, entity);
                }
                world.getCommandBuffer().removeComponent(entity, "UITween");
            }
        }
    }

    private ease(t: number, type: string): number {
        switch (type) {
            case "easeIn": return t * t;
            case "easeOut": return t * (2 - t);
            case "linear":
            default: return t;
        }
    }
}
