import { System } from "../ecs/System";
import { World } from "../ecs/World";

export class Camera2DSystem extends System<any> {
  public update(world: World<any>, _deltaTime: number): void {
      // Camera logic
  }
}
