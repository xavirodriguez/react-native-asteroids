"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CCDSystem = exports.CollisionSystem2D = void 0;
const System_1 = require("../../ecs/System");
const BroadPhase_1 = require("./BroadPhase");
const NarrowPhase_1 = require("./NarrowPhase");
const Shapes_1 = require("../shapes/Shapes");
class CollisionSystem2D extends System_1.System {
    onCollisionCallbacks = [];
    onTriggerEnterCallbacks = [];
    onTriggerExitCallbacks = [];
    activePairs = new Set();
    onCollision(callback) { this.onCollisionCallbacks.push(callback); }
    onTriggerEnter(callback) { this.onTriggerEnterCallbacks.push(callback); }
    onTriggerExit(callback) { this.onTriggerExitCallbacks.push(callback); }
    update(world, _deltaTime) {
        // Cast to access core components reliably while maintaining generic TRegistry if needed by subclasses
        const w = world;
        const query = w.query("Transform", "Collider");
        const currentFramePairs = new Set();
        const eventQuery = w.query("CollisionEvents");
        for (const entity of eventQuery) {
            w.mutateComponent(entity, "CollisionEvents", (component) => {
                component.collisions.length = 0;
                component.triggersEntered.length = 0;
                component.triggersExited.length = 0;
            });
        }
        const candidates = BroadPhase_1.BroadPhase.sweepAndPrune([...query], w);
        for (const [entityA, entityB] of candidates) {
            const colA = w.getComponent(entityA, "Collider");
            const colB = w.getComponent(entityB, "Collider");
            if (!colA.enabled || !colB.enabled)
                continue;
            if (!this.shouldCollide(colA.layer, colB.mask, colB.layer, colA.mask))
                continue;
            const transA = w.getComponent(entityA, "Transform");
            const transB = w.getComponent(entityB, "Transform");
            const manifold = NarrowPhase_1.NarrowPhase.test(colA.shape, (transA.worldX ?? transA.x) + (colA.offsetX ?? 0), (transA.worldY ?? transA.y) + (colA.offsetY ?? 0), transA.worldRotation ?? transA.rotation, colB.shape, (transB.worldX ?? transB.x) + (colB.offsetX ?? 0), (transB.worldY ?? transB.y) + (colB.offsetY ?? 0), transB.worldRotation ?? transB.rotation);
            if (manifold.colliding) {
                const pairId = this.getPairId(entityA, entityB);
                currentFramePairs.add(pairId);
                if (colA.isTrigger || colB.isTrigger) {
                    if (!this.activePairs.has(pairId)) {
                        this.onTriggerEnterCallbacks.forEach(cb => cb(world, entityA, entityB));
                        this.notifyTriggerEvent(w, entityA, entityB, "enter");
                    }
                }
                else {
                    this.onCollisionCallbacks.forEach(cb => cb(world, entityA, entityB, manifold));
                    this.notifyCollisionEvent(w, entityA, entityB, manifold);
                }
            }
        }
        this.activePairs.forEach(pairId => {
            if (!currentFramePairs.has(pairId)) {
                const [idA, idB] = pairId.split(",").map(Number);
                this.onTriggerExitCallbacks.forEach(cb => cb(world, idA, idB));
                this.notifyTriggerEvent(w, idA, idB, "exit");
            }
        });
        this.activePairs = currentFramePairs;
    }
    shouldCollide(layerA, maskB, layerB, maskA) {
        return (layerA & maskB) !== 0 && (layerB & maskA) !== 0;
    }
    getPairId(a, b) {
        return a < b ? `${a},${b}` : `${b},${a}`;
    }
    notifyCollisionEvent(world, a, b, manifold) {
        this.addCollisionToComponent(world, a, b, manifold, false);
        this.addCollisionToComponent(world, b, a, manifold, true);
    }
    addCollisionToComponent(world, entity, other, manifold, flipNormal) {
        world.mutateComponent(entity, "CollisionEvents", (eComp) => {
            eComp.collisions.push({
                otherEntity: other,
                normalX: flipNormal ? -manifold.normalX : manifold.normalX,
                normalY: flipNormal ? -manifold.normalY : manifold.normalY,
                depth: manifold.depth,
                contactPoints: manifold.contactPoints
            });
        });
    }
    notifyTriggerEvent(world, a, b, phase) {
        this.addTriggerToComponent(world, a, b, phase);
        this.addTriggerToComponent(world, b, a, phase);
    }
    addTriggerToComponent(world, entity, other, phase) {
        world.mutateComponent(entity, "CollisionEvents", (eComp) => {
            if (phase === "enter") {
                eComp.triggersEntered.push(other);
                if (!eComp.activeTriggers.includes(other))
                    eComp.activeTriggers.push(other);
            }
            else {
                eComp.triggersExited.push(other);
                eComp.activeTriggers = eComp.activeTriggers.filter((id) => id !== other);
            }
        });
    }
}
exports.CollisionSystem2D = CollisionSystem2D;
class CCDSystem extends System_1.System {
    update(world, deltaTime) {
        const w = world;
        const query = w.query("Transform", "Velocity", "Collider");
        const collidables = w.query("Transform", "Collider");
        for (const entity of query) {
            const trans = w.getComponent(entity, "Transform");
            const vel = w.getComponent(entity, "Velocity");
            const col = w.getComponent(entity, "Collider");
            if (!col.enabled || (vel.vx === 0 && vel.vy === 0))
                continue;
            const p0x = (trans.worldX ?? trans.x);
            const p0y = (trans.worldY ?? trans.y);
            const p1x = p0x + vel.vx * deltaTime;
            const p1y = p0y + vel.vy * deltaTime;
            for (const other of collidables) {
                if (entity === other)
                    continue;
                const otherCol = w.getComponent(other, "Collider");
                if (!otherCol.enabled || otherCol.isTrigger)
                    continue;
                if (!this.shouldCollide(col.layer, otherCol.mask, otherCol.layer, col.mask))
                    continue;
                const otherTrans = w.getComponent(other, "Transform");
                const ox = (otherTrans.worldX ?? otherTrans.x);
                const oy = (otherTrans.worldY ?? otherTrans.y);
                if (otherCol.shape.type === Shapes_1.ShapeType.Circle) {
                    const radius = otherCol.shape.radius;
                    if (this.rayIntersectsCircle(p0x, p0y, p1x, p1y, ox + (otherCol.offsetX ?? 0), oy + (otherCol.offsetY ?? 0), radius)) {
                        this.notifyCollision(w, entity, other);
                    }
                }
                else if (otherCol.shape.type === Shapes_1.ShapeType.Box) {
                    const { width, height } = otherCol.shape;
                    if (this.rayIntersectsBox(p0x, p0y, p1x, p1y, ox + (otherCol.offsetX ?? 0), oy + (otherCol.offsetY ?? 0), width, height)) {
                        this.notifyCollision(w, entity, other);
                    }
                }
            }
        }
    }
    shouldCollide(layerA, maskB, layerB, maskA) {
        return (layerA & maskB) !== 0 && (layerB & maskA) !== 0;
    }
    rayIntersectsCircle(p0x, p0y, p1x, p1y, cx, cy, radius) {
        const dx = p1x - p0x;
        const dy = p1y - p0y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0)
            return false;
        const t = ((cx - p0x) * dx + (cy - p0y) * dy) / lenSq;
        const clampedT = Math.max(0, Math.min(1, t));
        const closestX = p0x + clampedT * dx;
        const closestY = p0y + clampedT * dy;
        const distSq = (closestX - cx) ** 2 + (closestY - cy) ** 2;
        return distSq <= radius * radius;
    }
    rayIntersectsBox(p0x, p0y, p1x, p1y, bx, by, width, height) {
        const halfW = width / 2;
        const halfH = height / 2;
        const minX = bx - halfW;
        const maxX = bx + halfW;
        const minY = by - halfH;
        const maxY = by + halfH;
        let tmin = -Infinity;
        let tmax = Infinity;
        if (p1x !== p0x) {
            const tx1 = (minX - p0x) / (p1x - p0x);
            const tx2 = (maxX - p0x) / (p1x - p0x);
            tmin = Math.max(tmin, Math.min(tx1, tx2));
            tmax = Math.min(tmax, Math.max(tx1, tx2));
        }
        else if (p0x < minX || p0x > maxX)
            return false;
        if (p1y !== p0y) {
            const ty1 = (minY - p0y) / (p1y - p0y);
            const ty2 = (maxY - p0y) / (p1y - p0y);
            tmin = Math.max(tmin, Math.min(ty1, ty2));
            tmax = Math.min(tmax, Math.max(ty1, ty2));
        }
        else if (p0y < minY || p0y > maxY)
            return false;
        return tmax >= tmin && tmax >= 0 && tmin <= 1;
    }
    notifyCollision(world, entityA, entityB) {
        world.mutateComponent(entityA, "CollisionEvents", (comp) => {
            comp.collisions.push({ otherEntity: entityB, normalX: 0, normalY: 0, depth: 0, contactPoints: [] });
        });
    }
}
exports.CCDSystem = CCDSystem;
