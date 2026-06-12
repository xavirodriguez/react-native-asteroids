import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

export class ScreenShakeSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.isReSimulating) return;

    const entities = world.query("ScreenShake");

    for (const entity of entities) {
      world.mutateComponent(entity, "ScreenShake", shake => {
        shake.remaining -= deltaTime;
        if (shake.remaining <= 0) {
          shake.remaining = 0;
          shake.intensity = 0;
        }
      });
    }
  }
}
