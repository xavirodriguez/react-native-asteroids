"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsteroidInputSystem = void 0;
const core_1 = require("@tiny-aster/core");
class AsteroidInputSystem extends core_1.System {
    constructor(bulletPool, particlePool, config) {
        super();
    }
    update(world, deltaTime) {
        // Input handling logic
    }
    onRegister(world) { }
    dispose() { }
}
exports.AsteroidInputSystem = AsteroidInputSystem;
