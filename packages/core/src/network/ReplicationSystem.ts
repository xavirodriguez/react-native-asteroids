import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { NetworkManager } from "./NetworkManager";

/** @public */
export interface MultiplayerRegistry extends CoreComponentRegistry {
    RemotePlayer: { type: "RemotePlayer"; sessionId?: string; targetX?: number; targetY?: number; targetRotation?: number };
    LocalPlayer: { type: "LocalPlayer" };
    Input: { type: "Input"; thrust?: boolean };
}

/** @public */
export interface ReconciledInput<TInput = { thrust?: boolean }> {
    tick: number;
    input: TInput;
    state: { x: number; y: number; vx: number; vy: number };
    dt: number;
}

/** @public */
export interface AuthoritativeServerState {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

/** @public */
export class ReplicationSystem<TRegistry extends MultiplayerRegistry = MultiplayerRegistry> extends System<TRegistry> {
    private inputQueue: ReconciledInput[] = [];
    private lastProcessedTick = 0;

    constructor(private networkManager: NetworkManager) { super(); }

    public update(world: World<TRegistry>, deltaTime: number): void {
        const w = world as unknown as World<MultiplayerRegistry>;

        const remoteQuery = w.query("Transform", "RemotePlayer");
        for (const entity of remoteQuery) {
            const remote = w.getComponent(entity, "RemotePlayer");

            if (remote && remote.targetX !== undefined && remote.targetY !== undefined) {
                // Implement Linear Interpolation (Lerp) for remote entities
                // P_visual = P_old + (P_new - P_old) * alpha
                const alpha = 0.15; // Interpolation factor
                w.mutateComponent(entity, "Transform", (t) => {
                    t.x += (remote.targetX! - t.x) * alpha;
                    t.y += (remote.targetY! - t.y) * alpha;

                    // Angle interpolation (handling wrap-around)
                    if (remote.targetRotation !== undefined) {
                        let diffRot = remote.targetRotation - t.rotation;
                        while (diffRot > Math.PI) diffRot -= Math.PI * 2;
                        while (diffRot < -Math.PI) diffRot += Math.PI * 2;
                        t.rotation += diffRot * alpha;
                    }
                });
            }
        }

        const localQuery = w.query("Transform", "LocalPlayer", "Velocity", "Input");
        for (const entity of localQuery) {
            const input = w.getComponent(entity, "Input");
            const velocity = w.getComponent(entity, "Velocity");
            const transform = w.getComponent(entity, "Transform");

            if (input && velocity && transform) {
                // Client-Side Prediction: apply input locally before server confirmation
                if (input.thrust) {
                    const power = 150;
                    const ax = Math.cos(transform.rotation) * power;
                    const ay = Math.sin(transform.rotation) * power;
                    w.mutateComponent(entity, "Velocity", (v) => {
                        v.vx += ax * (deltaTime / 1000);
                        v.vy += ay * (deltaTime / 1000);
                    });
                }

                const finalVelocity = w.getComponent(entity, "Velocity")!;
                // Save input in a queue for future reconciliation
                this.inputQueue.push({
                    tick: this.lastProcessedTick++,
                    input: { ...input },
                    state: { x: transform.x, y: transform.y, vx: finalVelocity.vx, vy: finalVelocity.vy },
                    dt: deltaTime
                });
            }
        }
    }

    public override onRegister(_world: World<TRegistry>): void {}
    public override dispose(): void {}

    /**
     * Reconciles local state with the server state.
     * Replays all inputs that haven't been acknowledged by the server yet.
     */
    public reconcile(world: World<TRegistry>, serverTick: number, serverState: AuthoritativeServerState): void {
        const w = world as unknown as World<MultiplayerRegistry>;

        // 1. Discard inputs that have already been processed by the server
        this.inputQueue = this.inputQueue.filter(i => i.tick > serverTick);

        // 2. Find the local player entity
        const localQuery = w.query("Transform", "LocalPlayer", "Velocity");
        for (const entity of localQuery) {
            const transform = w.getComponent(entity, "Transform");
            const velocity = w.getComponent(entity, "Velocity");

            // 3. Reset local state to the last authoritative state from server
            if (transform && velocity && serverState) {
                w.mutateComponent(entity, "Transform", (t) => {
                    t.x = serverState.x;
                    t.y = serverState.y;
                });
                w.mutateComponent(entity, "Velocity", (v) => {
                    v.vx = serverState.vx;
                    v.vy = serverState.vy;
                });
            }

            if (transform && velocity) {
                // 4. Replay all pending inputs to catch up to the current client tick
                for (const item of this.inputQueue) {
                    const input = item.input;
                    const dt = item.dt; // Real delta time from the input frame

                    if (input.thrust) {
                        const power = 150;
                        w.mutateComponent(entity, "Velocity", (v) => {
                            const ax = Math.cos(transform.rotation) * power;
                            const ay = Math.sin(transform.rotation) * power;
                            v.vx += ax * (dt / 1000);
                            v.vy += ay * (dt / 1000);
                        });
                    }

                    // Update position based on replayed velocity
                    const currentVelocity = w.getComponent(entity, "Velocity");
                    if (currentVelocity) {
                        w.mutateComponent(entity, "Transform", (t) => {
                            t.x += currentVelocity.vx * (dt / 1000);
                            t.y += currentVelocity.vy * (dt / 1000);
                        });
                    }
                }
            }
        }
    }
}
