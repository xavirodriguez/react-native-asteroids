import { World } from "../../core/World";
import { JuiceSystem } from "../JuiceSystem";
import { TransformComponent, VisualOffsetComponent } from "../../types/EngineTypes";

describe("JuiceSystem", () => {
  let world: World;
  let system: JuiceSystem;

  beforeEach(() => {
    world = new World();
    system = new JuiceSystem();
    world.addSystem(system);
  });

  it("should interpolate scaleX over time using VisualOffset", () => {
    const entity = world.createEntity();
    const transform: TransformComponent = {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    };
    world.addComponent(entity, transform);

    JuiceSystem.add(world, entity, {
      property: "scaleX",
      target: 1, // Target offset 1 means final scaleX 1 (original) + 1 (offset) = 2
      duration: 100,
      easing: "linear"
    });

    // Initial state
    system.update(world, 0);
    const offset = world.getComponent<VisualOffsetComponent>(entity, "VisualOffset");
    expect(offset?.scaleX).toBe(0);

    // Half way
    system.update(world, 50);
    expect(offset?.scaleX).toBe(0.5);

    // Complete
    system.update(world, 50);
    expect(offset?.scaleX).toBe(1);

    // Animation should be removed
    const juice = world.getComponent<import("../JuiceSystem").JuiceComponent>(entity, "Juice");
    expect(juice?.animations.length).toBe(0);
  });

  it("should trigger onComplete callback", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });

    const onComplete = jest.fn();
    JuiceSystem.add(world, entity, {
      property: "scaleX",
      target: 2,
      duration: 100,
      onComplete
    });

    system.update(world, 100);
    expect(onComplete).toHaveBeenCalledWith(entity);
  });
});
