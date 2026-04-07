import { World } from "../../core/World";
import { MovementSystem } from "../MovementSystem";
import { BoundarySystem } from "../BoundarySystem";
import { TransformComponent, VelocityComponent, BoundaryComponent } from "../../types/EngineTypes";

describe("Movement & Boundary Systems", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("should update entity position based on velocity", () => {
    const movementSystem = new MovementSystem();
    const entity = world.createEntity();
    const pos: TransformComponent = { type: "Transform", x: 100, y: 100 };
    const vel: VelocityComponent = { type: "Velocity", dx: 100, dy: 50 };

    world.addComponent(entity, pos);
    world.addComponent(entity, vel);

    // Update with 1 second (1000ms)
    movementSystem.update(world, 1000);

    expect(pos.x).toBe(200);
    expect(pos.y).toBe(150);
  });

  it("should wrap entity position when it goes out of bounds in wrap mode", () => {
    const screenWidth = 800;
    const screenHeight = 600;
    const boundarySystem = new BoundarySystem();
    const entity = world.createEntity();

    // Out of bounds to the right
    const pos: TransformComponent = { type: "Transform", x: 810, y: 100 };
    const boundary: BoundaryComponent = { type: "Boundary", width: screenWidth, height: screenHeight, mode: "wrap" };

    world.addComponent(entity, pos);
    world.addComponent(entity, boundary);

    boundarySystem.update(world, 16);
    expect(pos.x).toBe(0);

    // Out of bounds to the left
    pos.x = -10;
    boundarySystem.update(world, 16);
    expect(pos.x).toBe(screenWidth);

    // Out of bounds to the bottom
    pos.y = 610;
    boundarySystem.update(world, 16);
    expect(pos.y).toBe(0);

    // Out of bounds to the top
    pos.y = -10;
    boundarySystem.update(world, 16);
    expect(pos.y).toBe(screenHeight);
  });
});
