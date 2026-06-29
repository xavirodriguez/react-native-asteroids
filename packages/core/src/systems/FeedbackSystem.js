"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackSystem = void 0;
const System_1 = require("../ecs/System");
class FeedbackSystem extends System_1.System {
    update(world, _deltaTime) {
        if (world.isReSimulating)
            return;
        const entities = world.query("HapticRequest");
        for (const entity of entities) {
            const haptic = world.getComponent(entity, "HapticRequest");
            if (haptic) {
                // Driver-based haptics would be triggered here
                world.getCommandBuffer().removeComponent(entity, "HapticRequest");
            }
        }
    }
}
exports.FeedbackSystem = FeedbackSystem;
