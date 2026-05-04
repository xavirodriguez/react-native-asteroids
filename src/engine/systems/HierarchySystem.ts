import { System } from "../core/System";
import { World } from "../core/World";
import { Entity, TransformComponent } from "../types/EngineTypes";

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
 * @responsibility Propagate changes down the entity tree using a topological sort.
 * @responsibility Optimize updates via a dirty-flag propagation system.
 *
 * @remarks
 * Implementa una propagación top-down destinada a asegurar que los hijos se calculen
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
export class HierarchySystem extends System {
  private wasDirty = new Set<Entity>();

  /**
   * Recursively resolves world transforms for all entities with a Transform component.
   *
   * @param world - Target ECS world.
   * @param _deltaTime - Elapsed time (ignored).
   *
   * @remarks
   * Performs an iterative topological sort to handle arbitrary tree depths without
   * stack overflow. Detects and ignores circular dependencies.
   *
   * @postcondition All `Transform` components marked as dirty (or with dirty parents)
   * have their `worldX`, `worldY`, `worldRotation`, `worldScaleX`, and `worldScaleY` updated.
   * @sideEffect Resets the `dirty` flag for processed components.
   */
  public update(world: World, _deltaTime: number): void {
    const transforms = world.query("Transform");
    if (transforms.length === 0) return;

    this.wasDirty.clear();

    // 1. Build processing order (Topological Sort - fully iterative)
    const order: Entity[] = [];
    const visited = new Set<Entity>();
    const processing = new Set<Entity>();
    const stack: { entity: Entity, stage: 'enter' | 'exit' }[] = [];

    for (let i = 0; i < transforms.length; i++) {
      const startEntity = transforms[i];
      if (visited.has(startEntity)) continue;

      stack.push({ entity: startEntity, stage: 'enter' });

      while (stack.length > 0) {
        const current = stack.pop()!;
        const { entity, stage } = current;

        if (stage === 'enter') {
          if (visited.has(entity)) continue;
          if (processing.has(entity)) {
            console.warn(`[HierarchySystem] Circular dependency detected at entity ${entity}.`);
            continue;
          }

          processing.add(entity);
          stack.push({ entity, stage: 'exit' });

          const transform = world.getComponent<TransformComponent>(entity, "Transform");
          if (transform && transform.parent !== undefined) {
            stack.push({ entity: transform.parent, stage: 'enter' });
          }
        } else {
          processing.delete(entity);
          visited.add(entity);
          order.push(entity);
        }
      }
    }

    // 2. Iteratively process transformations in topological order
    for (let i = 0; i < order.length; i++) {
      const entity = order[i];
      const transform = world.getComponent<TransformComponent>(entity, "Transform");
      if (!transform) continue;

      let parentDirty = false;
      if (transform.parent !== undefined) {
        parentDirty = this.wasDirty.has(transform.parent);
      }

      const isDirty = transform.dirty || parentDirty;

      if (isDirty) {
        if (transform.parent !== undefined) {
          const parentTransform = world.getComponent<TransformComponent>(transform.parent, "Transform")!;
          const parentMat = this.getMatrixFromTransform(parentTransform, true);
          const localMat = this.getMatrixFromTransform(transform, false);
          const worldMat = this.multiplyMat3(parentMat, localMat);
          this.applyMatrixToWorldTransform(transform, worldMat);
        } else {
          this.setToLocal(transform);
        }
        transform.dirty = false;
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
