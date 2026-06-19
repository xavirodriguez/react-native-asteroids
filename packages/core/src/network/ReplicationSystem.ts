import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { ComponentRegistry } from "../ecs/Component";

export class ReplicationSystem<TRegistry extends ComponentRegistry = ComponentRegistry> extends System<TRegistry> {
    constructor(manager: unknown) {
        super();
    }
    public update(world: World<TRegistry, any>, deltaTime: number): void {}
    public onRegister(world: World<TRegistry, any>): void {}
    public dispose(): void {}
}
