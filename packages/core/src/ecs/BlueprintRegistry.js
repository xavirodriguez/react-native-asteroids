"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlueprintRegistry = void 0;
class BlueprintRegistry {
    blueprints = new Map();
    register(id, blueprint) {
        this.blueprints.set(id, blueprint);
    }
    get(id) {
        return this.blueprints.get(id);
    }
    has(id) {
        return this.blueprints.has(id);
    }
    clear() {
        this.blueprints.clear();
    }
}
exports.BlueprintRegistry = BlueprintRegistry;
