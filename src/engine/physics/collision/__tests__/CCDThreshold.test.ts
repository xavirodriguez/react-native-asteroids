import { World } from "../../../core/World";
import { CollisionSystem2D } from "../CollisionSystem2D";
import { TransformComponent, Collider2DComponent, ContinuousColliderComponent, VelocityComponent, CollisionEventsComponent } from "../../../types/EngineTypes";

describe("CollisionSystem2D CCD Threshold", () => {
  it("should skip CCD if relative velocity is below threshold", () => {
    const world = new World();
    const system = new CollisionSystem2D();

    const entityA = world.createEntity();
    world.addComponent(entityA, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(entityA, { type: "Collider2D", shape: { type: "circle", radius: 10 }, offsetX: 0, offsetY: 0, layer: 1, mask: 1, isTrigger: false, enabled: true } as Collider2DComponent);
    world.addComponent(entityA, { type: "ContinuousCollider", enabled: true, velocityThreshold: 100 } as ContinuousColliderComponent);
    world.addComponent(entityA, { type: "Velocity", dx: 50, dy: 0 } as VelocityComponent);

    const entityB = world.createEntity();
    world.addComponent(entityB, { type: "Transform", x: 25, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(entityB, { type: "Collider2D", shape: { type: "circle", radius: 10 }, offsetX: 0, offsetY: 0, layer: 1, mask: 1, isTrigger: false, enabled: true } as Collider2DComponent);

    // Initial position
    const transA = world.getComponent<TransformComponent>(entityA, "Transform")!;
    const initialX = transA.x;

    // Update system with small velocity (50 < 100)
    system.update(world, 1000);

    // Speed 50 < Threshold 100 -> CCD skipped.
    expect(transA.x).toBe(initialX);
  });

  it("should trigger CCD if relative velocity is above threshold", () => {
    const world = new World();
    const system = new CollisionSystem2D();
    system.useSpatialHash(100); // Force candidates

    const entityA = world.createEntity();
    world.addComponent(entityA, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(entityA, { type: "Collider2D", shape: { type: "circle", radius: 10 }, offsetX: 0, offsetY: 0, layer: 1, mask: 1, isTrigger: false, enabled: true } as Collider2DComponent);
    world.addComponent(entityA, { type: "ContinuousCollider", enabled: true, velocityThreshold: 10 } as ContinuousColliderComponent);
    world.addComponent(entityA, { type: "Velocity", dx: 1000, dy: 0 } as VelocityComponent);
    world.addComponent(entityA, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as CollisionEventsComponent);

    const entityB = world.createEntity();
    world.addComponent(entityB, { type: "Transform", x: 25, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(entityB, { type: "Collider2D", shape: { type: "circle", radius: 10 }, offsetX: 0, offsetY: 0, layer: 1, mask: 1, isTrigger: false, enabled: true } as Collider2DComponent);
    world.addComponent(entityB, { type: "Velocity", dx: 0, dy: 0 } as VelocityComponent);
    world.addComponent(entityB, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as CollisionEventsComponent);

    const transA = world.getComponent<TransformComponent>(entityA, "Transform")!;

    system.update(world, 1000);

    // CCD should move A to TOI (between 0 and 1000)
    expect(transA.x).toBeGreaterThan(0);
    expect(transA.x).toBeLessThan(1000);
  });
});
