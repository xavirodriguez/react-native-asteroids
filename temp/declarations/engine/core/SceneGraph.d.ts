import { Entity, Transform } from "../types/EngineTypes";
/**
 * Represents a node in the scene graph hierarchy.
 */
export interface SceneNode {
    entityId: Entity;
    parentId: Entity | null;
    childIds: Entity[];
    localTransform: Transform;
    worldTransform: Transform;
    dirty: boolean;
}
/**
 * Manages the hierarchy of entities and their transformations.
 */
export declare class SceneGraph {
    private nodes;
    private roots;
    addNode(entityId: Entity, parentId?: Entity | null): SceneNode;
    removeNode(entityId: Entity, reparentChildren?: boolean): void;
    setParent(childId: Entity, parentId: Entity | null): void;
    markDirty(entityId: Entity): void;
    updateTransforms(): void;
    getWorldTransform(entityId: Entity): Transform | undefined;
    setLocalTransform(entityId: Entity, transform: Partial<Transform>): void;
    private updateNodeTransform;
    private updateMatrix;
    private combineTransforms;
    private createDefaultTransform;
}
