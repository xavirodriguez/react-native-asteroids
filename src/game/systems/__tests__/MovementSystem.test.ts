import { World } from "../../ecs-world";
import { MovementSystem } from "../MovementSystem";
import { GAME_CONFIG, type PositionComponent } from "../../../types/GameTypes";

describe("MovementSystem", () => {
  let world: World;
  let system: MovementSystem;

  beforeEach(() => {
    world = new World();
    system = new MovementSystem();
    world.addSystem(system);
  });

  test("should update entity position based on velocity", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: 100, y: 100 });
    world.addComponent(entity, { type: "Velocity", dx: 50, dy: -50 });

    // Update for 1 second (1000ms)
    world.update(1000);

    const pos = world.getComponent<PositionComponent>(entity, "Position");
    expect(pos?.x).toBe(150);
    expect(pos?.y).toBe(50);
  });

  test("should wrap around screen (right to left)", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: GAME_CONFIG.SCREEN_WIDTH - 10, y: 100 });
    world.addComponent(entity, { type: "Velocity", dx: 20, dy: 0 });

    world.update(1000); // Should move to SCREEN_WIDTH + 10, then wrap to 10? No, logic is "if x > WIDTH, x = 0"

    const pos = world.getComponent<PositionComponent>(entity, "Position");
    // Actually the logic in MovementSystem.ts is:
    // pos.x += (vel.dx * deltaTime) / 1000
    // if (pos.x > GAME_CONFIG.SCREEN_WIDTH) pos.x = 0
    expect(pos.x).toBe(0);
  });

  test("should wrap around screen (left to right)", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: 10, y: 100 });
    world.addComponent(entity, { type: "Velocity", dx: -20, dy: 0 });

    world.update(1000); // Moves to -10, then wraps to SCREEN_WIDTH

    const pos = world.getComponent<PositionComponent>(entity, "Position");
    expect(pos?.x).toBe(GAME_CONFIG.SCREEN_WIDTH);
  });
});
