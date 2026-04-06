import { System } from "../core/System";
import { World } from "../core/World";
import { Entity, TransformComponent } from "../types/EngineTypes";

type Mat3 = [number, number, number, number, number, number, number, number, number];

/**
 * System that calculates world-space transforms based on parent-child relationships.
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

    // Reset all world transforms to local transforms first, then propagate
    // A better way would be to only process those with parents and their children
    // but for simplicity and correctness, we process everyone.

    // We can use a recursive approach or a flat one if we sort by depth.
    // Given entities are just IDs, sorting by ID might not work.

    const processed = new Set<Entity>();

    transforms.forEach((entity) => {
      this.updateTransform(world, entity, processed);
    });
  }

  private updateTransform(world: World, entity: Entity, processed: Set<Entity>): void {
    if (processed.has(entity)) return;

    const transform = world.getComponent<TransformComponent>(entity, "Transform");
    if (!transform) return;

    if (transform.parent !== undefined) {
      // Ensure parent is updated first
      this.updateTransform(world, transform.parent, processed);

      const parentTransform = world.getComponent<TransformComponent>(transform.parent, "Transform");
      if (parentTransform) {
        // Principle 9: Matrices for non-uniform scale transform composition
        const parentMat: Mat3 = [
          (parentTransform.worldScaleX ?? 1) * Math.cos(parentTransform.worldRotation ?? 0),
          -(parentTransform.worldScaleY ?? 1) * Math.sin(parentTransform.worldRotation ?? 0),
          parentTransform.worldX ?? 0,
          (parentTransform.worldScaleX ?? 1) * Math.sin(parentTransform.worldRotation ?? 0),
          (parentTransform.worldScaleY ?? 1) * Math.cos(parentTransform.worldRotation ?? 0),
          parentTransform.worldY ?? 0,
          0, 0, 1
        ];

        const localMat = HierarchySystem.trsToMatrix(transform);
        const worldMat = HierarchySystem.multiplyMat3(parentMat, localMat);

        transform.worldX = worldMat[2];
        transform.worldY = worldMat[5];

        // Decompose rotation and scale from matrix (simplified for 2D)
        transform.worldRotation = Math.atan2(worldMat[3], worldMat[0]);
        transform.worldScaleX = Math.sqrt(worldMat[0] * worldMat[0] + worldMat[3] * worldMat[3]);
        transform.worldScaleY = Math.sqrt(worldMat[1] * worldMat[1] + worldMat[4] * worldMat[4]);
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
}
