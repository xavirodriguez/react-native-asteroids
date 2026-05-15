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
    world.flush();

    // Initial state
    system.update(world, 0);
    world.flush();
    
    let offset = world.getComponent<VisualOffsetComponent>(entity, "VisualOffset");
    // VisualOffset is added via CommandBuffer in first update, so we need one more flush/update if we want it immediately
    // or just check after it's been flushed.
    
    if (!offset) {
        system.update(world, 0); // Triggers addComponent via buffer
        world.flush();
        offset = world.getComponent<VisualOffsetComponent>(entity, "VisualOffset");
    }
    
    expect(offset?.scaleX).toBe(0);

    // Half way
    system.update(world, 50);
    world.flush();
    expect(offset?.scaleX).toBe(0.5);

    // Complete
    system.update(world, 50);
    world.flush();
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
    world.flush();

    // Need to run until VisualOffset is added AND animation completes
    system.update(world, 0); // Adds VisualOffset
    world.flush();
    system.update(world, 100); // Completes animation
    world.flush();
    
    expect(onComplete).toHaveBeenCalledWith(entity);
  });
});
