import { TransformComponent, Collider2DComponent, Entity, AABB } from "../../types/EngineTypes";
export declare class BroadPhase {
    static getShapeBounds(transform: TransformComponent, collider: Collider2DComponent): AABB;
    static sweepAndPrune(entities: Entity[], world: any): Array<[Entity, Entity]>;
}
