import { System, World, CoreComponentRegistry } from "@tiny-aster/core";
import { PowerUpComponent } from "../types/ArcadeTypes";

export class PowerUpSystem extends System<CoreComponentRegistry & { PowerUp: PowerUpComponent }> {
  public update(world: World<CoreComponentRegistry & { PowerUp: PowerUpComponent }>, deltaTime: number): void {
      // PowerUp logic
  }
}
