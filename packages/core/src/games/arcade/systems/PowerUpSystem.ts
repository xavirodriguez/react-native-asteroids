import { System } from "../../../ecs/System";
import { World } from "../../../ecs/World";
import { CoreComponentRegistry } from "../../../ecs/CoreComponents";
import { PowerUpComponent } from "../types/ArcadeTypes";

/** @public */
export class PowerUpSystem extends System<CoreComponentRegistry & { PowerUp: PowerUpComponent }> {
  public update(world: World<CoreComponentRegistry & { PowerUp: PowerUpComponent }>, deltaTime: number): void {
      // PowerUp logic
  }
}
