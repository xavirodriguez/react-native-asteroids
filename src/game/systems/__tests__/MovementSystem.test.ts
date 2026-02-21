import { World } from "../../ecs-world";
import { MovementSystem } from "../MovementSystem";
import { GAME_CONFIG } from "../../../types/GameTypes";

describe("MovementSystem", () => {
  let world: World;
  let system: MovementSystem;

  beforeEach(() => {
    world = new World();
    system = new MovementSystem();
    world.addSystem(system);
  });

  it("should update position based on velocity", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: 100, y: 100 });
    world.addComponent(entity, { type: "Velocity", dx: 100, dy: -50 });

    // deltaTime is in ms. 1000ms = 1s
    world.update(1000);

    const pos = world.getComponent(entity, "Position") as any;
    expect(pos.x).toBe(200);
    expect(pos.y).toBe(50);
  });

  it("should wrap around the screen", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: GAME_CONFIG.SCREEN_WIDTH - 10, y: 10 });
    world.addComponent(entity, { type: "Velocity", dx: 20, dy: 0 });

    world.update(1000);

    const pos = world.getComponent(entity, "Position") as any;
    expect(pos.x).toBe(0); // Current implementation sets to 0 when exceeding SCREEN_WIDTH
  });
});
