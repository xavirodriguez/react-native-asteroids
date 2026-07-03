"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutatorSystem = void 0;
const System_1 = require("../ecs/System");
/**
 * System designed to perform arbitrary mutations on entity components.
 *
 * @remarks
 * This system provides a general-purpose update hook. Care should be taken
 * when performing structural changes (adding/removing components or entities)
 * directly; use the {@link WorldCommandBuffer} for safer modifications.
 */
class MutatorSystem extends System_1.System {
    constructor(mutators) {
        super();
    }
    update(world, _deltaTime) {
    }
    onRegister(world) { }
    dispose() { }
}
exports.MutatorSystem = MutatorSystem;
