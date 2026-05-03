import { System } from "../../core/System";
import { World } from "../../core/World";
import { TransformComponent, PhysicsBody2DComponent, CollisionEventsComponent, CollisionEvent } from "../../types/EngineTypes";

/**
 * Built-in 2D Physics System for rigid body dynamics.
 *
 * @responsibility Rigid body dynamics integration designed around linear Euler and impulse-based collision response.
 *
 * @remarks
 * This system manages rigid body dynamics. It uses semi-implicit linear Euler integration,
 * which is efficient but may exhibit "tunneling" at high speeds relative to the frame rate.
 * Using CCD (Continuous Collision Detection) in the {@link CollisionSystem2D} is recommended
 * to mitigate tunneling for fast-moving entities.
 *
 * @conceptualRisk [FPS_DEPENDENCE] Uses linear Euler integration which can lead to tunneling at high speeds or low framerates.
 * @conceptualRisk [STABILITY] Sequential impulse solver may jitter in complex resting contacts or deep stacks.
 *
 * @mutates {@link PhysicsBody2DComponent} - Updates velocities, resets accumulated forces/torque.
 * @mutates {@link TransformComponent} - Updates world positions and rotations.
 *
 * @executionOrder Simulation phase; se espera que se ejecute después de {@link CollisionSystem2D} y antes de {@link HierarchySystem}.
 */
export class PhysicsSystem2D extends System {
  private gravityX = 0;
  private gravityY = 9.81 * 100; // Standard gravity scaled to pixels

  setGravity(x: number, y: number) {
    this.gravityX = x;
    this.gravityY = y;
  }

  /**
   * Updates the physics simulation for one frame.
   *
   * @param world - The ECS world instance.
   * @param deltaTime - Time elapsed since last update in milliseconds.
   *
   * @precondition El world debería estar en un estado consistente.
   *
   * @remarks
   * At the end of each entity update, it attempts to reset the accumulated forces
   * and torque for the next tick.
   */
  update(world: World, deltaTime: number): void {
    const dt = deltaTime / 1000;
    if (dt <= 0) return;

    const entities = world.query("Transform", "PhysicsBody2D");

    // 1. Integration phase
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const body = world.getComponent<PhysicsBody2DComponent>(entity, "PhysicsBody2D")!;
      if (body.bodyType === "static") continue;

      const transform = world.getComponent<TransformComponent>(entity, "Transform")!;

      // Apply forces (including gravity)
      if (body.bodyType === "dynamic") {
        body.velocityX += (body.forceX * body.inverseMass + this.gravityX * body.gravityScale) * dt;
        body.velocityY += (body.forceY * body.inverseMass + this.gravityY * body.gravityScale) * dt;

        if (!body.fixedRotation) {
            body.angularVelocity += (body.torque * body.inverseInertia) * dt;
        }
      }

      // Update positions
      transform.x += body.velocityX * dt;
      transform.y += body.velocityY * dt;
      transform.rotation += body.angularVelocity * dt;

      // Reset forces
      body.forceX = 0;
      body.forceY = 0;
      body.torque = 0;
    }

    // 2. Collision Response phase
    const eventEntities = world.query("CollisionEvents", "PhysicsBody2D");
    const processedPairs = new Set<string>();

