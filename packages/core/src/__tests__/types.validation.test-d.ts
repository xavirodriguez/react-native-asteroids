import { World, EventBus, Component, Entity, WorldCommandBuffer, BlueprintDefinition } from "../index";

interface MockEntityComponent extends Component {
  type: "MockEntity";
  size: "large" | "medium" | "small";
}

type MockEntitysRegistry = {
  MockEntity: MockEntityComponent;
};

type MockEntitysEvents = {
  "mock:damaged": { shipEntity: Entity; damageAmount: number };
};

type MockEntitysBlueprints = {
  mock: BlueprintDefinition<MockEntitysRegistry, { x: number; y: number; size: "large" | "medium" | "small" }>;
};

describe("Type Validations", () => {
  it("should compile correctly with valid types", () => {
    const world = new World<MockEntitysRegistry, MockEntitysEvents, MockEntitysBlueprints>();
    const entity: Entity = 1;

    // @ts-expect-error unknown component
    world.getComponent(entity, "Unknown");

    // @ts-expect-error invalid MockEntity payload
    world.addComponent(entity, { type: "MockEntity", invalid: true });

    const eventBus = new EventBus<MockEntitysEvents>();
    // @ts-expect-error wrong event payload
    eventBus.emit("mock:damaged", { fuego: true });

    const commandBuffer = new WorldCommandBuffer<MockEntitysRegistry, MockEntitysBlueprints>();
    // @ts-expect-error wrong blueprint args
    commandBuffer.spawnFromBlueprint("mock", { x: 1, y: 2, color: "red" });
  });
});
