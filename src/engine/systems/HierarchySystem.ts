import { System } from "../core/System";
import { World } from "../core/World";
import { Entity, TransformComponent } from "../types/EngineTypes";

/**
 * 3x3 Matrix for 2D transformations.
 * [a, c, tx, b, d, ty]
 */
type Mat3 = [number, number, number, number, number, number];

/**
 * Sistema que calcula las transformaciones en el espacio del mundo.
 *
 * @responsibility Resolver la posición, rotación y escala absoluta de las entidades.
 * @responsibility Implementar propagación de flags 'dirty' para evitar cálculos redundantes.
 */
export class HierarchySystem extends System {
  public update(world: World, _deltaTime: number): void {
    const transforms = world.query("Transform");
    const processed = new Set<Entity>();

    for (let i = 0; i < transforms.length; i++) {
      this.updateTransform(world, transforms[i], processed, false);
    }
  }

  private updateTransform(world: World, entity: Entity, processed: Set<Entity>, parentDirty: boolean): void {
    if (processed.has(entity)) return;

    const transform = world.getComponent<TransformComponent>(entity, "Transform");
    if (!transform) return;

    // A transform is dirty if it was explicitly marked or if its parent is dirty
    const isDirty = (transform as any).dirty || parentDirty;

    if (transform.parent !== undefined) {
      // Ensure parent is updated first
      this.updateTransform(world, transform.parent, processed, false);
      const parentTransform = world.getComponent<TransformComponent>(transform.parent, "Transform");

      if (isDirty && parentTransform) {
        const parentMat = this.getMatrixFromTransform(parentTransform, true);
        const localMat = this.getMatrixFromTransform(transform, false);
        const worldMat = this.multiplyMat3(parentMat, localMat);
        this.applyMatrixToWorldTransform(transform, worldMat);
        (transform as any).dirty = false;
      }
    } else if (isDirty) {
      // Root entity
      this.setToLocal(transform);
      (transform as any).dirty = false;
    }

    processed.add(entity);

    // Propagate to children (this is handled naturally by the query loop but
    // we could also do it explicitly if we had a children cache)
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
