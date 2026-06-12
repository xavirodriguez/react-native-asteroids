import { World } from "../ecs/World";
import { Entity } from "../ecs/Entity";

export class Juice {
  public static flash(world: World<any>, entity: Entity, frames: number = 5): void {
    world.mutateComponent(entity, "Render" as any, (render: any) => {
      render.hitFlashFrames = frames;
    });
  }
  public static add(_world: World<any>, _entity: Entity, _anim: any): void {
    // Juice logic
  }
}
