import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { ComponentRegistry } from "../ecs/Component";

export class ReplicationSystem<TRegistry extends ComponentRegistry = any> extends System<TRegistry> {
    constructor(manager: any) {
        super();
    }
    public update(world: World<TRegistry>, deltaTime: number): void {}
    public onRegister(world: World<TRegistry>): void {}
    public dispose(): void {}
}
