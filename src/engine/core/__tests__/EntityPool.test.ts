import { EntityPool } from "../EntityPool";

describe("EntityPool", () => {
  it("should acquire new entity IDs when pool is empty", () => {
    const pool = new EntityPool();
    expect(pool.acquire()).toBe(1);
    expect(pool.acquire()).toBe(2);
  });

  it("should reuse released entity IDs", () => {
    const pool = new EntityPool();
    const id1 = pool.acquire(); // 1
    const id2 = pool.acquire(); // 2

    pool.release(id1);
    expect(pool.acquire()).toBe(id1);

    pool.release(id2);
    expect(pool.acquire()).toBe(id2);
  });

  it("should maintain zero allocations by reusing released IDs", () => {
    const pool = new EntityPool();
    const ids = Array.from({ length: 10 }, () => pool.acquire());
    ids.forEach(id => pool.release(id));

    const newIds = Array.from({ length: 10 }, () => pool.acquire());
    expect(newIds.sort((a, b) => a - b)).toEqual(ids.sort((a, b) => a - b));
  });
});
