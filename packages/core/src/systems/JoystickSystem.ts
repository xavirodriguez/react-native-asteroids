import { System } from "../ecs/System";
import { World } from "../ecs/World";

export class JoystickSystem extends System<any> {
  public update(world: World<any>, _deltaTime: number): void {
      // Joystick logic
  }
}
