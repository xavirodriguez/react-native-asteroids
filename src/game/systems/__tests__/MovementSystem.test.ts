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

  test("should update position based on velocity", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: 100, y: 100 });
    world.addComponent(entity, { type: "Velocity", dx: 100, dy: 50 });

    world.update(1000); // 1 second

    const pos = world.getComponent(entity, "Position") as any;
    expect(pos.x).toBe(200);
    expect(pos.y).toBe(150);
  });

  test("should wrap around the screen", () => {
    const entity = world.createEntity();
    // Wrap right
    world.addComponent(entity, { type: "Position", x: GAME_CONFIG.SCREEN_WIDTH - 10, y: 100 });
    world.addComponent(entity, { type: "Velocity", dx: 20, dy: 0 });

    world.update(1000);

    const pos = world.getComponent(entity, "Position") as any;
    expect(pos.x).toBe(0);

    // Wrap left
    pos.x = 10;
    const vel = world.getComponent(entity, "Velocity") as any;
    vel.dx = -20;

    world.update(1000);
    expect(pos.x).toBe(GAME_CONFIG.SCREEN_WIDTH);
  });
});
