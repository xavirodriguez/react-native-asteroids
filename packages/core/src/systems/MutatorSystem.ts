import { System } from "../ecs/System";
import { World } from "../ecs/World";

export class MutatorSystem extends System<any> {
  constructor(mutators?: any[]) {
      super();
  }
  public update(world: World<any>, _deltaTime: number): void {
  }
  public onRegister(world: World<any>): void {}
  public dispose(): void {}
}
