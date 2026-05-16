import { World } from "../World";
import { Component } from "../Component";
import { System } from "../System";

describe("World Invariants", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("should throw error when creating an entity during update", () => {
    class BuggySystem extends System {
      update(world: World): void {
        world.createEntity();
      }
    }
    world.addSystem(new BuggySystem());
    expect(() => world.update(16)).toThrow(/Structural mutation "createEntity" during update is forbidden/);
  });

  it("should throw error when removing an entity during update", () => {
    const entity = world.createEntity();
    class BuggySystem extends System {
      update(world: World): void {
        world.removeEntity(entity);
      }
    }
    world.addSystem(new BuggySystem());
    expect(() => world.update(16)).toThrow("Structural mutation \"removeEntity\" during update is forbidden. Use WorldCommandBuffer.");
  });

  it("should throw error when adding a component during update", () => {
    const entity = world.createEntity();
    class BuggySystem extends System {
      update(world: World): void {
        world.addComponent(entity, { type: "Test" } as Component);
      }
    }
    world.addSystem(new BuggySystem());
    expect(() => world.update(16)).toThrow("Structural mutation \"addComponent\" during update is forbidden. Use WorldCommandBuffer.");
  });

  it("should throw error when removing a component during update", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Test" } as Component);
    class BuggySystem extends System {
      update(world: World): void {
        world.removeComponent(entity, "Test");
      }
    }
    world.addSystem(new BuggySystem());
    expect(() => world.update(16)).toThrow("Structural mutation \"removeComponent\" during update is forbidden. Use WorldCommandBuffer.");
  });
});
