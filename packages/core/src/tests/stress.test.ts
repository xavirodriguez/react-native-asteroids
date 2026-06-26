import { World, MovementSystem, CoreComponentRegistry } from "../index";

/**
 * Stress Test for ECS Performance.
 *
 * Validates that the ECS engine can handle a high number of entities
 * within a reasonable time frame.
 */

describe("ECS Stress Test", () => {
  it("should handle 1000 entities with movement simulation efficiently", () => {
    const world = new World<CoreComponentRegistry>();
    world.addSystem(new MovementSystem());

    const entityCount = 1000;
    const ticks = 100;
    const deltaTime = 1 / 60;

    // 1. Initialize 1000 entities
    for (let i = 0; i < entityCount; i++) {
      const entity = world.createEntity();
      world.addComponent(entity, {
        type: "Transform",
        x: Math.random() * 800,
        y: Math.random() * 600,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 0,
        worldY: 0,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      });
      world.addComponent(entity, {
        type: "Velocity",
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100,
        angularVelocity: (Math.random() - 0.5) * 2
      });
    }

    // 2. Measure execution time for 100 ticks
    const start = performance.now();
    for (let t = 0; t < ticks; t++) {
      world.update(deltaTime);
    }
    const end = performance.now();
    const totalTime = end - start;
    const averageTimePerTick = totalTime / ticks;

    console.log(`Stress Test Results (${entityCount} entities, ${ticks} ticks):`);
    console.log(`- Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`- Average Time per Tick: ${averageTimePerTick.toFixed(4)}ms`);

    // 3. Assertions
    // A single tick (Movement only) for 1000 entities should definitely be under 1ms on modern hardware
    expect(averageTimePerTick).toBeLessThan(1);

    // Validate some state
    const entities = world.query("Transform");
    expect(entities.length).toBe(entityCount);
  });
});