    for (let i = 0; i < eventEntities.length; i++) {
      const entityA = eventEntities[i];
      const bodyA = world.getComponent<PhysicsBody2DComponent>(entityA, "PhysicsBody2D")!;
      const events = world.getComponent<CollisionEventsComponent>(entityA, "CollisionEvents")!;
      const transformA = world.getComponent<TransformComponent>(entityA, "Transform")!;

      for (let j = 0; j < events.collisions.length; j++) {
        const collision = events.collisions[j];
        const entityB = collision.otherEntity;
        const bodyB = world.getComponent<PhysicsBody2DComponent>(entityB, "PhysicsBody2D");
        if (!bodyB) continue;

        // Ensure each pair is only processed once
        const pairId = entityA < entityB ? `${entityA},${entityB}` : `${entityB},${entityA}`;
        if (processedPairs.has(pairId)) continue;
        processedPairs.add(pairId);

        const transformB = world.getComponent<TransformComponent>(entityB, "Transform")!;
        this.resolveCollision(transformA, bodyA, transformB, bodyB, collision);
      }
    }
  }

  /**
   * Resolves a collision between two rigid bodies using impulse-based physics.
   *
   * @remarks
   * ### Impulse Resolution Physics (Sequential Impulses)
   * Implements a simplified version of the sequential impulse algorithm to satisfy contact
   * and friction constraints:
   *
   * 1. **Relative Velocity**: Calculates velocity at the contact point considering both
   *    linear and angular components: `Vp = Vcm + ω × r`.
   * 2. **Normal Impulse Magnitude**: Based on **Newton's Law of Restitution**.
   *    Formula: `j = -(1 + e) * v_rel_normal / K`
   *    Where `K` is the effective mass at the contact point: `1/mA + 1/mB + (rA × n)²/IA + (rB × n)²/IB`.
   * 3. **Friction Impulse**: Applied on the tangent axis based on the **Coulomb Friction Model**.
   *    The tangent impulse `jt` is calculated and clamped by `j * μ` (the friction cone).
   * 4. **Positional Correction (Baumgarte)**: Applies a small linear displacement to resolve
   *    overlap ("sinking") caused by numerical integration drift.
   *
   * @param transformA - Transform of first entity.
   * @param bodyA - Physics body of first entity.
   * @param transformB - Transform of second entity.
   * @param bodyB - Physics body of second entity.
   * @param collision - Collision manifold data (normal, depth, contact points).
   */
  private resolveCollision(
    transformA: TransformComponent,
    bodyA: PhysicsBody2DComponent,
    transformB: TransformComponent,
    bodyB: PhysicsBody2DComponent,
    collision: CollisionEvent
  ): void {
    if (collision.normalX === undefined || collision.normalY === undefined || collision.depth === undefined) return;

    // Normal points from A to B
    const nx = collision.normalX;
    const ny = collision.normalY;

    // We take the first contact point for simplicity in this implementation
    const contact = (collision.contactPoints && collision.contactPoints[0]) || { x: (transformA.x + transformB.x) / 2, y: (transformA.y + transformB.y) / 2 };

    // Vectors from center of mass to contact point
    const raX = contact.x - (transformA.worldX ?? transformA.x);
    const raY = contact.y - (transformA.worldY ?? transformA.y);
    const rbX = contact.x - (transformB.worldX ?? transformB.x);
    const rbY = contact.y - (transformB.worldY ?? transformB.y);

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

    let invMassSum = bodyA.inverseMass + bodyB.inverseMass;
    if (!bodyA.fixedRotation) invMassSum += (raCrossN * raCrossN) * bodyA.inverseInertia;
    if (!bodyB.fixedRotation) invMassSum += (rbCrossN * rbCrossN) * bodyB.inverseInertia;

    let j = -(1 + e) * velAlongNormal;
    j /= invMassSum;

    // Apply linear impulse
    const impulseX = j * nx;
    const impulseY = j * ny;

    if (bodyA.bodyType === "dynamic") {
      bodyA.velocityX -= bodyA.inverseMass * impulseX;
      bodyA.velocityY -= bodyA.inverseMass * impulseY;
      if (!bodyA.fixedRotation) {
          bodyA.angularVelocity -= raCrossN * bodyA.inverseInertia * j;
      }
    }

    if (bodyB.bodyType === "dynamic") {
      bodyB.velocityX += bodyB.inverseMass * impulseX;
      bodyB.velocityY += bodyB.inverseMass * impulseY;
      if (!bodyB.fixedRotation) {
          bodyB.angularVelocity += rbCrossN * bodyB.inverseInertia * j;
      }
    }

    // Friction impulse
    const tx = -ny; // Tangent (approximate for 2D)
    const ty = nx;
    const velAlongTangent = rvx * tx + rvy * ty;

    const raCrossT = raX * ty - raY * tx;
    const rbCrossT = rbX * ty - rbY * tx;

    let invMassSumT = bodyA.inverseMass + bodyB.inverseMass;
    if (!bodyA.fixedRotation) invMassSumT += (raCrossT * raCrossT) * bodyA.inverseInertia;
    if (!bodyB.fixedRotation) invMassSumT += (rbCrossT * rbCrossT) * bodyB.inverseInertia;

    let jt = -velAlongTangent;
    jt /= invMassSumT;

    // Coulomb's law: friction impulse <= normal impulse * friction coefficient
    const mu = (bodyA.staticFriction + bodyB.staticFriction) / 2;
    const dynamicMu = (bodyA.dynamicFriction + bodyB.dynamicFriction) / 2;

    let frictionImpulseX, frictionImpulseY;
    if (Math.abs(jt) < j * mu) {
        frictionImpulseX = jt * tx;
        frictionImpulseY = jt * ty;
    } else {
        frictionImpulseX = -j * tx * dynamicMu;
        frictionImpulseY = -j * ty * dynamicMu;
    }

    if (bodyA.bodyType === "dynamic") {
        bodyA.velocityX -= bodyA.inverseMass * frictionImpulseX;
        bodyA.velocityY -= bodyA.inverseMass * frictionImpulseY;
        if (!bodyA.fixedRotation) bodyA.angularVelocity -= raCrossT * bodyA.inverseInertia * jt;
    }
    if (bodyB.bodyType === "dynamic") {
        bodyB.velocityX += bodyB.inverseMass * frictionImpulseX;
        bodyB.velocityY += bodyB.inverseMass * frictionImpulseY;
        if (!bodyB.fixedRotation) bodyB.angularVelocity += rbCrossT * bodyB.inverseInertia * jt;
    }

    // Positional correction (to avoid sinking)
    const percent = 0.4;
    const slop = 0.01;
    const correctionMagnitude = Math.max(collision.depth - slop, 0) / (bodyA.inverseMass + bodyB.inverseMass) * percent;
    const corrX = correctionMagnitude * nx;
    const corrY = correctionMagnitude * ny;

    if (bodyA.bodyType === "dynamic") {
      transformA.x -= bodyA.inverseMass * corrX;
      transformA.y -= bodyA.inverseMass * corrY;
    }
    if (bodyB.bodyType === "dynamic") {
      transformB.x += bodyB.inverseMass * corrX;
      transformB.y += bodyB.inverseMass * corrY;
    }
  }
}
