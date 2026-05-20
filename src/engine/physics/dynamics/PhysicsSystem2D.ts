import { System } from "../../core/System";
import { World } from "../../core/World";
import { TransformComponent, PhysicsBody2DComponent, CollisionEventsComponent, CollisionEvent } from "../../types/EngineTypes";

/**
 * Built-in 2D Physics System for rigid body dynamics.
 *
 * @responsibility Rigid body dynamics integration using Semi-Implicit Euler.
 * @responsibility Impulse-based collision response satisfying contact and friction constraints.
 * @responsibility Positional correction to mitigate numerical "sinking".
 *
 * @deprecated Use PhysicsIntegrateSystem and PhysicsSolveSystem instead for correct execution order.
 * This class remains for backward compatibility but internally delegates to the new systems.
 *
 * @public
 */
export class PhysicsSystem2D extends System {
  private integrate: PhysicsIntegrateSystem;
  private solve: PhysicsSolveSystem;

  constructor() {
    super();
    this.integrate = new PhysicsIntegrateSystem();
    this.solve = new PhysicsSolveSystem();
  }

  /**
   * Configures global gravity applied to all dynamic bodies.
   *
   * @param x - [px/s^2] Gravity X component.
   * @param y - [px/s^2] Gravity Y component.
   */
  setGravity(x: number, y: number) {
    this.integrate.setGravity(x, y);
  }

  /**
   * Updates the physics simulation for one frame.
   * @param world - The ECS world instance.
   * @param deltaTime - Time elapsed since last update in milliseconds.
   */
  update(world: World, deltaTime: number): void {
    this.integrate.update(world, deltaTime);
    this.solve.update(world, deltaTime);
  }
}

/**
 * System for physical integration (Semi-Implicit Euler).
 *
 * @responsibility Applies forces and gravity to velocity (Semi-Implicit Euler).
 * @responsibility Integrates velocity into position and rotation.
 *
 * Runs in SystemPhase.Simulation.
 * @public
 */
export class PhysicsIntegrateSystem extends System {
  private gravityX = 0;
  private gravityY = 9.81 * 100; // Standard gravity scaled to pixels

  /**
   * Configures global gravity applied to all dynamic bodies.
   *
   * @param x - [px/s^2] Gravity X component.
   * @param y - [px/s^2] Gravity Y component.
   */
  setGravity(x: number, y: number) {
    this.gravityX = x;
    this.gravityY = y;
  }

  /**
   * Updates the physics integration.
   */
  update(world: World, deltaTime: number): void {
    const dt = deltaTime / 1000;
    if (dt <= 0) return;

    const entities = world.query("Transform", "PhysicsBody2D");

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      // 1. Update Velocities (v = v + a * dt)
      world.mutateComponent<PhysicsBody2DComponent>(entity, "PhysicsBody2D", (body) => {
        if (body.bodyType === "static") return;

        // Apply forces (including gravity)
        if (body.bodyType === "dynamic") {
          body.velocityX += (body.forceX * body.inverseMass + this.gravityX * body.gravityScale) * dt;
          body.velocityY += (body.forceY * body.inverseMass + this.gravityY * body.gravityScale) * dt;

          if (!body.fixedRotation) {
            body.angularVelocity += (body.torque * body.inverseInertia) * dt;
          }
        }
      });

      // 2. Update Positions (x = x + v * dt)
      world.mutateComponent<TransformComponent>(entity, "Transform", (transform) => {
        const body = world.getComponent<PhysicsBody2DComponent>(entity, "PhysicsBody2D")!;
        if (body.bodyType === "static") return;

        transform.x += body.velocityX * dt;
        transform.y += body.velocityY * dt;
        transform.rotation += body.angularVelocity * dt;
      });
    }
  }
}

/**
 * System for collision resolution and impulse application.
 *
 * @responsibility Reads fresh CollisionEventsComponent data freshly written by CollisionSystem2D.
 * @responsibility Resolves impulses and positional correction.
 * @responsibility Clears accumulated forces after solving.
 *
 * Runs in SystemPhase.GameRules.
 * @public
 */
