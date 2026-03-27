import { World } from "../../core/World";
import { EntityPool } from "../EntityPool";
import { PositionComponent, TTLComponent, ReclaimableComponent } from "../../types/EngineTypes";

describe("EntityPool", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  interface TestComponents {
    position: PositionComponent;
    ttl: TTLComponent;
    reclaimable: ReclaimableComponent;
  }

  it("should acquire an entity with components", () => {
    const pool = new EntityPool<TestComponents>(
      () => ({
        position: { type: "Position", x: 0, y: 0 },
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
    expect(world.hasComponent(entity, "Position")).toBe(true);
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
          position: { type: "Position", x: 0, y: 0 },
          ttl: { type: "TTL", remaining: 10, total: 10 },
          reclaimable: { type: "Reclaimable", onReclaim: () => {} }
        };
      },
      (data) => {
        data.position.x = 0;
      }
    );

    // Initial factory call during EntityPool constructor to map keys to types
    expect(factoryCount).toBe(1);

    const { entity: e1, components: c1 } = pool.acquire(world);
    // e1 should trigger a 2nd factory call because the 1st one wasn't pooled
    expect(factoryCount).toBe(2);

    pool.release(world, e1);

    const { entity: e2, components: c2 } = pool.acquire(world);

    // Should NOT trigger 3rd factory call
    expect(factoryCount).toBe(2);

    // Check if components are functionally the same (they should be since they are reused)
    expect(c1.position).toBe(c2.position);
    expect(c1.ttl).toBe(c2.ttl);
    expect(c1.reclaimable).toBe(c2.reclaimable);

    // In this simple test case, the same entity ID (1) might be reused if world.removeEntity(e1) was called
    // because World uses a freeEntities pool.
  });

  it("should automatically wire up Reclaimable component", () => {
    const pool = new EntityPool<TestComponents>(
      () => ({
        position: { type: "Position", x: 0, y: 0 },
        ttl: { type: "TTL", remaining: 10, total: 10 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} }
      }),
      () => {}
    );

    const { entity, components } = pool.acquire(world);
    const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");

    expect(reclaimable?.onReclaim).toBeDefined();

    // Trigger reclaim
    const initialSize = pool.size;
    reclaimable?.onReclaim!(world, entity);
    expect(pool.size).toBe(initialSize + 1);
  });
});
