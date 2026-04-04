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
 * Ensures that child entities' transforms are relative to their parents.
 */
export class SceneGraph {
  private nodes = new Map<Entity, SceneNode>();
  private roots = new Set<Entity>();

  /**
   * Adds a new node to the scene graph.
   */
  public addNode(entityId: Entity, parentId: Entity | null = null): SceneNode {
    const node: SceneNode = {
      entityId,
      parentId,
      childIds: [],
      localTransform: this.createDefaultTransform(),
      worldTransform: this.createDefaultTransform(),
      dirty: true,
    };

    this.nodes.set(entityId, node);

    if (parentId !== null) {
      const parent = this.nodes.get(parentId);
      if (parent) {
        parent.childIds.push(entityId);
      } else {
        this.roots.add(entityId);
      }
    } else {
      this.roots.add(entityId);
    }

    return node;
  }

  /**
   * Removes a node from the scene graph.
   */
  public removeNode(entityId: Entity, reparentChildren: boolean = true): void {
    const node = this.nodes.get(entityId);
    if (!node) return;

    if (node.parentId !== null) {
      const parent = this.nodes.get(node.parentId);
      if (parent) {
        parent.childIds = parent.childIds.filter(id => id !== entityId);
      }
    }

    // Always attempt to remove from roots, covering cases where parentId
    // was set but the parent didn't exist in the graph.
    this.roots.delete(entityId);

    if (reparentChildren) {
      for (const childId of node.childIds) {
        this.setParent(childId, node.parentId);
      }
    } else {
      for (const childId of node.childIds) {
        this.removeNode(childId, false);
      }
    }

    this.nodes.delete(entityId);
  }

  /**
   * Sets or changes the parent of a node.
   */
  public setParent(childId: Entity, parentId: Entity | null): void {
    const child = this.nodes.get(childId);
    if (!child) return;

    // Remove from old parent
    if (child.parentId !== null) {
      const oldParent = this.nodes.get(child.parentId);
      if (oldParent) {
        oldParent.childIds = oldParent.childIds.filter(id => id !== childId);
      }
    } else {
      this.roots.delete(childId);
    }

    child.parentId = parentId;
    child.dirty = true;

    // Add to new parent
    if (parentId !== null) {
      const newParent = this.nodes.get(parentId);
      if (newParent) {
        newParent.childIds.push(childId);
      } else {
        this.roots.add(childId);
      }
    } else {
      this.roots.add(childId);
    }
  }

  /**
   * Updates all world transforms in the hierarchy.
   * Uses a Depth-First Search with dirty flag propagation.
   */
  public updateTransforms(): void {
    for (const rootId of this.roots) {
      this.updateNodeTransform(rootId, null, false);
    }
  }

  /**
   * Gets the world transform of an entity.
   */
  public getWorldTransform(entityId: Entity): Transform | undefined {
    return this.nodes.get(entityId)?.worldTransform;
  }

  /**
   * Sets the local transform for a node and marks it as dirty.
   */
  public setLocalTransform(entityId: Entity, transform: Partial<Transform>): void {
    const node = this.nodes.get(entityId);
    if (node) {
      Object.assign(node.localTransform, transform);
      node.dirty = true;
    }
  }

  private updateNodeTransform(entityId: Entity, parentTransform: Transform | null, parentDirty: boolean): void {
    const node = this.nodes.get(entityId)!;
    const isDirty = node.dirty || parentDirty;

    if (isDirty) {
      if (parentTransform) {
        this.combineTransforms(node.worldTransform, parentTransform, node.localTransform);
      } else {
        Object.assign(node.worldTransform, node.localTransform);
      }
      node.dirty = false;
    }

    for (const childId of node.childIds) {
      this.updateNodeTransform(childId, node.worldTransform, isDirty);
    }
  }

  private combineTransforms(out: Transform, parent: Transform, local: Transform): void {
    const cos = Math.cos(parent.rotation);
    const sin = Math.sin(parent.rotation);

    const rotatedX = (local.x * parent.scaleX * cos) - (local.y * parent.scaleY * sin);
    const rotatedY = (local.x * parent.scaleX * sin) + (local.y * parent.scaleY * cos);

    out.x = parent.x + rotatedX;
    out.y = parent.y + rotatedY;
    out.rotation = parent.rotation + local.rotation;
    out.scaleX = parent.scaleX * local.scaleX;
    out.scaleY = parent.scaleY * local.scaleY;
  }

  private createDefaultTransform(): Transform {
    return { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
  }
}
