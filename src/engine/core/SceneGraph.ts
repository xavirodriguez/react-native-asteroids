import { Entity, Transform } from "../types/EngineTypes";

/**
 * Node in the scene graph hierarchy.
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
 * Manages the hierarchy of entities and their transformations with dirty flag propagation.
 *
 * @remarks
 * Ensures world transforms are updated top-down to prevent stale data.
 * The `updateTransforms()` method must be called during the Presentation phase.
 */
export class SceneGraph {
  private nodes = new Map<Entity, SceneNode>();
  private roots = new Set<Entity>();

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
      }
    }

    if (parentId === null || !this.nodes.has(parentId)) {
      this.roots.add(entityId);
    }

    return node;
  }

  public removeNode(entityId: Entity, reparentChildren: boolean = true): void {
    const node = this.nodes.get(entityId);
    if (!node) return;

    if (node.parentId !== null) {
      const parent = this.nodes.get(node.parentId);
      if (parent) {
        parent.childIds = parent.childIds.filter(id => id !== entityId);
      }
    }

    this.roots.delete(entityId);

    if (reparentChildren) {
      for (const childId of node.childIds) {
        this.setParent(childId, node.parentId);
      }
    } else {
      const children = [...node.childIds];
      for (const childId of children) {
        this.removeNode(childId, false);
      }
    }

    this.nodes.delete(entityId);
  }

  public setParent(childId: Entity, parentId: Entity | null): void {
    const child = this.nodes.get(childId);
    if (!child) return;

    if (child.parentId !== null) {
      const oldParent = this.nodes.get(child.parentId);
      if (oldParent) {
        oldParent.childIds = oldParent.childIds.filter(id => id !== childId);
      }
    }

    this.roots.delete(childId);

    child.parentId = parentId;
    this.markDirty(childId);

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
   * Marks a node and all its descendants as dirty.
   */
  public markDirty(entityId: Entity): void {
    const node = this.nodes.get(entityId);
    if (node && !node.dirty) {
      node.dirty = true;
      for (let i = 0; i < node.childIds.length; i++) {
          this.markDirty(node.childIds[i]);
      }
    }
  }

  /**
   * Mandatory update phase to resolve all dirty transforms.
   */
  public updateTransforms(): void {
    for (const rootId of this.roots) {
      this.updateNodeTransform(rootId, null, false);
    }
  }

  public getWorldTransform(entityId: Entity): Transform | undefined {
    return this.nodes.get(entityId)?.worldTransform;
  }

  public setLocalTransform(entityId: Entity, transform: Partial<Transform>): void {
    const node = this.nodes.get(entityId);
    if (node) {
      Object.assign(node.localTransform, transform);
      this.markDirty(entityId);
    }
  }

  private updateNodeTransform(entityId: Entity, parentTransform: Transform | null, parentDirty: boolean): void {
    const node = this.nodes.get(entityId);
    if (!node) return;

    const isDirty = node.dirty || parentDirty;

    if (isDirty) {
      this.updateMatrix(node.localTransform);
      if (parentTransform) {
        this.combineTransforms(node.worldTransform, parentTransform, node.localTransform);
      } else {
        // Root node
        // Root node: copy scalar properties, then clone the matrix array
        const { matrix: _srcMatrix, ...scalarProps } = node.localTransform;
        Object.assign(node.worldTransform, scalarProps);
        if (!node.worldTransform.matrix) {
            node.worldTransform.matrix = [1, 0, 0, 1, 0, 0];
        }
        if (node.localTransform.matrix) {
            for (let i = 0; i < 6; i++) {
                node.worldTransform.matrix[i] = node.localTransform.matrix[i];
            }
        }
      }
      node.dirty = false;
    }

    for (const childId of node.childIds) {
      this.updateNodeTransform(childId, node.worldTransform, isDirty);
    }
  }

  private updateMatrix(t: Transform): void {
    const cos = Math.cos(t.rotation);
    const sin = Math.sin(t.rotation);

    if (!t.matrix) t.matrix = [1, 0, 0, 1, 0, 0];

    t.matrix[0] = t.scaleX * cos;
    t.matrix[1] = t.scaleX * sin;
    t.matrix[2] = -t.scaleY * sin;
    t.matrix[3] = t.scaleY * cos;
    t.matrix[4] = t.x;
    t.matrix[5] = t.y;
  }

  private combineTransforms(out: Transform, parent: Transform, local: Transform): void {
    const m1 = parent.matrix!;
    const m2 = local.matrix!;

    if (!out.matrix) out.matrix = [1, 0, 0, 1, 0, 0];
    const mo = out.matrix;

    const a1 = m1[0], b1 = m1[1], c1 = m1[2], d1 = m1[3], tx1 = m1[4], ty1 = m1[5];
    const a2 = m2[0], b2 = m2[1], c2 = m2[2], d2 = m2[3], tx2 = m2[4], ty2 = m2[5];

    mo[0] = a1 * a2 + c1 * b2;
    mo[1] = b1 * a2 + d1 * b2;
    mo[2] = a1 * c2 + c1 * d2;
    mo[3] = b1 * c2 + d1 * d2;
    mo[4] = a1 * tx2 + c1 * ty2 + tx1;
    mo[5] = b1 * tx2 + d1 * ty2 + ty1;

    out.x = mo[4];
    out.y = mo[5];
    out.rotation = parent.rotation + local.rotation;
    out.scaleX = parent.scaleX * local.scaleX;
    out.scaleY = parent.scaleY * local.scaleY;
  }

  private createDefaultTransform(): Transform {
    return { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, matrix: [1, 0, 0, 1, 0, 0] };
  }
}
