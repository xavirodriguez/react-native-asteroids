import { System } from "../core/System";
import { World } from "../core/World";
import { UIElementComponent } from "./UITypes";

export interface UITweenComponent {
    type: "UITween";
    property: "opacity" | "offsetX" | "offsetY";
    startValue: number;
    endValue: number;
    duration: number;
    currentTime: number;
    easing: "linear" | "easeIn" | "easeOut";
    onComplete?: (world: World, entity: any) => void;
    loop?: boolean;
}

export class UITweenSystem extends System {
    public update(world: World, deltaTime: number): void {
        const entities = world.query("UIElement", "UITween");

        for (const entity of entities) {
            const tween = world.getComponent<UITweenComponent>(entity, "UITween")!;
            const element = world.getComponent<UIElementComponent>(entity, "UIElement")!;

            tween.currentTime += deltaTime;
            const progress = Math.min(1, tween.currentTime / tween.duration);
            const easedProgress = this.ease(progress, tween.easing);

            const value = tween.startValue + (tween.endValue - tween.startValue) * easedProgress;

            switch (tween.property) {
                case "opacity":
                    element.opacity = value;
                    break;
                case "offsetX":
                    element.offsetX = value;
                    break;
                case "offsetY":
                    element.offsetY = value;
                    break;
            }

            if (progress >= 1) {
                if (tween.loop) {
                    tween.currentTime = 0;
                } else {
                    if (tween.onComplete) tween.onComplete(world, entity);
                    world.removeComponent(entity, "UITween");
                }
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
