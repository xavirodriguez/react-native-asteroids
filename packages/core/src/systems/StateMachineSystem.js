"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateMachineSystem = void 0;
const System_1 = require("../ecs/System");
/**
 * System that manages entity state machines.
 *
 * @remarks
 * This system updates the state of entities based on defined transitions and behaviors.
 * State definitions can include `onEnter`, `onUpdate`, and `onExit` hooks.
 *
 * Warning: State transitions and hook execution may involve complex logic.
 * Ensure that hooks do not perform unauthorized structural changes to the world
 * while the system is iterating over entities.
 */
class StateMachineSystem extends System_1.System {
    update(world, deltaTime) {
        const entities = world.query("StateMachine");
        for (const entity of entities) {
            const sm = world.getComponent(entity, "StateMachine");
            if (!sm)
                continue;
            const registry = world.getResource("StateMachineRegistry");
            const definition = registry ? registry[sm.machineId] : undefined;
            if (!definition)
                continue;
            const stateDef = definition.states[sm.currentState];
            world.mutateComponent(entity, "StateMachine", (comp) => {
                comp.elapsedMs += deltaTime;
            });
            if (stateDef?.onUpdate) {
                const nextState = stateDef.onUpdate(world, entity, sm.data, sm.elapsedMs);
                if (nextState && nextState !== sm.currentState) {
                    this.transition(world, entity, nextState, definition);
                }
            }
        }
    }
    transition(world, entity, nextState, definition) {
        const sm = world.getComponent(entity, "StateMachine");
        const oldStateDef = definition.states[sm.currentState];
        const newStateDef = definition.states[nextState];
        if (oldStateDef?.onExit) {
            oldStateDef.onExit(world, entity, sm.data);
        }
        world.mutateComponent(entity, "StateMachine", (comp) => {
            comp.previousState = comp.currentState;
            comp.currentState = nextState;
            comp.elapsedMs = 0;
        });
        if (newStateDef?.onEnter) {
            newStateDef.onEnter(world, entity, sm.data);
        }
    }
}
exports.StateMachineSystem = StateMachineSystem;
