"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedInputSystem = void 0;
const System_1 = require("../ecs/System");
/**
 * System that unifies input from various sources (keyboard, gamepad, touch).
 *
 * @remarks
 * This system abstracts raw input into logical actions and stores them in
 * `InputState` components.
 *
 * @warning
 * **Synchronization latency**: Input capture is subject to the platform's event
 * loop and OS-level latency. Captured state reflects the latest available data
 * at the start of the simulation update and may not be perfectly
 * synchronized with the exact moment of physical input.
 */
class UnifiedInputSystem extends System_1.System {
    overrides = {};
    bind(_action, _keys) { }
    /**
     * Manually sets an input action state.
     */
    setOverride(action, pressed) {
        this.overrides[action] = pressed;
    }
    update(world, _deltaTime) {
        // Input logic
        // In a real implementation, this would combine raw inputs with overrides
    }
    /**
     * Returns the state of an action.
     */
    getAction(action) {
        return !!this.overrides[action];
    }
}
exports.UnifiedInputSystem = UnifiedInputSystem;
