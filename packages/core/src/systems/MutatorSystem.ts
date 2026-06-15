import { System } from "../ecs/System";
import { World } from "../ecs/World";

export class MutatorSystem extends System<any> {
  public update(world: World<any>, _deltaTime: number): void {
      // Mutator logic
  }
}
