import { System } from "../ecs/System";
import { World } from "../ecs/World";

export abstract class BaseGameStateSystem<TState, TInput, TComponents, TEvents> extends System<any> {
  public abstract update(world: World<any>, deltaTime: number): void;
}
