import { System } from "../ecs/System";
import { World } from "../ecs/World";

export class UnifiedInputSystem extends System<any> {
  public bind(_action: string, _keys: string[]): void {}
  public update(world: World<any>, _deltaTime: number): void {
      // Input logic
  }
}