export class PhysicsSolveSystem extends System {
  /**
   * Updates the physics solver.
   */
  update(world: World, deltaTime: number): void {
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
        if (!transformB) continue; // Bug 7: Missing null check for transformB

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
   * Resolves a collision between two rigid bodies using impulse-based physics.
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

    // Bug 6: Normalization not guaranteed. Normal points from A to B.
    const normalLen = Math.hypot(collision.normalX, collision.normalY);
    if (normalLen <= 1e-8) return;

    const nx = collision.normalX / normalLen;
    const ny = collision.normalY / normalLen;

    // Bug 4: Derive effective inverse mass and inertia from body type
    const invMassA = bodyA.bodyType === "dynamic" ? bodyA.inverseMass : 0;
    const invMassB = bodyB.bodyType === "dynamic" ? bodyB.inverseMass : 0;

    const invInertiaA =
      bodyA.bodyType === "dynamic" && !bodyA.fixedRotation ? bodyA.inverseInertia : 0;
    const invInertiaB =
      bodyB.bodyType === "dynamic" && !bodyB.fixedRotation ? bodyB.inverseInertia : 0;

    // Bug 3: Total inverse mass guard
    const totalInvMass = invMassA + invMassB;
    if (totalInvMass <= 0) return;

    // Bug 2: Establish a single coordinate source (world space)
    const getWorldPos = (t: TransformComponent) => ({
      x: t.worldX ?? t.x,
      y: t.worldY ?? t.y,
    });

    const posA = getWorldPos(transformA);
    const posB = getWorldPos(transformB);

    // Bug 2: Use world coordinates for fallback contact point
    const contact = (collision.contactPoints && collision.contactPoints[0]) ||
                    { x: (posA.x + posB.x) / 2, y: (posA.y + posB.y) / 2 };

    // Vectors from center of mass to contact point (world space)
    const raX = contact.x - posA.x;
    const raY = contact.y - posA.y;
    const rbX = contact.x - posB.x;
    const rbY = contact.y - posB.y;

    // Relative velocity at contact point
    const vaX = bodyA.velocityX + (-bodyA.angularVelocity * raY);
    const vaY = bodyA.velocityY + (bodyA.angularVelocity * raX);
    const vbX = bodyB.velocityX + (-bodyB.angularVelocity * rbY);
    const vbY = bodyB.velocityY + (bodyB.angularVelocity * rbX);

    const rvx = vbX - vaX;
    const rvy = vbY - vaY;

    // Relative velocity along normal
    const velAlongNormal = rvx * nx + rvy * ny;

    // Do not resolve if velocities are separating
    if (velAlongNormal > 0) return;

    const e = Math.min(bodyA.restitution, bodyB.restitution);

    // Impulse scalar with rotation
    // j = -(1 + e) * v_rel_normal / (1/mA + 1/mB + (rA x n)^2 / IA + (rB x n)^2 / IB)
    const raCrossN = raX * ny - raY * nx;
    const rbCrossN = rbX * ny - rbY * nx;

    let invMassSum = invMassA + invMassB;
    invMassSum += (raCrossN * raCrossN) * invInertiaA;
    invMassSum += (rbCrossN * rbCrossN) * invInertiaB;

    if (invMassSum <= 0) return;

    let j = -(1 + e) * velAlongNormal;
    j /= invMassSum;

    // Apply linear impulse
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

    // Friction impulse
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

    // Coulomb's law: friction impulse <= normal impulse * friction coefficient
    const mu = (bodyA.staticFriction + bodyB.staticFriction) / 2;
    const dynamicMu = (bodyA.dynamicFriction + bodyB.dynamicFriction) / 2;

    // Bug 5: Compute a single frictionJ scalar that is clamped
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

    // Positional correction (to avoid sinking)
    const percent = 0.4;
    const slop = 0.01;
    // Bug 3: Guard for positional correction denominator
    const corrDenominator = invMassA + invMassB;
    if (corrDenominator <= 0) return;

    const correctionMagnitude = Math.max(collision.depth - slop, 0) / corrDenominator * percent;
    const corrX = correctionMagnitude * nx;
    const corrY = correctionMagnitude * ny;

    // Bug 2: Positional correction writes to worldX / worldY when they exist, otherwise fall back to x / y
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
