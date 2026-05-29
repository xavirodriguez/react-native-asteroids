import { World } from "../World";
import { Component } from "../Component";

interface TestComponent extends Component {
  type: "Test";
  value: number;
}

type TestRegistry = {
  Test: TestComponent;
};

describe("World", () => {
  it("should add and get components", () => {
    const world = new World<TestRegistry>();
    const entity = world.createEntity();
    const component: TestComponent = { type: "Test", value: 42 };

    world.addComponent(entity, component);
    const retrieved = world.getComponent(entity, "Test");

    expect(retrieved).toBeDefined();
    expect(retrieved?.value).toBe(42);
  });

  it("should query entities by component", () => {
    const world = new World<TestRegistry>();
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    world.addComponent(entity1, { type: "Test", value: 1 });

    const results = world.query("Test");
    expect(results).toContain(entity1);
    expect(results).not.toContain(entity2);
  });
});
