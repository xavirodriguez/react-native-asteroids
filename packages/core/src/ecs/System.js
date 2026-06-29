"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.System = exports.SystemPhase = void 0;
/**
 * Execution phases for systems within the World update loop.
 */
var SystemPhase;
(function (SystemPhase) {
    /** Input processing and gathering. */
    SystemPhase["Input"] = "Input";
    /** Core game logic and simulation. */
    SystemPhase["Simulation"] = "Simulation";
    /** Coordinate transformations and hierarchy updates. */
    SystemPhase["Transform"] = "Transform";
    /** Collision detection and resolution. */
    SystemPhase["Collision"] = "Collision";
    /** Higher-level game rules and state transitions. */
    SystemPhase["GameRules"] = "GameRules";
    /** Preparation for rendering and visual feedback. */
    SystemPhase["Presentation"] = "Presentation";
})(SystemPhase || (exports.SystemPhase = SystemPhase = {}));
/**
 * Base class for all systems.
 *
 * @remarks
 * Systems implement the logic that operates on entities and components.
 * They are executed by the {@link World} during its update loop.
 *
 * Systems should ideally be stateless or only maintain limited auxiliary
 * state (like caches or coordination flags) that can be safely discarded or recomputed.
 * Core simulation state should be stored in components within the {@link World} to support
 * features like snapshots, rollback, and replication. Systems that maintain internal
 * simulation state may break these features if that state is not serializable.
 */
class System {
    /**
     * Called when the system is registered with a world.
     */
    onRegister(_world) { }
    /**
     * Called when the system is removed or the world is cleared.
     */
    dispose() { }
}
exports.System = System;
