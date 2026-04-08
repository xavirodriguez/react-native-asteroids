import { World } from "../../core/World";
import { MovementSystem } from "../MovementSystem";
import { BoundarySystem } from "../BoundarySystem";
import { TransformComponent, VelocityComponent, BoundaryComponent } from "../../types/EngineTypes";

describe("Movement and Boundary Systems", () => {
  let world: World;
  let movementSystem: MovementSystem;
  let boundarySystem: BoundarySystem;

  beforeEach(() => {
    world = new World();
    movementSystem = new MovementSystem();
    boundarySystem = new BoundarySystem();
  });

  it("should wrap entities around screen boundaries", () => {
    const entity = world.createEntity();
    const pos: TransformComponent = { type: "Transform", x: 810, y: 100, rotation: 0, scaleX: 1, scaleY: 1 };
    const boundary: BoundaryComponent = { type: "Boundary", x: 0, y: 0, width: 800, height: 600, behavior: "wrap" };

    world.addComponent(entity, pos);
    world.addComponent(entity, boundary);

    boundarySystem.update(world, 16.66);

    expect(pos.x).toBeLessThan(800);
    expect(pos.x).toBeGreaterThanOrEqual(0);
  });

  it("should update position based on velocity", () => {
    const entity = world.createEntity();
    const pos: TransformComponent = { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 };
    const vel: VelocityComponent = { type: "Velocity", dx: 100, dy: 0 };

    world.addComponent(entity, pos);
    world.addComponent(entity, vel);

    movementSystem.update(world, 1000); // 1 second

    expect(pos.x).toBe(200);
  });
});
