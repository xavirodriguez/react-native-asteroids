import { System } from "../../../ecs/System";
import { World } from "../../../ecs/World";
import { CoreComponentRegistry } from "../../../ecs/CoreComponents";

/** @public */
export class ComboSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    world.query("Combo" as any).forEach((entity) => {
      const combo = world.getComponent(entity, "Combo" as any) as any;
      if (!combo || combo.timerRemaining <= 0) return;

      world.mutateComponent(entity, "Combo" as any, (c: any) => {
        c.timerRemaining -= deltaTime;
        if (c.timerRemaining <= 0) {
          c.combo = 0;
          c.multiplier = 1;
        }
      });
    });
  }

  public dispose(): void {}
}
