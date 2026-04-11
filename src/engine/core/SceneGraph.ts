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
 *
 * @responsibility Administrar relaciones padre-hijo entre entidades fuera del flujo ECS principal.
 * @responsibility Calcular matrices de transformación del mundo (world transforms) de forma recursiva.
 *
 * @deprecated Use `HierarchySystem` instead for ECS-integrated transform calculations.
 *
 * @remarks
 * Esta clase se mantiene por compatibilidad con sistemas legados. En el nuevo flujo ECS,
 * la jerarquía se gestiona mediante componentes `ParentComponent` y el `HierarchySystem`.
 *
 * @invariant Un nodo no puede ser su propio padre (no circularidad, aunque no se valida explícitamente).
 * @conceptualRisk [STALE_TRANSFORMS] Si no se llama a `updateTransforms()` tras cambios en la
 * jerarquía, las world transforms estarán desincronizadas.
 * @conceptualRisk [MEMORY_LEAK] Las entidades eliminadas del World deben eliminarse manualmente
 * del SceneGraph para evitar fugas de memoria en el mapa `nodes`.
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
      }
    }

    // Always attempt to add to roots if parent is null or missing
    if (parentId === null || !this.nodes.has(parentId)) {
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
    }

    this.roots.delete(childId);

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
      this.updateMatrix(node.localTransform);
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

  private updateMatrix(t: Transform): void {
    const cos = Math.cos(t.rotation);
    const sin = Math.sin(t.rotation);

    if (!t.matrix) t.matrix = [1, 0, 0, 1, 0, 0];

    // [ a, b, c, d, tx, ty ]
    // [ sX*cos, sX*sin, -sY*sin, sY*cos, x, y ]
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

    // Standard 2x3 matrix multiplication (mo = m1 * m2)
    // | a1 c1 tx1 |   | a2 c2 tx2 |
    // | b1 d1 ty1 | * | b2 d2 ty2 |
    // | 0  0  1   |   | 0  0  1   |

    const a1 = m1[0], b1 = m1[1], c1 = m1[2], d1 = m1[3], tx1 = m1[4], ty1 = m1[5];
    const a2 = m2[0], b2 = m2[1], c2 = m2[2], d2 = m2[3], tx2 = m2[4], ty2 = m2[5];

    mo[0] = a1 * a2 + c1 * b2;
    mo[1] = b1 * a2 + d1 * b2;
    mo[2] = a1 * c2 + c1 * d2;
    mo[3] = b1 * c2 + d1 * d2;
    mo[4] = a1 * tx2 + c1 * ty2 + tx1;
    mo[5] = b1 * tx2 + d1 * ty2 + ty1;

    // Update decomposed properties for backward compatibility
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
