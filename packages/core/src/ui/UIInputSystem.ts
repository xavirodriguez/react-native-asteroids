import { System } from "../ecs/System";
import { World } from "../ecs/World";

export class UIInputSystem extends System<any> {
  public update(_world: World<any>, _deltaTime: number): void {}
}
