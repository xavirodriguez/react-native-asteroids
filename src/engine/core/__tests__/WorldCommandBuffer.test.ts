import { World } from "../World";
import { System } from "../System";
import { Component } from "../../types/EngineTypes";

class MutationSystem extends System {
  public update(world: World): void {
    const e = world.createEntity();
    world.addComponent(e, { type: "TestComponent" } as Component);

    // During update, these should not be visible yet
    const entities = world.query("TestComponent");
    if (entities.length > 0) {
      throw new Error("Deferred entities visible during update");
    }
  }
}

class RemovalSystem extends System {
  public update(world: World): void {
    const entities = world.query("ExistingComponent");
    if (entities.length > 0) {
      world.removeEntity(entities[0]);
      // Should still be visible during this same update
      if (world.query("ExistingComponent").length === 0) {
         throw new Error("Entity removed prematurely during update");
      }
    }
  }
}

describe("WorldCommandBuffer", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("should defer entity creation until after update", () => {
    world.addSystem(new MutationSystem());
    world.update(16);

    const entities = world.query("TestComponent");
    expect(entities.length).toBe(1);
  });

  it("should defer entity removal until after update", () => {
    const e = world.createEntity();
    world.addComponent(e, { type: "ExistingComponent" } as Component);
    // Force sync apply
    world.flush();

    world.addSystem(new RemovalSystem());
    world.update(16);

    expect(world.query("ExistingComponent").length).toBe(0);
  });

  it("should handle multiple nested or sequential commands correctly", () => {
    const e1 = world.createEntity();
    world.addComponent(e1, { type: "A" } as Component);

    class ComplexSystem extends System {
      public update(world: World): void {
        const e2 = world.createEntity();
        world.addComponent(e2, { type: "B" } as Component);

        // Immediate check during update
        if (world.hasComponent(e2, "B")) {
          throw new Error("Component B should not be present yet");
        }
      }
    }

    world.addSystem(new ComplexSystem());

    expect(world.hasComponent(e1, "A")).toBe(true);

    world.update(16);

    // After update, it should be present
    const entitiesB = world.query("B");
    expect(entitiesB.length).toBe(1);
  });
});
