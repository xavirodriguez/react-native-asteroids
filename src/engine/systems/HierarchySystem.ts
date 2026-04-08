import { System } from "../core/System";
import { World } from "../core/World";
import { Entity, TransformComponent } from "../types/EngineTypes";

/**
 * 3x3 Matrix for 2D transformations.
 * Row-major order: [m00, m01, m02, m10, m11, m12, m20, m21, m22]
 * Since it's 2D affine, we only need 6 values: [a, c, tx, b, d, ty]
 * m00=a, m01=c, m02=tx
 * m10=b, m11=d, m12=ty
 * m20=0, m21=0, m22=1
 */
type Mat3 = [number, number, number, number, number, number];

/**
 * System that calculates world-space transforms based on parent-child relationships.
 *
 * Principle 9: Matrices for Non-Uniform Scale
 * Composes transforms using 3x3 matrices to correctly handle rotation with non-uniform scaling.
 *
 * Principle 2: Strong Invariants
 * Enforces hierarchical invariants through assertValid() in development.
 */
export class HierarchySystem extends System {
  public update(world: World, _deltaTime: number): void {
    const transforms = world.query("Transform");

    const processed = new Set<Entity>();

    transforms.forEach((entity) => {
      this.updateTransform(world, entity, processed);
    });
  }

  private updateTransform(world: World, entity: Entity, processed: Set<Entity>): void {
    if (processed.has(entity)) return;

    const transform = world.getComponent<TransformComponent>(entity, "Transform");
    if (!transform) return;

    // Principle 2: Invariants already normalized in World.addComponent

    if (transform.parent !== undefined) {
      // Ensure parent is updated first
      this.updateTransform(world, transform.parent, processed);

      const parentTransform = world.getComponent<TransformComponent>(transform.parent, "Transform");
      if (parentTransform) {
        // Principle 9: Matrix composition for correct non-uniform scale
        const parentMat = this.getMatrixFromTransform(parentTransform, true);
        const localMat = this.getMatrixFromTransform(transform, false);
        const worldMat = this.multiplyMat3(parentMat, localMat);

        this.applyMatrixToWorldTransform(transform, worldMat);
      } else {
        // Parent missing, treat as root
        this.setToLocal(transform);
      }
    } else {
      // Root entity
      this.setToLocal(transform);
    }

    processed.add(entity);

    if (__DEV__) {
      this.assertValid(world, entity);
    }
  }

  private setToLocal(transform: TransformComponent): void {
    transform.worldX = transform.x;
    transform.worldY = transform.y;
    transform.worldRotation = transform.rotation;
    transform.worldScaleX = transform.scaleX;
    transform.worldScaleY = transform.scaleY;
  }

  /**
   * Principle 9: Converts transform properties to a 3x3 matrix.
   */
  private getMatrixFromTransform(t: TransformComponent, useWorld: boolean): Mat3 {
    const x = useWorld ? (t.worldX ?? t.x) : t.x;
    const y = useWorld ? (t.worldY ?? t.y) : t.y;
    const rotation = useWorld ? (t.worldRotation ?? t.rotation) : t.rotation;
    const scaleX = useWorld ? (t.worldScaleX ?? t.scaleX) : t.scaleX;
    const scaleY = useWorld ? (t.worldScaleY ?? t.scaleY) : t.scaleY;

    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    // [ a, c, tx, b, d, ty ]
    return [
      cos * scaleX, -sin * scaleY, x,
      sin * scaleX,  cos * scaleY, y
    ];
  }

  /**
   * Principle 9: Multiplies two 3x3 affine matrices.
   */
  private multiplyMat3(m1: Mat3, m2: Mat3): Mat3 {
    const [a1, c1, tx1, b1, d1, ty1] = m1;
    const [a2, c2, tx2, b2, d2, ty2] = m2;

    return [
      a1 * a2 + c1 * b2,       a1 * c2 + c1 * d2,       a1 * tx2 + c1 * ty2 + tx1,
      b1 * a2 + d1 * b2,       b1 * c2 + d1 * d2,       b1 * tx2 + d1 * ty2 + ty1
    ];
  }

  /**
   * Principle 9: Decomposes world matrix back to world transform properties.
   * Note: Pure decomposition of rotation/scale from matrix can be ambiguous
   * but for 2D engine it's sufficient for rendering.
   */
  private applyMatrixToWorldTransform(t: TransformComponent, m: Mat3): void {
    const [a, c, tx, b, d, ty] = m;

    t.worldX = tx;
    t.worldY = ty;

    // Extract scale
    const scaleX = Math.sqrt(a * a + b * b);
    const scaleY = Math.sqrt(c * c + d * d);
    t.worldScaleX = scaleX;
    t.worldScaleY = scaleY;

    // Extract rotation
    t.worldRotation = Math.atan2(b, a);
  }

  /**
   * Principle 2: Enforces hierarchical invariants.
   */
  public assertValid(world: World, entity: Entity): void {
    const transform = world.getComponent<TransformComponent>(entity, "Transform");
    if (!transform) return;

    if (transform.parent !== undefined) {
      if (!world.getAllEntities().includes(transform.parent)) {
        throw new Error(`Hierarchy Invariant Violation: Entity ${entity} has parent ${transform.parent} but parent does not exist in world.`);
      }
      if (transform.parent === entity) {
        throw new Error(`Hierarchy Invariant Violation: Entity ${entity} cannot be its own parent.`);
      }
    }
  }

}

// Global helper for development mode
const __DEV__ = process.env.NODE_ENV !== "production";
