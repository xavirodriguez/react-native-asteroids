import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

export class AnimationSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const entities = world.query("Animator");

    for (const entity of entities) {
      const animator = world.getComponent(entity, "Animator")!;
      if (!animator.current) continue;

      const anim = animator.animations[animator.current];
      if (!anim) continue;

      world.mutateComponent(entity, "Animator", a => {
        a.elapsed += deltaTime;
        
        const frameTime = 1000 / anim.frameRate;
        if (a.elapsed >= frameTime) {
          a.elapsed = 0;
          a.frame++;

          if (a.frame >= anim.frames.length) {
            if (anim.loop) {
              a.frame = 0;
            } else {
              a.frame = anim.frames.length - 1;
              if (anim.onCompleteEvent) {
                world.getEventBus().emitDeferred(anim.onCompleteEvent as any, { entity });
              }
            }
          }
        }
      });
    }
  }
}
