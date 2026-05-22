import { World } from "../../core/World";
import { CommandMapperSystem } from "../systems/CommandMapperSystem";
import { CommandInvokerSystem } from "../systems/CommandInvokerSystem";
import { createCommandQueueComponent } from "../types";
import { InputStateComponent, TransformComponent, VelocityComponent } from "../../core/CoreComponents";

describe("Command System Integration", () => {
  let world: World;
  let mapper: CommandMapperSystem;
  let invoker: CommandInvokerSystem;

  beforeEach(() => {
    world = new World();
    mapper = new CommandMapperSystem();
    invoker = new CommandInvokerSystem();

    // Setup input state singleton
    const inputEntity = world.createEntity();
    world.addComponent(inputEntity, {
      type: "InputState",
      actions: new Map(),
      axes: new Map()
    } as InputStateComponent);
  });

  it("should map input actions to commands and execute them", () => {
    const player = world.createEntity();
    world.addComponent(player, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(player, { type: "Velocity", dx: 0, dy: 0 } as VelocityComponent);
    world.addComponent(player, createCommandQueueComponent());

    // Simulate input
    world.mutateSingleton<InputStateComponent>("InputState", (input) => {
      input.actions.set("FORWARD", true);
      input.actions.set("LEFT", true);
    });

    // Run Mapper
    mapper.update(world, 16);

    const queue = world.getComponent(player, "CommandQueue")!;
    expect(queue.pending.length).toBe(2);
    expect(queue.pending.some(c => c.type === 'THRUST')).toBe(true);
    expect(queue.pending.some(c => c.type === 'ROTATE_LEFT')).toBe(true);
    expect(queue.history[world.tick].length).toBe(2);

    // Run Invoker
    invoker.update(world, 16);

    const transform = world.getComponent<TransformComponent>(player, "Transform")!;
    const velocity = world.getComponent<VelocityComponent>(player, "Velocity")!;

    expect(transform.rotation).toBeLessThan(0); // Rotated left
    expect(velocity.dx).toBeGreaterThan(0);     // Thrust forward (at 0 rad is +X)

    // Pending should be cleared after invoker
    expect(world.getComponent(player, "CommandQueue")!.pending.length).toBe(0);
  });

  it("should handle Hyperspace command", () => {
    const player = world.createEntity();
    world.addComponent(player, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(player, createCommandQueueComponent());

    world.mutateSingleton<InputStateComponent>("InputState", (input) => {
      input.actions.set("HYPERSPACE", true);
    });

    mapper.update(world, 16);
    invoker.update(world, 16);

    const transform = world.getComponent<TransformComponent>(player, "Transform")!;
    expect(transform.x).not.toBe(0);
    expect(transform.y).not.toBe(0);
    expect(transform.dirty).toBe(true);
  });
});
