import { System } from "../../ecs/System";
import { World } from "../../ecs/World";

export class DebugSystem extends System<any> {
  public update(_world: World<any>, _deltaTime: number): void {}
  public renderDebug(_ctx: any, _world: World<any>): void {}
}
