"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenShakeSystem = void 0;
const System_1 = require("../ecs/System");
class ScreenShakeSystem extends System_1.System {
    update(world, deltaTime) {
        if (world.isReSimulating)
            return;
        const entities = world.query("ScreenShake");
        for (const entity of entities) {
            world.mutateComponent(entity, "ScreenShake", shake => {
                shake.remaining -= deltaTime;
                if (shake.remaining <= 0) {
                    shake.remaining = 0;
                    shake.intensity = 0;
                }
            });
        }
    }
}
exports.ScreenShakeSystem = ScreenShakeSystem;
