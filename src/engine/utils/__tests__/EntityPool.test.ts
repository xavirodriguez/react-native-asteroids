import { World } from "../../core/World";
import { EntityPool } from "../EntityPool";
import { TransformComponent, TTLComponent, ReclaimableComponent } from "../../types/EngineTypes";

describe("EntityPool", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  interface TestComponents {
    position: TransformComponent;
    ttl: TTLComponent;
    reclaimable: ReclaimableComponent;
  }

  it("should acquire an entity with components", () => {
    const pool = new EntityPool<TestComponents>(
      () => ({
        position: { type: "Transform", x: 0, y: 0 },
        ttl: { type: "TTL", remaining: 10, total: 10 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} }
      }),
      (data) => {
        data.position.x = 0;
        data.position.y = 0;
      }
    );

    const { entity, components } = pool.acquire(world);

    expect(entity).toBeDefined();
    expect(world.hasComponent(entity, "Transform")).toBe(true);
    expect(world.hasComponent(entity, "TTL")).toBe(true);
    expect(world.hasComponent(entity, "Reclaimable")).toBe(true);
    expect(components.position.x).toBe(0);
  });

  it("should reuse components after release", () => {
    let factoryCount = 0;
    const pool = new EntityPool<TestComponents>(
      () => {
        factoryCount++;
        return {
          position: { type: "Transform", x: 0, y: 0 },
          ttl: { type: "TTL", remaining: 10, total: 10 },
          reclaimable: { type: "Reclaimable", onReclaim: () => {} }
        };
      },
      (data) => {
        data.position.x = 0;
      }
    );

    // Initial factory call during EntityPool constructor to map keys to types
    // Since we call release(template) in constructor, it's now pooled.
    expect(factoryCount).toBe(1);

    const { entity: e1, components: c1 } = pool.acquire(world);
    // e1 should reuse the pooled component from constructor
    expect(factoryCount).toBe(1);

    // Release e1 (caller must NOT remove it from world before release)
    pool.release(world, e1);
    // Caller is responsible for removing it from world
    world.removeEntity(e1);

    const { entity: _e2, components: c2 } = pool.acquire(world);

    // Should NOT trigger 2nd factory call
    expect(factoryCount).toBe(1);

    // Check if components are functionally the same (they should be since they are reused)
    expect(c1.position).toBe(c2.position);
    expect(c1.ttl).toBe(c2.ttl);
    expect(c1.reclaimable).toBe(c2.reclaimable);
  });

  it("should automatically wire up Reclaimable component", () => {
    const pool = new EntityPool<TestComponents>(
      () => ({
        position: { type: "Transform", x: 0, y: 0 },
        ttl: { type: "TTL", remaining: 10, total: 10 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} }
      }),
      () => {}
    );

    const { entity, components: _components } = pool.acquire(world);
    const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");

    expect(reclaimable?.onReclaim).toBeDefined();

    // Trigger reclaim (onReclaim handles pooling, caller handles removal)
    const initialSize = pool.size;
    reclaimable?.onReclaim!(world, entity);
    expect(pool.size).toBe(initialSize + 1);
  });
});
