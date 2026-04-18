import { EntityPool } from "../EntityPool";

describe("EntityPool Double-Release", () => {
  let pool: EntityPool;

  beforeEach(() => {
    pool = new EntityPool();
  });

  it("should acquire unique IDs", () => {
    const id1 = pool.acquire();
    const id2 = pool.acquire();
    expect(id1).not.toBe(id2);
  });

  it("should reuse released IDs", () => {
    const id1 = pool.acquire();
    pool.release(id1);
    const id2 = pool.acquire();
    expect(id1).toBe(id2);
  });

  it("should prevent double-release", () => {
    const id1 = pool.acquire();
    const spy = jest.spyOn(console, 'warn').mockImplementation();

    pool.release(id1);

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
        expect(() => pool.release(id1)).toThrow();
    } else {
        pool.release(id1);
        expect(spy).toHaveBeenCalledWith(expect.stringContaining("Double-release detected"));
    }

    const id2 = pool.acquire();
    const id3 = pool.acquire();

    expect(id2).toBe(id1);
    expect(id3).not.toBe(id1); // If double-release worked, id3 might have been id1 too

    spy.mockRestore();
  });
});
