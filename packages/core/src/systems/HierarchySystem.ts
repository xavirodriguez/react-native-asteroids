import { World } from "../ecs/World";
import { TransformComponent } from "../ecs/CoreComponents";
import { AbstractHierarchySystem } from "./AbstractHierarchySystem";

/**
 * 3x3 Matrix for 2D transformations.
 * Column-major order: [a, c, tx, b, d, ty]
 *
 * @internal
 */
type Mat3 = [number, number, number, number, number, number];

/**
 * System managing hierarchical spatial transformations.
 *
 * @responsibility Calculate world-space coordinates (X, Y, Rotation, Scale) from local offsets.
 * @responsibility Propagate changes down the entity tree, typically using a topological sort.
 * @responsibility Aim to optimize updates via a dirty-flag propagation system.
 *
 * @remarks
 * Implementa una propagación top-down orientada a que los hijos se calculen
 * después de sus padres. Utiliza matrices 3x3 para composición de transformaciones.
 * This system bridges the gap between local simulation (movement) and absolute
 * rendering/collision world coordinates.
 *
 * ### Execution Order:
 * Typically runs at the end of the `Simulation` phase or start of `Presentation`.
 * It MUST run after local movement systems to avoid 1-frame visual lag.
 *
 * @conceptualRisk [LAYOUT_CASCADE][MEDIUM] Deep hierarchies incur higher
 * computational costs during root changes.
 * @conceptualRisk [WORLD_SYNC][HIGH] Systems reading `worldX/Y` before
 * this system executes will receive stale data from the previous frame.
 *
 * @public
 */
export class HierarchySystem extends AbstractHierarchySystem {
  /**
   * Resolves world transforms for all entities with a Transform component.
   *
   * @param world - Target ECS world.
   * @param _deltaTime - Elapsed time (ignored).
   *
   * @remarks
   * Utiliza el ordenamiento topológico iterativo heredado de AbstractHierarchySystem.
   * This system bridges the gap between local simulation (movement) and absolute
   * rendering/collision world coordinates.
   *
   * @postcondition Intends to update `worldX`, `worldY`, `worldRotation`, `worldScaleX`, and `worldScaleY`
   * for `Transform` components marked as dirty (or with dirty parents).
   * @sideEffect Resets the `dirty` flag for processed components.
   */
  public update(world: World, _deltaTime: number): void {
    this.wasDirty.clear();

    const order = this.getProcessingOrder(world, "Transform");
    if (order.length === 0) return;

    // 2. Iteratively process transformations in topological order
    for (let i = 0; i < order.length; i++) {
      const entity = order[i];
      const transform = world.getComponent<TransformComponent>(entity, "Transform");
      if (!transform) continue;

      let parentDirty = false;
      if (transform.parentEntity !== null) {
        parentDirty = this.wasDirty.has(transform.parentEntity);
      }

      const isDirty = transform.dirty || parentDirty;

      if (isDirty) {
        world.mutateComponent<TransformComponent>(entity, "Transform", mutTransform => {
          if (mutTransform.parentEntity !== null) {
            const parentTransform = world.getComponent<TransformComponent>(mutTransform.parentEntity, "Transform");
            if (!parentTransform) {
              this.setToLocal(mutTransform);
            } else {
              const parentMat = this.getMatrixFromTransform(parentTransform, true);
              const localMat = this.getMatrixFromTransform(mutTransform, false);
              const worldMat = this.multiplyMat3(parentMat, localMat);
              this.applyMatrixToWorldTransform(mutTransform, worldMat);
            }
          } else {
            this.setToLocal(mutTransform);
          }
          mutTransform.dirty = false;
        });
        this.wasDirty.add(entity);
      }
    }
  }

  private setToLocal(t: TransformComponent): void {
    t.worldX = t.x;
    t.worldY = t.y;
    t.worldRotation = t.rotation;
    t.worldScaleX = t.scaleX;
    t.worldScaleY = t.scaleY;
  }

  private getMatrixFromTransform(t: TransformComponent, useWorld: boolean): Mat3 {
    const x = useWorld ? (t.worldX ?? t.x) : t.x;
    const y = useWorld ? (t.worldY ?? t.y) : t.y;
    const rot = useWorld ? (t.worldRotation ?? t.rotation) : t.rotation;
    const sx = useWorld ? (t.worldScaleX ?? t.scaleX) : t.scaleX;
    const sy = useWorld ? (t.worldScaleY ?? t.scaleY) : t.scaleY;

    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    return [
      cos * sx, -sin * sy, x,
      sin * sx,  cos * sy, y
    ];
  }

  private multiplyMat3(m1: Mat3, m2: Mat3): Mat3 {
    const [a1, c1, tx1, b1, d1, ty1] = m1;
    const [a2, c2, tx2, b2, d2, ty2] = m2;

    return [
      a1 * a2 + c1 * b2, a1 * c2 + c1 * d2, a1 * tx2 + c1 * ty2 + tx1,
      b1 * a2 + d1 * b2, b1 * c2 + d1 * d2, b1 * tx2 + d1 * ty2 + ty1
    ];
  }

  private applyMatrixToWorldTransform(t: TransformComponent, m: Mat3): void {
    const [a, c, tx, b, d, ty] = m;
    t.worldX = tx;
    t.worldY = ty;
    t.worldScaleX = Math.sqrt(a * a + b * b);
    t.worldScaleY = Math.sqrt(c * c + d * d);
    t.worldRotation = Math.atan2(b, a);
  }
}
