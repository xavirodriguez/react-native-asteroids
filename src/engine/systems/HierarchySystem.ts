import { System } from "../core/System";
import { World } from "../core/World";
import { Entity, TransformComponent } from "../types/EngineTypes";

type Mat3 = [number, number, number, number, number, number, number, number, number];

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
  private static trsToMatrix(t: TransformComponent): Mat3 {
    const cos = Math.cos(t.rotation);
    const sin = Math.sin(t.rotation);
    // [m00, m01, m02, m10, m11, m12, m20, m21, m22]
    // m02 = x, m12 = y
    return [
      cos * t.scaleX, -sin * t.scaleY, t.x,
      sin * t.scaleX, cos * t.scaleY, t.y,
      0, 0, 1
    ];
  }

  private static multiplyMat3(a: Mat3, b: Mat3): Mat3 {
    return [
      a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
      a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
      a[0] * b[2] + a[1] * b[5] + a[2] * b[8],

      a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
      a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
      a[3] * b[2] + a[4] * b[5] + a[5] * b[8],

      a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
      a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
      a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
    ];
  }

  public update(world: World, _deltaTime: number): void {
    // Principal 2: Run validation in development
    if (process.env.NODE_ENV === "development") {
      this.assertValid(world);
    }

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
  }

  /**
   * Principle 2: Strong Invariants in Hierarchical Structures.
   * Validates the integrity of the scene graph/transform tree in DEV mode.
   */
  public assertValid(world: World): void {
    if (process.env.NODE_ENV !== "development") return;

    const transforms = world.query("Transform");
    const entitySet = new Set(world.getAllEntities());

    transforms.forEach((id) => {
      const t = world.getComponent<TransformComponent>(id, "Transform");
      if (!t) return;

      // Invariant: If a node has a parent, the parent MUST exist in the world
      if (t.parent !== undefined && !entitySet.has(t.parent)) {
        throw new Error(`Inconsistent hierarchy: Entity ${id} has parent ${t.parent} but it does not exist in the world.`);
      }

      // Invariant: No self-parenting
      if (t.parent === id) {
        throw new Error(`Inconsistent hierarchy: Entity ${id} is its own parent.`);
      }
    });
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
    let scaleY = Math.sqrt(c * c + d * d);

    // Check determinant sign to detect negative scale (flipping)
    const det = a * d - b * c;
    if (det < 0) {
      scaleY = -scaleY;
    }

    t.worldScaleX = scaleX;
    t.worldScaleY = scaleY;

    // Extract rotation
    t.worldRotation = Math.atan2(b, a);
  }

}

// Global helper for development mode
const __DEV__ = process.env.NODE_ENV !== "production";
