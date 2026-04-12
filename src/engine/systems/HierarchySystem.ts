import { System } from "../core/System";
import { World } from "../core/World";
import { Entity, TransformComponent } from "../types/EngineTypes";

/**
 * 3x3 Matrix for 2D transformations.
 * [a, c, tx, b, d, ty]
 */
type Mat3 = [number, number, number, number, number, number];

/**
 * Sistema responsable de resolver las transformaciones espaciales jerárquicas.
 *
 * @responsibility Calcular coordenadas de mundo (worldX, worldY, worldRotation, worldScale)
 * a partir de coordenadas locales y la relación con el padre.
 * @responsibility Propagar cambios de transformación mediante un sistema de flags 'dirty'
 * para optimizar el rendimiento.
 * @queries Transform
 * @mutates Transform (worldX, worldY, worldRotation, worldScaleX, worldScaleY, dirty)
 * @executionOrder Fase: Simulation/Presentation. Debe ejecutarse tras los sistemas que mutan
 * la posición local y antes del renderizado.
 *
 * @remarks
 * Implementa una propagación top-down para asegurar que los hijos siempre se calculen
 * después de sus padres. Utiliza matrices 3x3 para composición de transformaciones.
 *
 * @conceptualRisk [LAYOUT_CASCADE][MEDIUM] Una jerarquía muy profunda puede causar un
 * coste de cálculo elevado si la raíz cambia frecuentemente.
 * @conceptualRisk [WORLD_SYNC][HIGH] Si un sistema lee `worldX/Y` antes de que `HierarchySystem`
 * se ejecute en el frame actual, obtendrá datos del frame anterior (lag visual o de física).
 */
export class HierarchySystem extends System {
  private wasDirty = new Set<Entity>();

  public update(world: World, _deltaTime: number): void {
    const transforms = world.query("Transform");
    const processed = new Set<Entity>();
    this.wasDirty.clear();

    for (let i = 0; i < transforms.length; i++) {
      this.updateTransform(world, transforms[i], processed, false);
    }
  }

  /**
   * Actualiza recursivamente la transformación de una entidad.
   */
  private updateTransform(world: World, entity: Entity, processed: Set<Entity>, forcedDirty: boolean): boolean {
    if (processed.has(entity)) {
      return this.wasDirty.has(entity);
    }

    const transform = world.getComponent<TransformComponent>(entity, "Transform");
    if (!transform) return false;

    let isDirty = (transform as any).dirty || forcedDirty;

    if (transform.parent !== undefined) {
      // Propagation: parent's dirty state forces child to be dirty
      const parentChanged = this.updateTransform(world, transform.parent, processed, forcedDirty);
      isDirty = isDirty || parentChanged;

      if (isDirty) {
        const parentTransform = world.getComponent<TransformComponent>(transform.parent, "Transform")!;
        const parentMat = this.getMatrixFromTransform(parentTransform, true);
        const localMat = this.getMatrixFromTransform(transform, false);
        const worldMat = this.multiplyMat3(parentMat, localMat);
        this.applyMatrixToWorldTransform(transform, worldMat);
      }
    } else if (isDirty) {
      // Root entity
      this.setToLocal(transform);
    }

    if (isDirty) {
      (transform as any).dirty = false;
      this.wasDirty.add(entity);
    }

    processed.add(entity);
    return isDirty;
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
