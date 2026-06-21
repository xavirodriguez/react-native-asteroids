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
                const alpha = 0.1;
                transform.x += (remote.targetX - transform.x) * alpha;
                transform.y += (remote.targetY - transform.y) * alpha;
                transform.rotation += (remote.targetRotation - transform.rotation) * alpha;
            }
        }
        const localQuery = world.query("Transform" as ComponentType<TRegistry>, "LocalPlayer" as ComponentType<TRegistry>, "Velocity" as ComponentType<TRegistry>, "Input" as ComponentType<TRegistry>);
        for (const entity of localQuery) {
            const input = world.getComponent(entity, "Input" as ComponentType<TRegistry>) as any;
            const velocity = world.getComponent(entity, "Velocity" as ComponentType<TRegistry>) as any;
            const transform = world.getComponent(entity, "Transform" as ComponentType<TRegistry>) as any;
            if (input.thrust) {
                const ax = Math.cos(transform.rotation) * 100;
                const ay = Math.sin(transform.rotation) * 100;
                velocity.vx += ax * (deltaTime / 1000);
                velocity.vy += ay * (deltaTime / 1000);
            }
            this.inputQueue.push({ tick: this.lastProcessedTick++, input: { ...input } });
        }
    }
    public onRegister(world: World<TRegistry, any>): void {}
    public dispose(): void {}
    public reconcile(world: World<TRegistry, any>, serverTick: number, serverState: any) {
        this.inputQueue = this.inputQueue.filter(i => i.tick > serverTick);
    }
}
