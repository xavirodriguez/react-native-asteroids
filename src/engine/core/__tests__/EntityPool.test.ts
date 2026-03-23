import { World } from "../World";
import { EntityPool } from "../EntityPool";

describe("EntityPool", () => {
  let world: World;
  let pool: EntityPool;

  beforeEach(() => {
    world = new World();
    pool = new EntityPool(world);
  });

  it("should create a new entity if the pool is empty", () => {
    const entity = pool.acquire();
    expect(entity).toBe(1);
    expect(pool.size).toBe(0);
  });

  it("should reuse a released entity", () => {
    const entity1 = pool.acquire();
    pool.release(entity1);
    expect(pool.size).toBe(1);

    const entity2 = pool.acquire();
    expect(entity2).toBe(entity1);
    expect(pool.size).toBe(0);
  });

  it("should strip components from a released entity", () => {
    const entity = pool.acquire();
    world.addComponent(entity, { type: "Position", x: 10, y: 20 });

    expect(world.hasComponent(entity, "Position")).toBe(true);

    pool.release(entity);

    expect(world.hasComponent(entity, "Position")).toBe(false);
  });

  it("should manage multiple released entities in LIFO order", () => {
    const e1 = pool.acquire();
    const e2 = pool.acquire();

    pool.release(e1);
    pool.release(e2);

    expect(pool.size).toBe(2);
    expect(pool.acquire()).toBe(e2);
    expect(pool.acquire()).toBe(e1);
  });

  it("should clear the pool", () => {
    pool.acquire();
    pool.release(1);
    expect(pool.size).toBe(1);

    pool.clear();
    expect(pool.size).toBe(0);
  });
});
