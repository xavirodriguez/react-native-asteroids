import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

export interface ReconciledInput<TInput = { thrust?: boolean }> {
    tick: number;
    input: TInput;
    state: { x: number; y: number; vx: number; vy: number };
    dt: number;
}

export interface AuthoritativeServerState {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

export class ReplicationSystem<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
    private inputQueue: ReconciledInput[] = [];
    private lastProcessedTick = 0;

    constructor(private networkManager: any) { super(); }

    public update(world: World<TRegistry, any>, deltaTime: number): void {
        const w = world as unknown as World<CoreComponentRegistry, any>;
        const remoteQuery = w.query("Transform", "RemotePlayer" as any);
        for (const entity of remoteQuery) {
            const transform = w.getComponent(entity, "Transform");
            const remote = w.getComponent(entity, "RemotePlayer" as any) as unknown as { targetX?: number; targetY?: number; targetRotation?: number } | undefined;

            if (transform && remote && remote.targetX !== undefined && remote.targetY !== undefined) {
                // Implement Linear Interpolation (Lerp) for remote entities
                // P_visual = P_old + (P_new - P_old) * alpha
                const alpha = 0.15; // Interpolation factor
                transform.x += (remote.targetX - transform.x) * alpha;
                transform.y += (remote.targetY - transform.y) * alpha;

                // Angle interpolation (handling wrap-around)
                if (remote.targetRotation !== undefined) {
                    let diffRot = remote.targetRotation - transform.rotation;
                    while (diffRot > Math.PI) diffRot -= Math.PI * 2;
                    while (diffRot < -Math.PI) diffRot += Math.PI * 2;
                    transform.rotation += diffRot * alpha;
                }
            }
        }

        const localQuery = w.query("Transform", "LocalPlayer" as any, "Velocity", "Input" as any);
        for (const entity of localQuery) {
            const input = w.getComponent(entity, "Input" as any) as unknown as { thrust?: boolean } | undefined;
            const velocity = w.getComponent(entity, "Velocity");
            const transform = w.getComponent(entity, "Transform");

            if (input && velocity && transform) {
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
                    state: { x: transform.x, y: transform.y, vx: velocity.vx, vy: velocity.vy },
                    dt: deltaTime
                });
            }
        }
    }

    public onRegister(world: World<TRegistry, any>): void {}
    public dispose(): void {}

    /**
     * Reconciles local state with the server state.
     * Replays all inputs that haven't been acknowledged by the server yet.
     */
    public reconcile(world: World<TRegistry, any>, serverTick: number, serverState: AuthoritativeServerState) {
        const w = world as unknown as World<CoreComponentRegistry, any>;

        // 1. Discard inputs that have already been processed by the server
        this.inputQueue = this.inputQueue.filter(i => i.tick > serverTick);

        // 2. Find the local player entity
        const localQuery = w.query("Transform", "LocalPlayer" as any, "Velocity");
        for (const entity of localQuery) {
            const transform = w.getComponent(entity, "Transform");
            const velocity = w.getComponent(entity, "Velocity");

            // 3. Reset local state to the last authoritative state from server
            if (transform && velocity && serverState) {
                transform.x = serverState.x;
                transform.y = serverState.y;
                velocity.vx = serverState.vx;
                velocity.vy = serverState.vy;
            }

            if (transform && velocity) {
                // 4. Replay all pending inputs to catch up to the current client tick
                for (const item of this.inputQueue) {
                    const input = item.input;
                    const dt = item.dt; // Real delta time from the input frame

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
}
