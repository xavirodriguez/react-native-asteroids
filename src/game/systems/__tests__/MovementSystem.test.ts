import { World } from "../../ecs-world";
import { MovementSystem } from "../MovementSystem";
import { GAME_CONFIG } from "../../../types/GameTypes";

describe("MovementSystem", () => {
  let world: World;
  let movementSystem: MovementSystem;

  beforeEach(() => {
    world = new World();
    movementSystem = new MovementSystem();
    world.addSystem(movementSystem);
  });

  test("should update position based on velocity", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: 100, y: 100 });
    world.addComponent(entity, { type: "Velocity", dx: 100, dy: -50 });

    // deltaTime = 1000ms (1 second)
    world.update(1000);

    const pos = world.getComponent(entity, "Position") as any;
    expect(pos.x).toBe(200);
    expect(pos.y).toBe(50);
  });

  test("should wrap around the screen (right edge)", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: GAME_CONFIG.SCREEN_WIDTH - 10, y: 100 });
    world.addComponent(entity, { type: "Velocity", dx: 100, dy: 0 });

    world.update(1000); // moves 100 units

    const pos = world.getComponent(entity, "Position") as any;
    expect(pos.x).toBe(0); // Wrapped from right to left
  });

  test("should wrap around the screen (left edge)", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: 10, y: 100 });
    world.addComponent(entity, { type: "Velocity", dx: -100, dy: 0 });

    world.update(1000); // moves -100 units

    const pos = world.getComponent(entity, "Position") as any;
    expect(pos.x).toBe(GAME_CONFIG.SCREEN_WIDTH); // Wrapped from left to right
  });
});
