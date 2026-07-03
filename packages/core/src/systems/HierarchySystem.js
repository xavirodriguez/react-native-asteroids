"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchySystem = void 0;
const AbstractHierarchySystem_1 = require("./AbstractHierarchySystem");
class HierarchySystem extends AbstractHierarchySystem_1.AbstractHierarchySystem {
    update(world, _deltaTime) {
        this.wasDirty.clear();
        const order = this.getProcessingOrder(world, "Transform");
        if (order.length === 0)
            return;
        for (let i = 0; i < order.length; i++) {
            const entity = order[i];
            const transform = world.getComponent(entity, "Transform");
            if (!transform)
                continue;
            let parentDirty = false;
            if (transform.parentEntity !== undefined) {
                parentDirty = this.wasDirty.has(transform.parentEntity);
            }
            const isDirty = !!(transform.dirty || parentDirty);
            if (isDirty) {
                world.mutateComponent(entity, "Transform", mutTransform => {
                    if (mutTransform.parentEntity !== undefined) {
                        const parentTransform = world.getComponent(mutTransform.parentEntity, "Transform");
                        if (!parentTransform) {
                            this.setToLocal(mutTransform);
                        }
                        else {
                            const parentMat = this.getMatrixFromTransform(parentTransform, true);
                            const localMat = this.getMatrixFromTransform(mutTransform, false);
                            const worldMat = this.multiplyMat3(parentMat, localMat);
                            this.applyMatrixToWorldTransform(mutTransform, worldMat);
                        }
                    }
                    else {
                        this.setToLocal(mutTransform);
                    }
                    mutTransform.dirty = false;
                });
                this.wasDirty.add(entity);
            }
        }
    }
    setToLocal(t) {
        t.worldX = t.x;
        t.worldY = t.y;
        t.worldRotation = t.rotation;
        t.worldScaleX = t.scaleX;
        t.worldScaleY = t.scaleY;
    }
    getMatrixFromTransform(t, useWorld) {
        const x = useWorld ? t.worldX : t.x;
        const y = useWorld ? t.worldY : t.y;
        const rot = useWorld ? t.worldRotation : t.rotation;
        const sx = useWorld ? t.worldScaleX : t.scaleX;
        const sy = useWorld ? t.worldScaleY : t.scaleY;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        return [
            cos * sx, -sin * sy, x,
            sin * sx, cos * sy, y
        ];
    }
    multiplyMat3(m1, m2) {
        const [a1, c1, tx1, b1, d1, ty1] = m1;
        const [a2, c2, tx2, b2, d2, ty2] = m2;
        return [
            a1 * a2 + c1 * b2, a1 * c2 + c1 * d2, a1 * tx2 + c1 * ty2 + tx1,
            b1 * a2 + d1 * b2, b1 * c2 + d1 * d2, b1 * tx2 + d1 * ty2 + ty1
        ];
    }
    applyMatrixToWorldTransform(t, m) {
        const [a, c, tx, b, d, ty] = m;
        t.worldX = tx;
        t.worldY = ty;
        t.worldScaleX = Math.sqrt(a * a + b * b);
        t.worldScaleY = Math.sqrt(c * c + d * d);
        t.worldRotation = Math.atan2(b, a);
    }
}
exports.HierarchySystem = HierarchySystem;
