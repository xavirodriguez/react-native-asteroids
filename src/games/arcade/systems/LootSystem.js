"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LootSystem = void 0;
const core_1 = require("@tiny-aster/core");
class LootSystem extends core_1.System {
    update(world, deltaTime) {
        const entities = world.query("LootTable", "Transform");
        for (const entity of entities) {
            const loot = world.getComponent(entity, "LootTable");
            // Loot logic
        }
    }
}
exports.LootSystem = LootSystem;
