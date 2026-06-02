import { System } from "../../core/System";
import { World } from "../../core/World";
import { TransformComponent, PhysicsBody2DComponent, CollisionEventsComponent, CollisionEvent } from "../../types/EngineTypes";

/**
 * System for collision resolution and impulse application.
 *
 * @remarks
 * Designed to resolve impulses and positional corrections based on
 * data from {@link CollisionEventsComponent}. It also handles the resetting
 * of force accumulators at the end of the physics step.
 *
 * Runs in `SystemPhase.GameRules`.
 *
 * @public
 */
export class PhysicsSolveSystem extends System {
  /**
   * Updates the physics solver.
   */
  update(world: World, _deltaTime: number): void {
    const eventEntities = world.query("CollisionEvents", "PhysicsBody2D");
    const processedPairs = new Set<string>();

    for (let i = 0; i < eventEntities.length; i++) {
      const entityA = eventEntities[i];
      const events = world.getComponent<CollisionEventsComponent>(entityA, "CollisionEvents")!;

      for (let j = 0; j < events.collisions.length; j++) {
        const collision = events.collisions[j];
        const entityB = collision.otherEntity;

        const bodyA = world.getComponent<PhysicsBody2DComponent>(entityA, "PhysicsBody2D")!;
        const bodyB = world.getComponent<PhysicsBody2DComponent>(entityB, "PhysicsBody2D");
        if (!bodyB) continue;

        const transformA = world.getComponent<TransformComponent>(entityA, "Transform")!;
        const transformB = world.getComponent<TransformComponent>(entityB, "Transform");
        if (!transformB) continue;

        // Ensure each pair is only processed once
        const pairId = entityA < entityB ? `${entityA},${entityB}` : `${entityB},${entityA}`;
        if (processedPairs.has(pairId)) continue;
        processedPairs.add(pairId);

        this.resolveCollision(world, entityA, transformA, bodyA, entityB, transformB, bodyB, collision);
      }
    }

    // Reset forces after solving
    const allBodies = world.query("PhysicsBody2D");
    for (let i = 0; i < allBodies.length; i++) {
      world.mutateComponent<PhysicsBody2DComponent>(allBodies[i], "PhysicsBody2D", (body) => {
        body.forceX = 0;
        body.forceY = 0;
        body.torque = 0;
      });
    }
  }

