import { World } from "../World";
import { System } from "../System";

describe("World Invariants", () => {
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
    expect(() => world.update(16)).toThrow(/Structural mutation "createEntity" during update is forbidden/);
  });

  it("should throw error when addComponent is called during update", () => {
    const entity = world.createEntity();
    class BuggySystem extends System {
      update(w: World) {
        w.addComponent(entity, { type: "Test" });
      }
    }
    world.addSystem(new BuggySystem());
    expect(() => world.update(16)).toThrow(/Structural mutation "addComponent" during update is forbidden/);
  });

  it("should throw error when removeComponent is called during update", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Test" });
    class BuggySystem extends System {
      update(w: World) {
        w.removeComponent(entity, "Test");
      }
    }
    world.addSystem(new BuggySystem());
    expect(() => world.update(16)).toThrow(/Structural mutation "removeComponent" during update is forbidden/);
  });

  it("should throw error when removeEntity is called during update", () => {
    const entity = world.createEntity();
    class BuggySystem extends System {
      update(w: World) {
        w.removeEntity(entity);
      }
    }
    world.addSystem(new BuggySystem());
    expect(() => world.update(16)).toThrow(/Structural mutation "removeEntity" during update is forbidden/);
  });

  it("should allow structural mutations via command buffer during update", () => {
    class GoodSystem extends System {
      update(w: World) {
        w.getCommandBuffer().createEntity();
      }
    }
    world.addSystem(new GoodSystem());
    expect(() => world.update(16)).not.toThrow();
    // After update, flush is called automatically in world.update()
    expect(world.entities.length).toBe(1);
  });
});
