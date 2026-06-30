"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicationSystem = void 0;
const System_1 = require("../ecs/System");
class ReplicationSystem extends System_1.System {
    networkManager;
    inputQueue = [];
    lastProcessedTick = 0;
    constructor(networkManager) {
        super();
        this.networkManager = networkManager;
    }
    update(world, deltaTime) {
        const remoteQuery = world.query("Transform", "RemotePlayer");
        for (const entity of remoteQuery) {
            const transform = world.getComponent(entity, "Transform");
            const remote = world.getComponent(entity, "RemotePlayer");
            if (remote && remote.targetX !== undefined) {
                // Implement Linear Interpolation (Lerp) for remote entities
                // P_visual = P_old + (P_new - P_old) * alpha
                const alpha = 0.15; // Interpolation factor
                transform.x += (remote.targetX - transform.x) * alpha;
                transform.y += (remote.targetY - transform.y) * alpha;
                // Angle interpolation (handling wrap-around)
                let diffRot = remote.targetRotation - transform.rotation;
                while (diffRot > Math.PI)
                    diffRot -= Math.PI * 2;
                while (diffRot < -Math.PI)
                    diffRot += Math.PI * 2;
                transform.rotation += diffRot * alpha;
            }
        }
        const localQuery = world.query("Transform", "LocalPlayer", "Velocity", "Input");
        for (const entity of localQuery) {
            const input = world.getComponent(entity, "Input");
            const velocity = world.getComponent(entity, "Velocity");
            const transform = world.getComponent(entity, "Transform");
            // Client-Side Prediction: apply input locally before server confirmation
            if (input.thrust) {
                const power = 150;
                const ax = Math.cos(transform.rotation) * power;
                const ay = Math.sin(transform.rotation) * power;
                velocity.vx += ax * (deltaTime / 1000);
                velocity.vy += ay * (deltaTime / 1000);
            }
            // Save input in a queue for future reconciliation
            this.inputQueue.push({
                tick: this.lastProcessedTick++,
                input: { ...input },
                state: { x: transform.x, y: transform.y, vx: velocity.vx, vy: velocity.vy }
            });
        }
    }
    onRegister(world) { }
    dispose() { }
    /**
     * Reconciles local state with the server state.
     * Replays all inputs that haven't been acknowledged by the server yet.
     */
    reconcile(world, serverTick, serverState) {
        // 1. Discard inputs that have already been processed by the server
        this.inputQueue = this.inputQueue.filter(i => i.tick > serverTick);
        // 2. Find the local player entity
        const localQuery = world.query("Transform", "LocalPlayer", "Velocity");
        for (const entity of localQuery) {
            const transform = world.getComponent(entity, "Transform");
            const velocity = world.getComponent(entity, "Velocity");
            // 3. Reset local state to the last authoritative state from server
            if (serverState) {
                transform.x = serverState.x;
                transform.y = serverState.y;
                velocity.vx = serverState.vx;
                velocity.vy = serverState.vy;
            }
            // 4. Replay all pending inputs to catch up to the current client tick
            for (const item of this.inputQueue) {
                const input = item.input;
                const dt = 16.66; // Standard tick delta (should ideally be dynamic)
                if (input.thrust) {
                    const power = 150;
                    const ax = Math.cos(transform.rotation) * power;
                    const ay = Math.sin(transform.rotation) * power;
                    velocity.vx += ax * (dt / 1000);
                    velocity.vy += ay * (dt / 1000);
                }
                // Update position based on replayed velocity
                transform.x += velocity.vx * (dt / 1000);
                transform.y += velocity.vy * (dt / 1000);
            }
        }
    }
}
exports.ReplicationSystem = ReplicationSystem;
