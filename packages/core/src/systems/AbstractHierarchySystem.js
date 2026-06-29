"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractHierarchySystem = void 0;
const System_1 = require("../ecs/System");
class AbstractHierarchySystem extends System_1.System {
    wasDirty = new Set();
    getProcessingOrder(world, componentType) {
        const entities = world.query(componentType);
        if (entities.length === 0)
            return [];
        const order = [];
        const visited = new Set();
        const processing = new Set();
        const stack = [];
        for (let i = 0; i < entities.length; i++) {
            const startEntity = entities[i];
            if (visited.has(startEntity))
                continue;
            stack.push({ entity: startEntity, stage: 'enter' });
            while (stack.length > 0) {
                const current = stack.pop();
                const { entity, stage } = current;
                if (stage === 'enter') {
                    if (visited.has(entity))
                        continue;
                    if (processing.has(entity)) {
                        console.warn(`[${this.constructor.name}] Circular dependency detected at entity ${entity}.`);
                        continue;
                    }
                    processing.add(entity);
                    stack.push({ entity, stage: 'exit' });
                    const comp = world.getComponent(entity, componentType);
                    if (comp && comp.parentEntity !== undefined) {
                        stack.push({ entity: comp.parentEntity, stage: 'enter' });
                    }
                }
                else {
                    processing.delete(entity);
                    visited.add(entity);
                    order.push(entity);
                }
            }
        }
        return order;
    }
}
exports.AbstractHierarchySystem = AbstractHierarchySystem;
