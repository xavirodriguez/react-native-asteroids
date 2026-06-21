import { World, ComponentType } from "../ecs/World";
import { System } from "../ecs/System";
import { ComponentRegistry } from "../ecs/Component";
import { Entity } from "../ecs/Entity";

export class ReplicationSystem<TRegistry extends ComponentRegistry = ComponentRegistry> extends System<TRegistry> {
    private inputQueue: any[] = [];
    private lastProcessedTick = 0;
    constructor(private networkManager: any) { super(); }
    public update(world: World<TRegistry, any>, deltaTime: number): void {
        const remoteQuery = world.query("Transform" as ComponentType<TRegistry>, "RemotePlayer" as ComponentType<TRegistry>);
        for (const entity of remoteQuery) {
            const transform = world.getComponent(entity, "Transform" as ComponentType<TRegistry>) as any;
            const remote = world.getComponent(entity, "RemotePlayer" as ComponentType<TRegistry>) as any;

            if (remote && remote.targetX !== undefined) {
                // Implement Linear Interpolation (Lerp) for remote entities
                // P_visual = P_old + (P_new - P_old) * alpha
                const alpha = 0.15; // Interpolation factor
                transform.x += (remote.targetX - transform.x) * alpha;
                transform.y += (remote.targetY - transform.y) * alpha;

                // Angle interpolation (handling wrap-around)
                let diffRot = remote.targetRotation - transform.rotation;
                while (diffRot > Math.PI) diffRot -= Math.PI * 2;
                while (diffRot < -Math.PI) diffRot += Math.PI * 2;
                transform.rotation += diffRot * alpha;
            }
        }

        const localQuery = world.query("Transform" as ComponentType<TRegistry>, "LocalPlayer" as ComponentType<TRegistry>, "Velocity" as ComponentType<TRegistry>, "Input" as ComponentType<TRegistry>);
        for (const entity of localQuery) {
            const input = world.getComponent(entity, "Input" as ComponentType<TRegistry>) as any;
            const velocity = world.getComponent(entity, "Velocity" as ComponentType<TRegistry>) as any;
            const transform = world.getComponent(entity, "Transform" as ComponentType<TRegistry>) as any;

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
    public onRegister(world: World<TRegistry, any>): void {}
    public dispose(): void {}
    /**
     * Reconciles local state with the server state.
     * Replays all inputs that haven't been acknowledged by the server yet.
     */
    public reconcile(world: World<TRegistry, any>, serverTick: number, serverState: any) {
        // 1. Discard inputs that have already been processed by the server
        this.inputQueue = this.inputQueue.filter(i => i.tick > serverTick);

        // 2. Find the local player entity
        const localQuery = world.query("Transform" as ComponentType<TRegistry>, "LocalPlayer" as ComponentType<TRegistry>, "Velocity" as ComponentType<TRegistry>);
        for (const entity of localQuery) {
            const transform = world.getComponent(entity, "Transform" as ComponentType<TRegistry>) as any;
            const velocity = world.getComponent(entity, "Velocity" as ComponentType<TRegistry>) as any;

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
