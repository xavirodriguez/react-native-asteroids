import { World } from "../World";
import { GenericComponent } from "../Component";

describe("GenericComponent", () => {
  it("should allow accessing data with casting", () => {
    const world = new World();
    const entity = world.createEntity();
    const gameState: GenericComponent = {
      type: "GameState",
      score: 100,
      metadata: { player: "test" }
    };
    world.addComponent(entity, gameState);

    const retrieved = world.getComponent<GenericComponent>(entity, "GameState");
    expect(retrieved).toBeDefined();
    if (retrieved) {
      expect((retrieved as Record<string, unknown>).score).toBe(100);
    }
  });
});
