import { World } from "../World";
import { Entity } from "../Entity";
import { Component } from "../Component";

interface TestComponent extends Component {
  type: "Test";
  value: number;
}

describe("WorldCommandBuffer", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("should defer entity creation until flush", () => {
    let createdEntity: Entity | undefined;
    world.getCommandBuffer().createEntity((entity) => {
      createdEntity = entity;
    });

    expect(world.getAllEntities().length).toBe(0);
    expect(createdEntity).toBeUndefined();

    world.flush();

    expect(world.getAllEntities().length).toBe(1);
    expect(createdEntity).toBeDefined();
  });

  it("should defer entity removal until flush", () => {
    const entity = world.createEntity();
    world.getCommandBuffer().removeEntity(entity);

    expect(world.getAllEntities().length).toBe(1);

    world.flush();

    expect(world.getAllEntities().length).toBe(0);
  });

  it("should defer adding components until flush", () => {
    const entity = world.createEntity();
    const component: TestComponent = { type: "Test", value: 42 };

    world.getCommandBuffer().addComponent(entity, component);

    expect(world.hasComponent(entity, "Test")).toBe(false);

    world.flush();

    expect(world.hasComponent(entity, "Test")).toBe(true);
    expect(world.getComponent<TestComponent>(entity, "Test")?.value).toBe(42);
  });

  it("should protect against iterator invalidation during query iteration", () => {
    // Create 10 entities with Test component
    for (let i = 0; i < 10; i++) {
      const e = world.createEntity();
      world.addComponent(e, { type: "Test", value: i } as TestComponent);
    }

    const entities = world.query("Test");
    expect(entities.length).toBe(10);

    // Simulate a system removing entities while iterating
    // If we removed immediately, the iterator (the array returned by query)
    // would be out of sync if the query was reactive and modified in-place
    // (though our query returns a ReadonlyArray, structural changes in World
    // usually happen via World.removeEntity which notifies queries).

    let count = 0;
    for (const entity of entities) {
      world.getCommandBuffer().removeEntity(entity);
      count++;
    }

    expect(count).toBe(10);
    expect(world.getAllEntities().length).toBe(10); // Still there!

    world.flush();

    expect(world.getAllEntities().length).toBe(0); // Now gone.
  });

  it("should execute commands in order", () => {
    let entityId: Entity = 0;
    const buffer = world.getCommandBuffer();

    buffer.createEntity((id) => {
      entityId = id;
    });

    buffer.addComponent(0, { type: "Test", value: 100 } as TestComponent); // We guess ID 0 or wait for callback

    // Better way: use callback to chain
    buffer.createEntity((id) => {
        world.getCommandBuffer().addComponent(id, { type: "Test", value: 200 } as TestComponent);
    });

    world.flush();

    expect(world.getAllEntities().length).toBe(2);
    expect(entityId).toBeDefined();

    // The second entity should have the component added in the callback
    const entitiesWithTest = world.query("Test");
    expect(entitiesWithTest.length).toBe(1);
    expect(world.getComponent<TestComponent>(entitiesWithTest[0], "Test")?.value).toBe(200);
  });
});
