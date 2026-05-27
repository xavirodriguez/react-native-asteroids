import { System } from "../../core/System";
import { World } from "../../core/World";
import { PhysicsIntegrateSystem } from "./PhysicsIntegrateSystem";
import { PhysicsSolveSystem } from "./PhysicsSolveSystem";

export { PhysicsIntegrateSystem } from "./PhysicsIntegrateSystem";
export { PhysicsSolveSystem } from "./PhysicsSolveSystem";

/**
 * Built-in 2D Physics System for rigid body dynamics.
 *
 * @remarks
 * Implements rigid body dynamics integration using Semi-Implicit Euler and
 * impulse-based collision response. Designed to provide consistent behavior
 * for simple collision scenarios, though accuracy is subject to the fixed
 * time-step and integration method.
 *
 * @deprecated **Deprecated**: Use {@link PhysicsIntegrateSystem} and {@link PhysicsSolveSystem}
 * instead. Modern architecture requires separating integration from resolution to
 * help ensure correct execution order and determinism in complex simulations.
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
