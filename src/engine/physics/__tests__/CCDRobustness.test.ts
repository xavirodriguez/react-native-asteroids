import { World } from "../../core/World";
import { CCDSystem } from "../collision/CCDSystem";
import { ShapeFactory } from "../shapes/ShapeFactory";
import {
  TransformComponent,
  Collider2DComponent,
  VelocityComponent,
  ContinuousColliderComponent,
  CollisionEventsComponent
} from "../../types/EngineTypes";

describe("CCD Robustness Tests", () => {
  let world: World;
  let ccdSystem: CCDSystem;

  beforeEach(() => {
    world = new World();
    ccdSystem = new CCDSystem();
  });

  function createEntity(world: World, x: number, y: number, shape: any) {
    const e = world.createEntity();
    world.addComponent(e, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(e, { type: "Collider2D", shape, offsetX: 0, offsetY: 0, isTrigger: false, layer: 1, mask: 1, enabled: true } as Collider2DComponent);
    world.addComponent(e, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as CollisionEventsComponent);
    return e;
  }

  test("Fast projectile tunnels through without CCD but hits with CCD (Raycast)", () => {
    // Wall at x=100, width=20 (from 90 to 110)
    createEntity(world, 100, 0, ShapeFactory.aabb(10, 50));

    // Bullet starting at x=50, moving at 5000 px/s
    // In 16ms (dt=0.016s), it moves 5000 * 0.016 = 80px.
    // End position would be 50 + 80 = 130. It clearly skips the wall (90-110).
    const bullet = createEntity(world, 50, 0, ShapeFactory.circle(2));
    world.addComponent(bullet, { type: "Velocity", dx: 5000, dy: 0 } as VelocityComponent);
    world.addComponent(bullet, {
      type: "ContinuousCollider",
      enabled: true,
      mode: "raycast",
      velocityThreshold: 0
    } as ContinuousColliderComponent);

    ccdSystem.update(world, 16);

    const pos = world.getComponent<TransformComponent>(bullet, "Transform")!;
    const events = world.getComponent<CollisionEventsComponent>(bullet, "CollisionEvents")!;

    // Should have hit the wall at approx x=90 (wall start) - radius(2) - margin(0.1) = 87.9
    // Due to how raycast vs AABB works, it might be exactly 88 if we started at 50 and it's a circle.
    expect(pos.x).toBeLessThan(100);
    expect(pos.x).toBeGreaterThan(80);
    expect(events.collisions.length).toBe(1);
  });

  test("Swept Circle vs Circle collision", () => {
    // Static target at x=100
    const _target = createEntity(world, 100, 0, ShapeFactory.circle(10));

    // Moving circle starting at x=50, moving towards target
    const bullet = createEntity(world, 50, 0, ShapeFactory.circle(5));
    world.addComponent(bullet, { type: "Velocity", dx: 4000, dy: 0 } as VelocityComponent);
    world.addComponent(bullet, {
      type: "ContinuousCollider",
      enabled: true,
      mode: "swept",
      velocityThreshold: 0
    } as ContinuousColliderComponent);

    ccdSystem.update(world, 16);

    const pos = world.getComponent<TransformComponent>(bullet, "Transform")!;
    // Impact should be at x = 100 - (10 + 5) = 85
    expect(pos.x).toBeLessThan(86);
    expect(pos.x).toBeGreaterThan(84);
  });

  test("CCD respects layer masks", () => {
    // Wall on layer 2
    const wall = createEntity(world, 100, 0, ShapeFactory.aabb(10, 50));
    world.mutateComponent<Collider2DComponent>(wall, "Collider2D", c => {
        c.layer = 2;
    });

    // Bullet only looking for layer 1
    const bullet = createEntity(world, 50, 0, ShapeFactory.circle(2));
    world.addComponent(bullet, { type: "Velocity", dx: 5000, dy: 0 } as VelocityComponent);
    world.addComponent(bullet, {
      type: "ContinuousCollider",
      enabled: true,
      mode: "raycast",
      velocityThreshold: 0
    } as ContinuousColliderComponent);

    ccdSystem.update(world, 16);

    const events = world.getComponent<CollisionEventsComponent>(bullet, "CollisionEvents")!;
    expect(events.collisions.length).toBe(0);
  });

  test("Adaptive sub-stepping prevents tunneling", () => {
    createEntity(world, 100, 0, ShapeFactory.aabb(10, 50));

    const entity = createEntity(world, 50, 0, ShapeFactory.circle(5));
    world.addComponent(entity, { type: "Velocity", dx: 4000, dy: 0 } as VelocityComponent);
    world.addComponent(entity, {
      type: "ContinuousCollider",
      enabled: true,
      mode: "substep",
      maxSubSteps: 10,
      velocityThreshold: 0
    } as ContinuousColliderComponent);

    ccdSystem.update(world, 16);

    const events = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents")!;
    expect(events.collisions.length).toBeGreaterThan(0);
  });
});
