"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JuiceSystem = void 0;
const System_1 = require("../ecs/System");
class JuiceSystem extends System_1.System {
    update(world, deltaTime) {
        if (world.isReSimulating)
            return;
        const juiceEntities = world.query("Juice");
        for (const entity of juiceEntities) {
            const juice = world.getComponent(entity, "Juice");
            const offset = world.getComponent(entity, "VisualOffset");
            const render = world.getComponent(entity, "Render");
            let hasChanges = false;
            const animations = [...juice.animations].map(a => ({ ...a }));
            for (let i = animations.length - 1; i >= 0; i--) {
                const anim = animations[i];
                anim.elapsed += deltaTime;
                if (anim.delay && anim.elapsed < anim.delay)
                    continue;
                const effectiveElapsed = anim.elapsed - (anim.delay || 0);
                const progress = Math.min(1, effectiveElapsed / anim.duration);
                const easedProgress = this.getEasedValue(progress, anim.easing);
                if (anim.startValue === undefined && anim.property) {
                    anim.startValue = this.getCurrentValue(anim.property, offset, render);
                }
                if (anim.target !== undefined && anim.startValue !== undefined && anim.property) {
                    const value = anim.startValue + (anim.target - anim.startValue) * easedProgress;
                    this.applyValue(world, entity, anim.property, value);
                }
                hasChanges = true;
                if (progress >= 1) {
                    if (anim.repeat && anim.repeat > 0) {
                        anim.elapsed = 0;
                        anim.repeat--;
                    }
                    else {
                        animations.splice(i, 1);
                    }
                }
            }
            if (hasChanges) {
                world.mutateComponent(entity, "Juice", j => {
                    j.animations = animations;
                });
            }
        }
    }
    getCurrentValue(prop, offset, render) {
        if (offset && (prop === "offsetX" || prop === "offsetY" || prop === "x" || prop === "y" || prop === "scaleX" || prop === "scaleY")) {
            const key = (prop === "x" || prop === "y") ? (prop === "x" ? "offsetX" : "offsetY") : prop;
            return offset[key] ?? 0;
        }
        if (render && (prop === "opacity" || prop === "rotation")) {
            return render[prop] ?? 0;
        }
        return 0;
    }
    applyValue(world, entity, prop, value) {
        if (prop === "scaleX" || prop === "scaleY" || prop === "x" || prop === "y") {
            world.mutateComponent(entity, "VisualOffset", o => {
                const key = (prop === "x" || prop === "y") ? (prop === "x" ? "offsetX" : "offsetY") : prop;
                o[key] = value;
            });
        }
        else if (prop === "opacity" || prop === "rotation") {
            world.mutateComponent(entity, "Render", r => {
                r[prop] = value;
            });
        }
    }
    getEasedValue(t, easing) {
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
exports.JuiceSystem = JuiceSystem;
