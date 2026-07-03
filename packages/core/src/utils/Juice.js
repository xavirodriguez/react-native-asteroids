"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Juice = void 0;
/**
 * Static utility for applying juice effects (squash, stretch, shake, flash).
 * Works in tandem with the JuiceSystem.
 */
class Juice {
    /**
     * Adds a temporary color flash to an entity.
     */
    static flash(world, entity, frames = 5) {
        world.mutateComponent(entity, "Render", (render) => {
            render.hitFlashFrames = frames;
        });
    }
    /**
     * Shakes the screen (world singleton Camera2D if available, or ScreenShake resource).
     */
    static shake(world, intensity, duration) {
        const shake = world.getSingleton("ScreenShake");
        if (shake) {
            world.mutateSingleton("ScreenShake", (s) => {
                s.intensity = Math.max(s.intensity, intensity);
                s.duration = Math.max(s.duration, duration);
                s.remaining = Math.max(s.remaining, duration);
            });
        }
        else {
            // Fallback to resource-based shake if component not found
            const res = world.getResource("ScreenShake");
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
    static add(world, entity, anim) {
        if (!world.hasComponent(entity, "Juice")) {
            world.addComponent(entity, { type: "Juice", active: true, animations: [] });
        }
        if (!world.hasComponent(entity, "VisualOffset")) {
            world.addComponent(entity, { type: "VisualOffset", offsetX: 0, offsetY: 0 });
        }
        world.mutateComponent(entity, "Juice", (juice) => {
            juice.animations.push({
                type: "animation",
                ...anim,
                elapsed: 0
            });
        });
    }
    /**
     * Simple squash and stretch animation.
     */
    static squash(world, entity, sx, sy, duration) {
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
exports.Juice = Juice;