  /**
   * Resolves a collision between two rigid bodies using an impulse-based model.
   *
   * @remarks
   * This method applies linear and angular impulses to satisfy conservation of
   * momentum and restitution. It also performs positional correction to help
   * reduce shape overlapping (sinking).
   */
  private resolveCollision(
    world: World,
    entityA: number,
    transformA: TransformComponent,
    bodyA: PhysicsBody2DComponent,
    entityB: number,
    transformB: TransformComponent,
    bodyB: PhysicsBody2DComponent,
    collision: CollisionEvent
  ): void {
    if (collision.normalX === undefined || collision.normalY === undefined || collision.depth === undefined) return;

    const normalLen = Math.hypot(collision.normalX, collision.normalY);
    if (normalLen <= 1e-8) return;

    const nx = collision.normalX / normalLen;
    const ny = collision.normalY / normalLen;

    const invMassA = bodyA.bodyType === "dynamic" ? bodyA.inverseMass : 0;
    const invMassB = bodyB.bodyType === "dynamic" ? bodyB.inverseMass : 0;

    const invInertiaA =
      bodyA.bodyType === "dynamic" && !bodyA.fixedRotation ? bodyA.inverseInertia : 0;
    const invInertiaB =
      bodyB.bodyType === "dynamic" && !bodyB.fixedRotation ? bodyB.inverseInertia : 0;

    const totalInvMass = invMassA + invMassB;
    if (totalInvMass <= 0) return;

    const getWorldPos = (t: TransformComponent) => ({
      x: t.worldX ?? t.x,
      y: t.worldY ?? t.y,
    });

    const posA = getWorldPos(transformA);
    const posB = getWorldPos(transformB);

    const contact = (collision.contactPoints && collision.contactPoints[0]) ||
                    { x: (posA.x + posB.x) / 2, y: (posA.y + posB.y) / 2 };

    const raX = contact.x - posA.x;
    const raY = contact.y - posA.y;
    const rbX = contact.x - posB.x;
    const rbY = contact.y - posB.y;

    const vaX = bodyA.velocityX + (-bodyA.angularVelocity * raY);
    const vaY = bodyA.velocityY + (bodyA.angularVelocity * raX);
    const vbX = bodyB.velocityX + (-bodyB.angularVelocity * rbY);
    const vbY = bodyB.velocityY + (bodyB.angularVelocity * rbX);

    const rvx = vbX - vaX;
    const rvy = vbY - vaY;

    const velAlongNormal = rvx * nx + rvy * ny;

    if (velAlongNormal > 0) return;

    const e = Math.min(bodyA.restitution, bodyB.restitution);

    const raCrossN = raX * ny - raY * nx;
    const rbCrossN = rbX * ny - rbY * nx;

    let invMassSum = invMassA + invMassB;
    invMassSum += (raCrossN * raCrossN) * invInertiaA;
    invMassSum += (rbCrossN * rbCrossN) * invInertiaB;

    if (invMassSum <= 0) return;

    let j = -(1 + e) * velAlongNormal;
    j /= invMassSum;

    const impulseX = j * nx;
    const impulseY = j * ny;

    if (bodyA.bodyType === "dynamic") {
      world.mutateComponent<PhysicsBody2DComponent>(entityA, "PhysicsBody2D", (b) => {
        b.velocityX -= invMassA * impulseX;
        b.velocityY -= invMassA * impulseY;
        if (!b.fixedRotation) {
          b.angularVelocity -= raCrossN * invInertiaA * j;
        }
      });
    }

    if (bodyB.bodyType === "dynamic") {
      world.mutateComponent<PhysicsBody2DComponent>(entityB, "PhysicsBody2D", (b) => {
        b.velocityX += invMassB * impulseX;
        b.velocityY += invMassB * impulseY;
        if (!b.fixedRotation) {
          b.angularVelocity += rbCrossN * invInertiaB * j;
        }
      });
    }

    const tx = -ny; // Tangent
    const ty = nx;
    const velAlongTangent = rvx * tx + rvy * ty;

    const raCrossT = raX * ty - raY * tx;
    const rbCrossT = rbX * ty - rbY * tx;

    let invMassSumT = invMassA + invMassB;
    invMassSumT += (raCrossT * raCrossT) * invInertiaA;
    invMassSumT += (rbCrossT * rbCrossT) * invInertiaB;

    let jt = -velAlongTangent;
    if (invMassSumT > 0) jt /= invMassSumT;
    else jt = 0;

    const mu = (bodyA.staticFriction + bodyB.staticFriction) / 2;
    const dynamicMu = (bodyA.dynamicFriction + bodyB.dynamicFriction) / 2;

    let frictionJ: number;
    if (Math.abs(jt) <= j * mu) {
      frictionJ = jt;
    } else {
      frictionJ = Math.sign(jt) * j * dynamicMu;
    }

    const frictionImpulseX = frictionJ * tx;
    const frictionImpulseY = frictionJ * ty;

    if (bodyA.bodyType === "dynamic") {
      world.mutateComponent<PhysicsBody2DComponent>(entityA, "PhysicsBody2D", (b) => {
        b.velocityX -= invMassA * frictionImpulseX;
        b.velocityY -= invMassA * frictionImpulseY;
        if (!b.fixedRotation) b.angularVelocity -= raCrossT * invInertiaA * frictionJ;
      });
    }

    if (bodyB.bodyType === "dynamic") {
      world.mutateComponent<PhysicsBody2DComponent>(entityB, "PhysicsBody2D", (b) => {
        b.velocityX += invMassB * frictionImpulseX;
        b.velocityY += invMassB * frictionImpulseY;
        if (!b.fixedRotation) b.angularVelocity += rbCrossT * invInertiaB * frictionJ;
      });
    }

    const percent = 0.4;
    const slop = 0.01;
    const corrDenominator = invMassA + invMassB;
    if (corrDenominator <= 0) return;

    const correctionMagnitude = Math.max(collision.depth - slop, 0) / corrDenominator * percent;
    const corrX = correctionMagnitude * nx;
    const corrY = correctionMagnitude * ny;

    if (bodyA.bodyType === "dynamic") {
      world.mutateComponent<TransformComponent>(entityA, "Transform", (t) => {
        if (t.worldX !== undefined) t.worldX -= invMassA * corrX;
        else t.x -= invMassA * corrX;
        if (t.worldY !== undefined) t.worldY -= invMassA * corrY;
        else t.y -= invMassA * corrY;
      });
    }
    if (bodyB.bodyType === "dynamic") {
      world.mutateComponent<TransformComponent>(entityB, "Transform", (t) => {
        if (t.worldX !== undefined) t.worldX += invMassB * corrX;
        else t.x += invMassB * corrX;
        if (t.worldY !== undefined) t.worldY += invMassB * corrY;
        else t.y += invMassB * corrY;
      });
    }
  }
}
