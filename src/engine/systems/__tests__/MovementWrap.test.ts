import { World } from "../../core/World";
import { MovementSystem } from "../MovementSystem";
import { WrapSystem } from "../WrapSystem";
import { PositionComponent, VelocityComponent } from "../../types/EngineTypes";

describe("Movement & Wrap Systems", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("should update entity position based on velocity", () => {
    const movementSystem = new MovementSystem();
    const entity = world.createEntity();
    const pos: PositionComponent = { type: "Position", x: 100, y: 100 };
    const vel: VelocityComponent = { type: "Velocity", dx: 100, dy: 50 };

    world.addComponent(entity, pos);
    world.addComponent(entity, vel);

    // Update with 1 second (1000ms)
    movementSystem.update(world, 1000);

    expect(pos.x).toBe(200);
    expect(pos.y).toBe(150);
  });

  it("should wrap entity position when it goes out of bounds", () => {
    const screenWidth = 800;
    const screenHeight = 600;
    const wrapSystem = new WrapSystem(screenWidth, screenHeight);
    const entity = world.createEntity();

    // Out of bounds to the right
    const pos: PositionComponent = { type: "Position", x: 810, y: 100 };

    world.addComponent(entity, pos);

    wrapSystem.update(world, 16);
    expect(pos.x).toBe(0);

    // Out of bounds to the left
    pos.x = -10;
    wrapSystem.update(world, 16);
    expect(pos.x).toBe(screenWidth);

    // Out of bounds to the bottom
    pos.y = 610;
    wrapSystem.update(world, 16);
    expect(pos.y).toBe(0);

    // Out of bounds to the top
    pos.y = -10;
    wrapSystem.update(world, 16);
    expect(pos.y).toBe(screenHeight);
  });
});
