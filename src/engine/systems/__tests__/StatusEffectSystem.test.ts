import { World } from "../../core/World";
import { StatusEffectSystem } from "../StatusEffectSystem";
import { ModifierStackComponent } from "../../core/CoreComponents";

describe("StatusEffectSystem", () => {
  let world: World;
  let system: StatusEffectSystem;

  beforeEach(() => {
    world = new World();
    system = new StatusEffectSystem();
  });

  it("should decrement modifier remaining duration", () => {
    const entity = world.createEntity();
    const stack: ModifierStackComponent = {
      type: "ModifierStack",
      modifiers: [
        { id: "speed_boost", type: "speed", value: 1.5, duration: 1000, remaining: 1000 }
      ]
    };
    world.addComponent(entity, stack);

    system.update(world, 100);

    const updatedStack = world.getComponent<ModifierStackComponent>(entity, "ModifierStack");
    expect(updatedStack?.modifiers[0].remaining).toBe(900);
  });

  it("should remove expired modifiers", () => {
    const entity = world.createEntity();
    const stack: ModifierStackComponent = {
      type: "ModifierStack",
      modifiers: [
        { id: "expired", type: "strength", value: 2, duration: 1000, remaining: 50 }
      ]
    };
    world.addComponent(entity, stack);

    system.update(world, 100);

    const updatedStack = world.getComponent<ModifierStackComponent>(entity, "ModifierStack");
    expect(updatedStack?.modifiers.length).toBe(0);
  });

  it("should handle multiple modifiers independently", () => {
    const entity = world.createEntity();
    const stack: ModifierStackComponent = {
      type: "ModifierStack",
      modifiers: [
        { id: "short", type: "a", value: 1, duration: 100, remaining: 50 },
        { id: "long", type: "b", value: 2, duration: 1000, remaining: 500 }
      ]
    };
    world.addComponent(entity, stack);

    system.update(world, 100);

    const updatedStack = world.getComponent<ModifierStackComponent>(entity, "ModifierStack");
    expect(updatedStack?.modifiers.length).toBe(1);
    expect(updatedStack?.modifiers[0].id).toBe("long");
    expect(updatedStack?.modifiers[0].remaining).toBe(400);
  });
});
