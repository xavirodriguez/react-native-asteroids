import { System } from "../../core/System";
import { World } from "../../core/World";
import { Entity, TransformComponent, PhysicsBody2DComponent, CollisionEventsComponent, CollisionEvent } from "../../types/EngineTypes";

/**
 * Built-in 2D Physics System for rigid body dynamics.
 *
 * @responsibility Rigid body dynamics integration using Semi-Implicit Euler.
 * @responsibility Impulse-based collision response satisfying contact and friction constraints.
 * @responsibility Positional correction to mitigate numerical "sinking".
 *
 * ### Integration Model: Semi-Implicit Euler
 * This system uses a **Semi-Implicit Euler** integrator (also known as Symplectic Euler).
 * Unlike Forward Euler, it calculates velocity for the next step first, then uses that
 * new velocity to update the position:
 * 1. `v(t + dt) = v(t) + a(t) * dt`
 * 2. `x(t + dt) = x(t) + v(t + dt) * dt`
 *
 * This provides significantly better energy conservation and stability for oscillating
 * systems (like springs) and orbital mechanics compared to standard Euler.
 *
 * ### World Coordinates vs Local Coordinates
 * While `TransformComponent` stores local `x/y`, this system and the collision detection
 * pipeline rely on `worldX/worldY` calculated by the {@link HierarchySystem}.
 * In the absence of a hierarchy, local coordinates are used as world coordinates.
 *
 * @remarks
 * This system manages rigid body dynamics. It uses semi-implicit linear Euler integration,
 * which is efficient but may exhibit "tunneling" at high speeds relative to the frame rate.
 * Using CCD (Continuous Collision Detection) in the {@link CollisionSystem2D} is recommended
 * to mitigate tunneling for fast-moving entities.
 *
 * ### Execution Order:
 * Typically runs in the `Simulation` phase. Expected to execute AFTER {@link CollisionSystem2D}
 * has populated {@link CollisionEventsComponent}, and BEFORE {@link HierarchySystem}
 * propagates transforms.
 *
 * @conceptualRisk [FPS_DEPENDENCE] Uses linear Euler integration which can lead to tunneling at high speeds or low framerates.
 * @conceptualRisk [STABILITY] Sequential impulse solver may jitter in complex resting contacts or deep stacks.
 *
 * @public
 */
export class PhysicsSystem2D extends System {
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
   * Updates the physics simulation for one frame.
   *
   * @param world - The ECS world instance.
   * @param deltaTime - Time elapsed since last update in milliseconds.
   *
   * @remarks
   * 1. **Integration**: Applies forces (gravity, manual forces) and updates velocity/position.
   * 2. **Collision Response**: Iterates over entities with {@link CollisionEventsComponent}
   *    and applies impulses to resolve contacts.
   * 3. **Cleanup**: Resets accumulated forces and torque for the next tick.
   *
   * @precondition The world should be in a consistent state.
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

      // Apply forces (including gravity) and reset
      world.mutateComponent<PhysicsBody2DComponent>(entity, "PhysicsBody2D", (b) => {
        if (b.bodyType === "dynamic") {
          b.velocityX += (b.forceX * b.inverseMass + this.gravityX * b.gravityScale) * dt;
          b.velocityY += (b.forceY * b.inverseMass + this.gravityY * b.gravityScale) * dt;

          if (!b.fixedRotation) {
            b.angularVelocity += (b.torque * b.inverseInertia) * dt;
          }
        }
        b.forceX = 0;
        b.forceY = 0;
        b.torque = 0;
      });

      // Update positions
      world.mutateComponent<TransformComponent>(entity, "Transform", (t) => {
        t.x += body.velocityX * dt;
        t.y += body.velocityY * dt;
        t.rotation += body.angularVelocity * dt;
      });
    }

    // 2. Collision Response phase
    const eventEntities = world.query("CollisionEvents", "PhysicsBody2D");
    const processedPairs = new Set<string>();

    for (let i = 0; i < eventEntities.length; i++) {
      const entityA = eventEntities[i];
      const events = world.getComponent<CollisionEventsComponent>(entityA, "CollisionEvents")!;

      for (let j = 0; j < events.collisions.length; j++) {
        const collision = events.collisions[j];
        const entityB = collision.otherEntity;
        if (!world.hasComponent(entityB, "PhysicsBody2D")) continue;

        // Ensure each pair is only processed once
        const pairId = entityA < entityB ? `${entityA},${entityB}` : `${entityB},${entityA}`;
        if (processedPairs.has(pairId)) continue;
        processedPairs.add(pairId);

        this.resolveCollision(world, entityA, entityB, collision);
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
    world: World,
    entityA: Entity,
    entityB: Entity,
    collision: CollisionEvent
  ): void {
    if (collision.normalX === undefined || collision.normalY === undefined || collision.depth === undefined) return;

    const transformA = world.getComponent<TransformComponent>(entityA, "Transform")!;
    const bodyA = world.getComponent<PhysicsBody2DComponent>(entityA, "PhysicsBody2D")!;
    const transformB = world.getComponent<TransformComponent>(entityB, "Transform")!;
    const bodyB = world.getComponent<PhysicsBody2DComponent>(entityB, "PhysicsBody2D")!;

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

    let frictionImpulseX: number, frictionImpulseY: number;
    if (Math.abs(jt) < j * mu) {
        frictionImpulseX = jt * tx;
        frictionImpulseY = jt * ty;
    } else {
        frictionImpulseX = -j * tx * dynamicMu;
        frictionImpulseY = -j * ty * dynamicMu;
    }

    if (bodyA.bodyType === "dynamic") {
      world.mutateComponent<PhysicsBody2DComponent>(entityA, "PhysicsBody2D", (b) => {
        b.velocityX -= b.inverseMass * impulseX;
        b.velocityY -= b.inverseMass * impulseY;
        if (!b.fixedRotation) b.angularVelocity -= raCrossN * b.inverseInertia * j;

        b.velocityX -= b.inverseMass * frictionImpulseX;
        b.velocityY -= b.inverseMass * frictionImpulseY;
        if (!b.fixedRotation) b.angularVelocity -= raCrossT * b.inverseInertia * jt;
      });
    }

    if (bodyB.bodyType === "dynamic") {
      world.mutateComponent<PhysicsBody2DComponent>(entityB, "PhysicsBody2D", (b) => {
        b.velocityX += b.inverseMass * impulseX;
        b.velocityY += b.inverseMass * impulseY;
        if (!b.fixedRotation) b.angularVelocity += rbCrossN * b.inverseInertia * j;

        b.velocityX += b.inverseMass * frictionImpulseX;
        b.velocityY += b.inverseMass * frictionImpulseY;
        if (!b.fixedRotation) b.angularVelocity += rbCrossT * b.inverseInertia * jt;
      });
    }

    // Positional correction (to avoid sinking)
    const percent = 0.4;
    const slop = 0.01;
    const correctionMagnitude = Math.max(collision.depth - slop, 0) / (bodyA.inverseMass + bodyB.inverseMass) * percent;
    const corrX = correctionMagnitude * nx;
    const corrY = correctionMagnitude * ny;

    if (bodyA.bodyType === "dynamic") {
      world.mutateComponent<TransformComponent>(entityA, "Transform", (t) => {
        t.x -= bodyA.inverseMass * corrX;
        t.y -= bodyA.inverseMass * corrY;
      });
    }
    if (bodyB.bodyType === "dynamic") {
      world.mutateComponent<TransformComponent>(entityB, "Transform", (t) => {
        t.x += bodyB.inverseMass * corrX;
        t.y += bodyB.inverseMass * corrY;
      });
    }
  }
}
