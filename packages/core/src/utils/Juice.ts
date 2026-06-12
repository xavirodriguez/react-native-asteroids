import { World } from "../ecs/World";
import { Entity } from "../ecs/Entity";
import { JuiceSystem } from "../systems/JuiceSystem";

export class Juice {
  public static flash(world: World<any>, entity: Entity, frames: number = 5): void {
    world.mutateComponent(entity, "Render" as any, (render: any) => {
      render.hitFlashFrames = frames;
    });
  }
  public static add(world: World<any>, entity: Entity, anim: any): void {
    JuiceSystem.add(world, entity, anim);
  }
}
