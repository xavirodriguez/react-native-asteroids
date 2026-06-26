import { World, System, Component, ComponentRegistry } from "../index";

/**
 * Smoke Test for ECS Type Inference.
 *
 * This test ensures that the World can be initialized with custom components
 * and systems without requiring excessive generic verbosity or using 'any'.
 */

// 1. Define custom components
interface PositionComponent extends Component {
  type: "Position";
  x: number;
  y: number;
}

interface VelocityComponent extends Component {
  type: "Velocity";
  vx: number;
  vy: number;
}

// 2. Define the Component Registry
interface MyComponentRegistry extends ComponentRegistry {
  Position: PositionComponent;
  Velocity: VelocityComponent;
}

// 3. Define a custom system
class MovementSystem extends System<MyComponentRegistry> {
  update(world: World<MyComponentRegistry>, deltaTime: number): void {
    const entities = world.query("Position", "Velocity");

    for (const entity of entities) {
      const pos = world.getMutableComponent(entity, "Position")!;
      const vel = world.getComponent(entity, "Velocity")!;

      pos.x += vel.vx * deltaTime;
      pos.y += vel.vy * deltaTime;
    }
  }
}

describe("ECS Smoke Test", () => {
  it("should initialize a world with custom components and systems with correct type inference", () => {
    // 4. Initialize the World
    // The world should infer the registry type from the components and systems
    const world = new World<MyComponentRegistry>();

    // 5. Register the system
    world.addSystem(new MovementSystem());

    // 6. Create an entity with components
    const player = world.createEntity();

    // NO TYPE ASSERTIONS ('as') should be needed here.
    // TypeScript should infer K from the 'type' property and validate the rest of the object.
    world.addComponent(player, { type: "Position", x: 10, y: 10 });
    world.addComponent(player, { type: "Velocity", vx: 5, vy: 0 });

    // 7. Run an update
    world.update(1); // 1 second elapsed

    // 8. Assert state change
    const pos = world.getComponent(player, "Position");
    expect(pos).toBeDefined();
    expect(pos?.x).toBe(15);
    expect(pos?.y).toBe(10);
  });

  it("should support query-based entity filtering", () => {
    const world = new World<MyComponentRegistry>();

    const e1 = world.createEntity();
    world.addComponent(e1, { type: "Position", x: 0, y: 0 });
    world.addComponent(e1, { type: "Velocity", vx: 1, vy: 1 });

    const e2 = world.createEntity();
    world.addComponent(e2, { type: "Position", x: 5, y: 5 });

    const movingEntities = world.query("Position", "Velocity");
    expect(movingEntities).toHaveLength(1);
    expect(movingEntities[0]).toBe(e1);

    const allPositioned = world.query("Position");
    expect(allPositioned).toHaveLength(2);
  });
});
