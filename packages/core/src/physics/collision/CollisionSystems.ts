import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";

/**
 * Basic 2D Collision System.
 *
 * @remarks
 * Performs broad-phase and narrow-phase collision detection between entities
 * with Transform and Collider components.
 */
export class CollisionSystem2D<TRegistry extends ComponentRegistry = any> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    const collidables = world.query("Transform" as any, "CollisionEvents" as any);
    // Collision detection logic here
    // For now, this is a generic placeholder to be fleshed out with agnosticism
  }

  public onRegister(world: World<TRegistry>): void {}
  public dispose(): void {}
}

/**
 * Continuous Collision Detection System.
 */
export class CCDSystem<TRegistry extends ComponentRegistry = any> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    // CCD logic for fast-moving objects
  }

  public onRegister(world: World<TRegistry>): void {}
  public dispose(): void {}
}
