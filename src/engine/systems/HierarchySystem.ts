import { System } from "../core/System";
import { World } from "../core/World";
import { Entity, TransformComponent } from "../types/EngineTypes";

/**
 * System that calculates world-space transforms based on parent-child relationships.
 */
export class HierarchySystem extends System {
  public update(world: World, _deltaTime: number): void {
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
        // Simple 2D transformation propagation
        // worldX = parent.worldX + (localX * cos(parent.worldRot) - localY * sin(parent.worldRot)) * parent.worldScaleX

        const cos = Math.cos(parentTransform.worldRotation || 0);
        const sin = Math.sin(parentTransform.worldRotation || 0);

        const pScaleX = parentTransform.worldScaleX ?? 1;
        const pScaleY = parentTransform.worldScaleY ?? 1;

        transform.worldX = (parentTransform.worldX ?? 0) + (transform.x * cos - transform.y * sin) * pScaleX;
        transform.worldY = (parentTransform.worldY ?? 0) + (transform.x * sin + transform.y * cos) * pScaleY;
        transform.worldRotation = (parentTransform.worldRotation ?? 0) + transform.rotation;
        transform.worldScaleX = pScaleX * transform.scaleX;
        transform.worldScaleY = pScaleY * transform.scaleY;
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

  private setToLocal(transform: TransformComponent): void {
    transform.worldX = transform.x;
    transform.worldY = transform.y;
    transform.worldRotation = transform.rotation;
    transform.worldScaleX = transform.scaleX;
    transform.worldScaleY = transform.scaleY;
  }
}
