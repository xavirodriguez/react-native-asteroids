import { World } from "../core/World";
import { TransformComponent, CoreComponentRegistry } from "../core/CoreComponents";
import { AbstractHierarchySystem } from "./AbstractHierarchySystem";
import { ComponentRegistry } from "../core/Component";
import { EventRegistry } from "../core/EventBus";

/**
 * 3x3 Matrix for 2D transformations.
 */
type Mat3 = [number, number, number, number, number, number];

/**
 * System managing hierarchical spatial transformations.
 */
export class HierarchySystem<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = any
> extends AbstractHierarchySystem<TComponents, TEvents> {

  public update(world: World<TComponents, TEvents, any>, _deltaTime: number): void {
    this.wasDirty.clear();

    const order = this.getProcessingOrder(world, "Transform");
    if (order.length === 0) return;

    for (let i = 0; i < order.length; i++) {
      const entity = order[i];
      const transform = world.getComponent(entity, "Transform" as any) as any as TransformComponent;
      if (!transform) continue;

      let parentDirty = false;
      if (transform.parentEntity !== null) {
        parentDirty = this.wasDirty.has(transform.parentEntity);
      }

      const isDirty = transform.dirty || parentDirty;

      if (isDirty) {
        world.mutateComponent(entity, "Transform" as any, (mutTransform: any) => {
          const t = mutTransform as TransformComponent;
          if (t.parentEntity !== null) {
            const parentTransform = world.getComponent(t.parentEntity, "Transform" as any) as any as TransformComponent;
            if (!parentTransform) {
              this.setToLocal(t);
            } else {
              const parentMat = this.getMatrixFromTransform(parentTransform, true);
              const localMat = this.getMatrixFromTransform(t, false);
              const worldMat = this.multiplyMat3(parentMat, localMat);
              this.applyMatrixToWorldTransform(t, worldMat);
            }
          } else {
            this.setToLocal(t);
          }
          t.dirty = false;
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
