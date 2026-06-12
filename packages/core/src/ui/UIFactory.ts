import { World } from "../ecs/World";
import { Entity } from "../ecs/Entity";

export class UIFactory {
  public static createPanel(world: World<any>, _config: any): Entity {
    return world.createEntity();
  }
}
