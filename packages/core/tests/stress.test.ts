import { World, MovementSystem, CollisionSystem2D, SystemPhase, TransformComponent, VelocityComponent, Collider2DComponent } from "../src";

/**
 * Basic Stress Test for TinyAster Core ECS.
 * Simulates a heavy world to ensure performance stability.
 */
describe("TinyAster Core Stress Test", () => {
  it("should handle 1000 entities with movement and collisions", () => {
    const world = new World();

    // Register systems
    world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });

    // Spawn 1000 entities
    for (let i = 0; i < 1000; i++) {
      const entity = world.createEntity();
      world.addComponent(entity, {
        type: "Transform",
        x: Math.random() * 800,
        y: Math.random() * 600,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      } as TransformComponent);

      world.addComponent(entity, {
        type: "Velocity",
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100
      } as VelocityComponent);

      world.addComponent(entity, {
        type: "Collider2D",
        shape: { type: "circle", radius: 5 },
        isStatic: false,
        layer: 1,
        mask: 1
      } as Collider2DComponent);
    }

    const start = Date.now();
    const frames = 60;
    const dt = 1/60;

    for (let f = 0; f < frames; f++) {
      world.update(dt);
    }

    const end = Date.now();
    const duration = end - start;
    const msPerFrame = duration / frames;

    console.log(`Stress Test: ${frames} frames with 1000 entities took ${duration}ms (${msPerFrame.toFixed(2)}ms/frame)`);

    // Loose performance budget: < 16ms per frame for 1000 entities in Jest environment
    expect(msPerFrame).toBeLessThan(16);
  });
});
