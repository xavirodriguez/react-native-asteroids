import { System } from "../../ecs/System";
import { World } from "../../ecs/World";

export class DebugSystem extends System<any> {
  public update(_world: World<any>, _deltaTime: number): void {}
  public renderDebug(_ctx: CanvasRenderingContext2D, _world: World<any>): void {}
}
