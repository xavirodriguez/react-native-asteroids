import { World } from "../World";
import { System } from "../System";
import { Component } from "../../types/EngineTypes";

describe("World ECS Invariants", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("should throw error when createEntity is called during update", () => {
    class BuggySystem extends System {
      update(w: World) {
        w.createEntity();
      }
    }
    world.addSystem(new BuggySystem());
    expect(() => world.update(16)).toThrow("Structural mutation \"createEntity\" during update is forbidden. Use WorldCommandBuffer.");
  });

  it("should throw error when addComponent is called during update", () => {
    const entity = world.createEntity();
    class BuggySystem extends System {
      update(w: World) {
        w.addComponent(entity, { type: "Test" } as Component);
      }
    }
    world.addSystem(new BuggySystem());
    expect(() => world.update(16)).toThrow("Structural mutation \"addComponent\" during update is forbidden. Use WorldCommandBuffer.");
  });

  it("should throw error when removeComponent is called during update", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Test" } as Component);
    class BuggySystem extends System {
      update(w: World) {
        w.removeComponent(entity, "Test");
      }
    }
    world.addSystem(new BuggySystem());
    expect(() => world.update(16)).toThrow("Structural mutation \"removeComponent\" during update is forbidden. Use WorldCommandBuffer.");
  });

  it("should throw error when removeEntity is called during update", () => {
    const entity = world.createEntity();
    class BuggySystem extends System {
      update(w: World) {
        w.removeEntity(entity);
      }
    }
    world.addSystem(new BuggySystem());
    expect(() => world.update(16)).toThrow("Structural mutation \"removeEntity\" during update is forbidden. Use WorldCommandBuffer.");
  });

  it("should allow structural mutations via WorldCommandBuffer during update", () => {
    const entity = world.createEntity();
    class SafeSystem extends System {
      update(w: World) {
        w.getCommandBuffer().createEntity();
        w.getCommandBuffer().addComponent(entity, { type: "Safe" } as Component);
        w.getCommandBuffer().removeComponent(entity, "Test");
        w.getCommandBuffer().removeEntity(entity);
      }
    }
    world.addSystem(new SafeSystem());
    // Should NOT throw
    world.update(16);
  });
});
