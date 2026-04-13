import { System } from "../../core/System";
import { World } from "../../core/World";
import { Entity, CollisionManifold } from "../../types/EngineTypes";
export type CollisionCallback = (world: World, entityA: Entity, entityB: Entity, manifold: CollisionManifold) => void;
export type TriggerCallback = (world: World, entityA: Entity, entityB: Entity) => void;
export declare class CollisionSystem2D extends System {
    private onCollisionCallbacks;
    private onTriggerEnterCallbacks;
    private onTriggerExitCallbacks;
    private activePairs;
    private spatialHash;
    useSpatialHash(cellSize: number): void;
    onCollision(callback: CollisionCallback): void;
    onTriggerEnter(callback: TriggerCallback): void;
    onTriggerExit(callback: TriggerCallback): void;
    update(world: World, _deltaTime: number): void;
    private shouldCollide;
    private getPairId;
    private notifyCollisionEvent;
    private addCollisionToComponent;
    private notifyTriggerEvent;
    private addTriggerToComponent;
}
