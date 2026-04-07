import { World } from "../../core/World";
import { AnimationSystem } from "../AnimationSystem";
import { AnimatorComponent, Entity } from "../../types/EngineTypes";

describe("AnimationSystem", () => {
  let world: World;
  let system: AnimationSystem;

  beforeEach(() => {
    world = new World();
    system = new AnimationSystem();
  });

  it("should advance frames based on fps", () => {
    const entity = world.createEntity();
    const animator: AnimatorComponent = {
      type: "Animator",
      animations: {
        idle: { frames: [0, 1, 2], fps: 10, loop: true },
      },
      current: "idle",
      frame: 0,
      elapsed: 0,
    };
    world.addComponent(entity, animator);

    // Update with 100ms (exactly one frame duration for 10fps)
    system.update(world, 105);

    const updated = world.getComponent<AnimatorComponent>(entity, "Animator")!;
    expect(updated.frame).toBe(1);
    expect(updated.elapsed).toBeCloseTo(5);
  });

  it("should loop animations", () => {
    const entity = world.createEntity();
    const animator: AnimatorComponent = {
      type: "Animator",
      animations: {
        idle: { frames: [0, 1], fps: 10, loop: true },
      },
      current: "idle",
      frame: 1,
      elapsed: 0,
    };
    world.addComponent(entity, animator);

    system.update(world, 100);

    const updated = world.getComponent<AnimatorComponent>(entity, "Animator")!;
    expect(updated.frame).toBe(0);
  });

  it("should stop at last frame and call onComplete for non-looping animations", () => {
    const onComplete = jest.fn();
    const entity = world.createEntity();
    const animator: AnimatorComponent = {
      type: "Animator",
      animations: {
        attack: { frames: [0, 1], fps: 10, loop: false, onComplete },
      },
      current: "attack",
      frame: 1,
      elapsed: 0,
    };
    world.addComponent(entity, animator);

    system.update(world, 100);

    const updated = world.getComponent<AnimatorComponent>(entity, "Animator")!;
    expect(updated.frame).toBe(1);
    expect(onComplete).toHaveBeenCalledWith(entity);
  });
});
