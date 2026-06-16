import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";

export class CollisionSystem2D<TRegistry extends ComponentRegistry = any> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
  }
  public onRegister(world: World<TRegistry>): void {}
  public dispose(): void {}
}

export class CCDSystem<TRegistry extends ComponentRegistry = any> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
  }
  public onRegister(world: World<TRegistry>): void {}
  public dispose(): void {}
}
