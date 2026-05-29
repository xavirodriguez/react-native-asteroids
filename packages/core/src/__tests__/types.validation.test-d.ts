import { World, EventBus, Component, Entity, WorldCommandBuffer, BlueprintDefinition } from "../index";

interface AsteroidComponent extends Component {
  type: "Asteroid";
  size: "large" | "medium" | "small";
}

type AsteroidsRegistry = {
  Asteroid: AsteroidComponent;
};

type AsteroidsEvents = {
  "ship:damaged": { shipEntity: Entity; damageAmount: number };
};

type AsteroidsBlueprints = {
  asteroid: BlueprintDefinition<AsteroidsRegistry, { x: number; y: number; size: "large" | "medium" | "small" }>;
};

describe("Type Validations", () => {
  it("should compile correctly with valid types", () => {
    const world = new World<AsteroidsRegistry, AsteroidsEvents, AsteroidsBlueprints>();
    const entity: Entity = 1;

    // @ts-expect-error unknown component
    world.getComponent(entity, "Unknown");

    // @ts-expect-error invalid Asteroid payload
    world.addComponent(entity, { type: "Asteroid", invalid: true });

    const eventBus = new EventBus<AsteroidsEvents>();
    // @ts-expect-error wrong event payload
    eventBus.emit("ship:damaged", { fuego: true });

    const commandBuffer = new WorldCommandBuffer<AsteroidsRegistry, AsteroidsBlueprints>();
    // @ts-expect-error wrong blueprint args
    commandBuffer.spawnFromBlueprint("asteroid", { x: 1, y: 2, color: "red" });
  });
});
