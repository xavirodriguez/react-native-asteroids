import { World } from "../../core/World";
import { Entity, Shape } from "../../types/EngineTypes";
import { Ray, RaycastHit } from "./QueryTypes";
export declare class PhysicsQuery {
    static raycast(world: World, ray: Ray, layerMask?: number, ignoredEntities?: Set<Entity>): RaycastHit | null;
    static raycastAll(world: World, ray: Ray, layerMask?: number, ignoredEntities?: Set<Entity>): RaycastHit[];
    static pointQuery(world: World, x: number, y: number, layerMask?: number): Entity[];
    static overlapCircle(world: World, x: number, y: number, radius: number, layerMask?: number): Entity[];
    static overlapAABB(world: World, x: number, y: number, hw: number, hh: number, layerMask?: number): Entity[];
    static shapeCast(world: World, shape: Shape, startX: number, startY: number, dirX: number, dirY: number, maxDistance: number, layerMask?: number, ignoredEntities?: Set<Entity>): RaycastHit | null;
}
