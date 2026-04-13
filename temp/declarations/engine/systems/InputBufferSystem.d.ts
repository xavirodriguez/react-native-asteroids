import { System } from "../core/System";
import { World } from "../core/World";
import { Entity } from "../core/Entity";
export declare class InputBufferSystem extends System {
    update(world: World, deltaTime: number): void;
    static buffer(world: World, entity: Entity, action: string, duration?: number): void;
    static consume(world: World, entity: Entity, action: string): boolean;
}
