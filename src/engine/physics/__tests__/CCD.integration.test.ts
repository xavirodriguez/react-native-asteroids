import { World } from "../../core/World";
import { CollisionSystem2D } from "../collision/CollisionSystem2D";
import { ShapeFactory } from "../shapes/ShapeFactory";
import { TransformComponent, Collider2DComponent, VelocityComponent, ContinuousColliderComponent, CollisionEventsComponent } from "../../types/EngineTypes";

describe("CCD Integration", () => {
  let world: World;
  let collisionSystem: CollisionSystem2D;

  beforeEach(() => {
    world = new World();
    collisionSystem = new CollisionSystem2D();
  });

  function createEntity(world: World, x: number, y: number, shape: any) {
    const e = world.createEntity();
    world.addComponent(e, { type: "Transform", x, y, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
    world.addComponent(e, { type: "Collider2D", shape, offsetX: 0, offsetY: 0, isTrigger: false, layer: 1, mask: 1, enabled: true } as Collider2DComponent);
    world.addComponent(e, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as CollisionEventsComponent);
    return e;
  }

  it("should detect CCD collision between overlapping candidates and move to TOI", () => {
    const wall = createEntity(world, 100, 0, ShapeFactory.aabb(10, 200));
    const bullet = createEntity(world, 94, 0, ShapeFactory.circle(2));
    world.addComponent(bullet, { type: "ContinuousCollider", enabled: true, velocityThreshold: 0 } as ContinuousColliderComponent);
    world.addComponent(bullet, { type: "Velocity", dx: 1000, dy: 0 } as VelocityComponent);

    collisionSystem.update(world, 16);

    const pos = world.getComponent<TransformComponent>(bullet, "Transform")!;
    expect(pos.x).toBe(94);
  });
});
